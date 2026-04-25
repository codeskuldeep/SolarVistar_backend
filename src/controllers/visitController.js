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
  const { search, leadId } = req.query;

  // Role-based filtering: Sales and Admins see all, other staff see only their assigned visits
  const restricted = req.user.role === "STAFF" && req.user.department?.name !== "Sales Department";
  const where = {};

  if (restricted) {
    where.assignedStaffId = req.user.id;
  }

  if (leadId) {
    where.leadId = leadId;
  }

  // 🔍 Server-side search filter
  if (search) {
    where.AND = [{
      OR: [
        { customerName: { contains: search, mode: 'insensitive' } },
        { phoneNumber: { contains: search } },
        { address: { contains: search, mode: 'insensitive' } },
      ],
    }];
  }

  const [visits, totalVisits] = await prisma.$transaction([
    prisma.visit.findMany({
      where,
      skip,
      take: limit,
      orderBy: { visitDatetime: "asc" }, // upcoming first
      include: {
        assignedStaff: { select: { name: true, department: { select: { name: true } } } },
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

  // Security Check 1: Staff can only update their own visits (Sales bypasses this)
  if (
    req.user.role === "STAFF" &&
    existingVisit.assignedStaffId !== req.user.id &&
    req.user.department?.name !== "Sales Department"
  ) {
    return next(new ErrorHandler("Not authorized to update this visit", 403));
  }

  // 🚨 Security Check 2: REASSIGNMENT GUARD
  // If the request contains a new staff ID, verify the user is an Admin or Sales
  if (assignedStaffId && req.user.role !== "ADMIN" && req.user.department?.name !== "Sales Department") {
    return next(
      new ErrorHandler("Only Admins or Sales are permitted to reassign visits", 403),
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

// @desc    Save the geotagged site location for a visit
// @route   PATCH /api/visits/:id/location
// @access  Private
// Rules:
//   - If siteLocation is NOT yet set → always allow (first-time set)
//   - If siteLocation IS already set → only allow if `force: true` in body (explicit user update)
export const updateVisitLocation = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const { siteLocation, force = false } = req.body;

  if (!siteLocation || typeof siteLocation !== "string" || !siteLocation.trim()) {
    return next(new ErrorHandler("A valid siteLocation string is required", 400));
  }

  const existing = await prisma.visit.findUnique({
    where: { id },
    select: { id: true, siteLocation: true },
  });

  if (!existing) {
    return next(new ErrorHandler("Visit not found", 404));
  }

  // Block overwrite unless user explicitly forced it
  if (existing.siteLocation && !force) {
    return res.status(200).json(
      new ApiResponse(200, { visit: existing, skipped: true }, "Location already set — send force:true to update")
    );
  }

  const updated = await prisma.visit.update({
    where: { id },
    data: { siteLocation: siteLocation.trim() },
    select: { id: true, siteLocation: true },
  });

  res.status(200).json(
    new ApiResponse(200, { visit: updated }, "Site location saved successfully")
  );
});
