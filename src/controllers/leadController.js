import prisma from "../config/db.js";
import catchAsyncError from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

// @desc    Create a new Lead
// @route   POST /api/leads
// @access  Private (Admin or Staff)
export const createLead = catchAsyncError(async (req, res, next) => {
  const { customerName, phoneNumber, email, address, requirements, notes, assignedToId } = req.body;

  // 1. Basic Validation
  if (!customerName || !phoneNumber) {
    return next(new ErrorHandler("Customer Name and Phone Number are required", 400));
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
      assignedTo: { select: { name: true } }
    }
  });

  res.status(201).json(new ApiResponse(201, { lead }, "Lead created successfully"));
});

// @desc    Get leads (Admins see all, Staff see their assigned leads)
// @route   GET /api/leads
// @access  Private
export const getLeads = catchAsyncError(async (req, res, next) => {
  let query = {};

  // If the user is STAFF, restrict the query to only leads assigned to them
  if (req.user.role === "STAFF") {
    query = { assignedToId: req.user.id };
  }

  const leads = await prisma.lead.findMany({
    where: query,
    orderBy: { createdAt: 'desc' }, // Newest leads first
    include: {
      assignedTo: { select: { name: true, email: true } },
      followUps: { 
        orderBy: { createdAt: 'desc' },
        take: 1 // Just grab the most recent follow-up
      }
    }
  });

  res.status(200).json(new ApiResponse(200, { count: leads.length, leads }, "Leads fetched successfully"));
});

// @desc    Update Lead Status
// @route   PUT /api/leads/:id/status
// @access  Private
export const updateLeadStatus = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { status } = req.body; // e.g., "CONTACTED", "INTERESTED", "CONVERTED"

  if (!status) {
    return next(new ErrorHandler("Please provide a new status", 400));
  }

  // Find the lead first to check permissions
  const existingLead = await prisma.lead.findUnique({ where: { id } });

  if (!existingLead) {
    return next(new ErrorHandler("Lead not found", 404));
  }

  // Security Check: Staff can only update leads assigned to them
  if (req.user.role === "STAFF" && existingLead.assignedToId !== req.user.id) {
    return next(new ErrorHandler("Not authorized to update this lead", 403));
  }

  const updatedLead = await prisma.lead.update({
    where: { id },
    data: { status },
  });

  res.status(200).json(new ApiResponse(200, { lead: updatedLead }, "Lead status updated successfully"));
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
      performedBy: { connect: { id: req.user.id } }
    }
  });

  res.status(201).json(new ApiResponse(201, { followUp }, "Follow-up added successfully"));
});