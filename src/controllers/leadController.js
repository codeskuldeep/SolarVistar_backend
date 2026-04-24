import prisma from "../config/db.js";
import catchAsyncError from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

// @desc    Create a new Lead
// @route   POST /api/leads
// @access  Private (Admin or Staff)
export const createLead = catchAsyncError(async (req, res, next) => {
  const {
    customerName,
    phoneNumber,
    email,
    address,
    requirements,
    notes,
    assignedToId,
  } = req.body;

  // 1. Basic Validation
  if (!customerName || !phoneNumber) {
    return next(
      new ErrorHandler("Customer Name and Phone Number are required", 400),
    );
  }

  // If assigning, ensure the assignee is from Sales
  if (assignedToId) {
    const user = await prisma.user.findUnique({
      where: { id: assignedToId },
      include: { department: true },
    });
    if (user?.department?.name !== "Sales Department") {
      return next(
        new ErrorHandler("Assigned user must be from the Sales department", 400),
      );
    }
  }
  // 2. Create the Lead
  const lead = await prisma.lead.create({
    data: {
      customerName,
      phoneNumber,
      email,
      address,
      requirements,
      notes,
      // Connect the user who is logged in as the creator
      createdBy: { connect: { id: req.user.id } },

      // If an assignee ID is provided, connect them. Otherwise, leave it unassigned.
      assignedTo: assignedToId ? { connect: { id: assignedToId } } : undefined,
    },
    // Return the names of the creator and assignee in the response
    include: {
      createdBy: { select: { name: true } },
      assignedTo: { select: { name: true } },
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, { lead }, "Lead created successfully"));
});

// @desc    Get leads (Admins see all, Staff see their assigned leads)
// @route   GET /api/leads
// @access  Private
// controllers/leadController.js

export const getLeads = catchAsyncError(async (req, res, next) => {
  const {page, limit, skip} = req.pagination; // Extract pagination info from the middleware
  
  // 🔥 Catch the status and search filters from the URL
  const { status, search } = req.query; 

  // Build a dynamic query object
  const whereClause = {};
  
  if (status) {
    whereClause.status = status;
  } else {
    whereClause.OR = [
      { status: { not: 'CONVERTED' } },
    ];
  }

  // 🔍 Server-side search filter
  if (search) {
    whereClause.AND = [{
      OR: [
        { customerName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
      ],
    }];
  }

  // 🚨 Access Control: Non-sales STAFF only see their assigned leads
  if (req.user.role === "STAFF" && req.user.department?.name !== "Sales Department") {
    whereClause.assignedToId = req.user.id;
  }

  const [leads, totalLeads] = await prisma.$transaction([
    prisma.lead.findMany({
      where: whereClause, // 👈 Apply the filter here
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" }, // Sort by recently updated/converted
      include: { 
        assignedTo: { select: { name: true, department: true } }, 
        followUps: { orderBy: { createdAt: "desc" }, take: 1 }
      }
    }),
    prisma.lead.count({ where: whereClause }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200, 
      {
        leads,
        meta: {
          totalItems: totalLeads,
          currentPage: page,
          itemsPerPage: limit,
          totalPages: Math.ceil(totalLeads / limit),
        }
      }, 
      "Leads fetched successfully"
    )
  );
});



export const getLeadById = catchAsyncError(async (req, res, next) => {
  const {id} = req.params;

  const lead = await prisma.lead.findUnique({
    where: {id},
    include: {
      assignedTo: { select: { name: true, department: true } },
      followUps: { orderBy: { createdAt: "desc" } }
    }  });

  if (!lead) {
    return next(new ErrorHandler("Lead not found", 404));
  }
  res.status(200).json(new ApiResponse(200, { lead: lead }, "Lead fetched successfully"));
});



// @desc    Update Lead Status
// @route   PUT /api/leads/:id/status
// @access  Private
// @desc    Update Lead Status & Reassign
// @route   PUT /api/leads/:id/status
// @access  Private
export const updateLeadStatus = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const {
    status,
    assignedToId, // 👈 1. Accept the new assignee ID
  } = req.body;

  const existingLead = await prisma.lead.findUnique({ where: { id } });

  if (!existingLead) {
    return next(new ErrorHandler("Lead not found", 404));
  }

  // If reassigned, ensure new staff is from Sales
  if (assignedToId) {
    const user = await prisma.user.findUnique({
      where: { id: assignedToId },
      include: { department: true },
    });
    if (user?.department?.name !== "Sales Department") {
      return next(
        new ErrorHandler("Assigned user must be from the Sales department", 400),
      );
    }
  }

  // Security Check 1: Staff can only update their own leads (Sales bypasses this)
  if (
    req.user.role === "STAFF" && 
    existingLead.assignedToId !== req.user.id &&
    req.user.department?.name !== "Sales Department"
  ) {
    return next(new ErrorHandler("Not authorized to update this lead", 403));
  }

  // 🚨 Security Check 2: REASSIGNMENT GUARD
  if (assignedToId && req.user.role !== "ADMIN" && req.user.department?.name !== "Sales Department") {
    return next(
      new ErrorHandler("Only Admins or Sales are permitted to reassign leads", 403),
    );
  }

  const updatedLead = await prisma.lead.update({
    where: { id },
    data: {
      status,
      assignedToId, // 👈 2. Tell Prisma to swap the IDs
    },
    include: {
      assignedTo: { select: { name: true } },
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(200, { lead: updatedLead }, "Lead updated successfully"),
    );
});

// @desc    Add a Follow-Up to a Lead
// @route   POST /api/leads/:id/followups
// @access  Private
export const addFollowUp = catchAsyncError(async (req, res, next) => {
  const { id: leadId } = req.params;
  const { method, remarks, nextFollowUpDate } = req.body; // method: "WHATSAPP", "PHONE_CALL", "EMAIL"

  if (!method) {
    return next(new ErrorHandler("Please provide a follow-up method", 400));
  }

  // Verify the lead exists
  const lead = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!lead) {
    return next(new ErrorHandler("Lead not found", 404));
  }

  // Create the follow-up record
  const followUp = await prisma.followUp.create({
    data: {
      method,
      remarks,
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
      lead: { connect: { id: leadId } },
      performedBy: { connect: { id: req.user.id } },
    },
  });

  res
    .status(201)
    .json(new ApiResponse(201, { followUp }, "Follow-up added successfully"));
});
