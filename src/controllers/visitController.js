import prisma from "../config/db.js";
import catchAsyncError from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import ApiResponse from "../utils/ApiResponse.js"; // Using our new standard!

// @desc    Schedule a new Visit
// @route   POST /api/visits
// @access  Private (Admin & Staff)
export const createVisit = catchAsyncError(async (req, res, next) => {
  const {
    customerName,
    phoneNumber,
    address,
    visitDatetime,
    purpose,
    leadId,
    assignedStaffId,
  } = req.body;

  // 1. Validate required fields
  if (!customerName || !phoneNumber || !address || !visitDatetime || !purpose) {
    return next(
      new ErrorHandler("Please provide all required visit details", 400),
    );
  }

  // 2. Create the Visit record
  const visit = await prisma.visit.create({
    data: {
      customerName,
      phoneNumber,
      address,
      visitDatetime: new Date(visitDatetime), // Ensure it's a valid DateTime object
      purpose,

      // Connect to a lead if this visit was generated from the sales pipeline
      lead: leadId ? { connect: { id: leadId } } : undefined,

      // Connect the assigned field technician/staff
      assignedStaff: assignedStaffId
        ? { connect: { id: assignedStaffId } }
        : undefined,

      // Connect the user who actually scheduled the visit
      createdBy: { connect: { id: req.user.id } },
    },
    include: {
      assignedStaff: { select: { name: true, phoneNumber: true } },
    },
  });

  // ⏳ TODO: We will inject the WhatsApp API trigger right here next!

  res
    .status(201)
    .json(new ApiResponse(201, { visit }, "Visit scheduled successfully"));
});

// @desc    Get scheduled visits (Admins see all, Staff see their assigned visits)
// @route   GET /api/visits
// @access  Private
export const getVisits = catchAsyncError(async (req, res, next) => {
  const { page, limit, skip } = req.pagination;

  // Role-based filtering (immutable)
  const where =
    req.user.role === "STAFF" ? { assignedStaffId: req.user.id } : undefined;

  const [visits, totalVisits] = await prisma.$transaction([
    prisma.visit.findMany({
      where,
      skip,
      take: limit,
      orderBy: { visitDatetime: "asc" }, // upcoming first
      include: {
        assignedStaff: { select: { name: true } },
        lead: { select: { id: true, status: true } },
      },
    }),
    prisma.visit.count({ where }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        visits,
        meta: {
          totalItems: totalVisits,
          currentPage: page,
          itemsPerPage: limit,
          totalPages: Math.ceil(totalVisits / limit),
        },
      },
      "Visits fetched successfully",
    ),
  );
});
// @desc    Update Visit Status & Add Post-Visit Notes
// @route   PUT /api/visits/:id/status
// @access  Private
// @desc    Update Visit Status & Reassign (Admins Only)
// @route   PUT /api/visits/:id/status
// @access  Private
export const updateVisitStatus = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const {
    status,
    comments,
    customerFeedback,
    workCompleted,
    issuesIdentified,
    nextSteps,
    assignedStaffId, // 👈 1. We now accept this from the frontend!
  } = req.body;

  // Find the visit first
  const existingVisit = await prisma.visit.findUnique({ where: { id } });

  if (!existingVisit) {
    return next(new ErrorHandler("Visit not found", 404));
  }

  // Security Check 1: Staff can only update their own visits
  if (
    req.user.role === "STAFF" &&
    existingVisit.assignedStaffId !== req.user.id
  ) {
    return next(new ErrorHandler("Not authorized to update this visit", 403));
  }

  // 🚨 Security Check 2: REASSIGNMENT GUARD
  // If the request contains a new staff ID, verify the user is an Admin
  if (assignedStaffId && req.user.role !== "ADMIN") {
    return next(
      new ErrorHandler("Only Admins are permitted to reassign visits", 403),
    );
  }

  // Update the visit
  const updatedVisit = await prisma.visit.update({
    where: { id },
    data: {
      status,
      comments,
      customerFeedback,
      workCompleted,
      issuesIdentified,
      nextSteps,
      assignedStaffId, // 👈 2. Pass the new ID to Prisma!
    },
    include: {
      assignedStaff: { select: { name: true } }, // Return the new assigned person's name so the frontend updates immediately
    },
  });

  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { visit: updatedVisit },
        "Visit updated successfully",
      ),
    );
});
