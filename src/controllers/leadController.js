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

  const user = await prisma.user.findUnique({
    where: { id: assignedToId },
    include: { department: true },
  });

  const isFromSales = user?.department?.name === "Sales";
  // 1. Basic Validation
  if (!customerName || !phoneNumber) {
    return next(
      new ErrorHandler("Customer Name and Phone Number are required", 400),
    );
  }
  if (!isFromSales)
    return next(
      new ErrorHandler("Assigned user must be from the Sales department", 400),
    );
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
export const getLeads = catchAsyncError(async (req, res, next) => {
  const { page, limit, skip } = req.pagination;

  let query = {};

  // Role-based filtering
  if (req.user.role === "STAFF") {
    query = { assignedToId: req.user.id };
  }

  const [leads, totalLeads] = await prisma.$transaction([
    prisma.lead.findMany({
      where: query,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        assignedTo: { select: { name: true, email: true } },
        followUps: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.lead.count({
      where: query,
    }),
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
        },
      },
      "Leads fetched successfully",
    )
  );
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

  const user = await prisma.user.findUnique({
    where: { id: assignedToId },
    include: { department: true },
  });

  const isFromSales = user?.department?.name === "Sales";

  const existingLead = await prisma.lead.findUnique({ where: { id } });

  if (!existingLead) {
    return next(new ErrorHandler("Lead not found", 404));
  }

  if (!isFromSales)
    return next(
      new ErrorHandler("Assigned user must be from the Sales department", 400),
    );

  // Security Check 1: Staff can only update their own leads
  if (req.user.role === "STAFF" && existingLead.assignedToId !== req.user.id) {
    return next(new ErrorHandler("Not authorized to update this lead", 403));
  }

  // 🚨 Security Check 2: REASSIGNMENT GUARD
  if (assignedToId && req.user.role !== "ADMIN") {
    return next(
      new ErrorHandler("Only Admins are permitted to reassign leads", 403),
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
