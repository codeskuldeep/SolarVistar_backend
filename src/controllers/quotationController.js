import prisma from "../config/db.js";
import catchAsyncError from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

// @desc    Create a new quotation
// @route   POST /api/quotations
// @access  Private (All authenticated users)
export const createQuotation = catchAsyncError(async (req, res, next) => {
  const { leadId, ...quotationData } = req.body;

  if (!leadId) {
    return next(new ErrorHandler("Please provide a leadId to attach this quotation to", 400));
  }

  // Check if the Lead exists before attaching a quotation
  const leadExists = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!leadExists) {
    return next(new ErrorHandler("Lead not found", 404));
  }

  const quotation = await prisma.quotation.create({
    data: {
      leadId,
      ...quotationData, // Spreads all the optional fields (panelName, quotationValue, etc.)
    },
  });

  res.status(201).json(
    new ApiResponse(201, { quotation }, "Quotation created successfully")
  );
});

// @desc    Get all quotations (Optional: filter by leadId)
// @route   GET /api/quotations
// @access  Private 
export const getQuotations = catchAsyncError(async (req, res, next) => {
  const { page, limit, skip } = req.pagination;
  const { leadId } = req.query;

  // Build query cleanly (immutable)
  const where = leadId ? { leadId } : undefined;

  const [quotations, totalQuotations] = await prisma.$transaction([
    prisma.quotation.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        lead: {
          select: { customerName: true, phoneNumber: true },
        },
      },
    }),
    prisma.quotation.count({ where }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        quotations,
        meta: {
          totalItems: totalQuotations,
          currentPage: page,
          itemsPerPage: limit,
          totalPages: Math.ceil(totalQuotations / limit),
        },
      },
      "Quotations fetched successfully"
    )
  );
});
// @desc    Get a single quotation by ID
// @route   GET /api/quotations/:id
// @access  Private 
export const getQuotationById = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      lead: {
        select: { customerName: true, address: true },
      },
    },
  });

  if (!quotation) {
    return next(new ErrorHandler("Quotation not found", 404));
  }

  res.status(200).json(
    new ApiResponse(200, { quotation }, "Quotation fetched successfully")
  );
});

// @desc    Update a quotation
// @route   PUT /api/quotations/:id
// @access  Private 
export const updateQuotation = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;
  const updateData = req.body;

  let quotation = await prisma.quotation.findUnique({ where: { id } });

  if (!quotation) {
    return next(new ErrorHandler("Quotation not found", 404));
  }

  // Prevent updating the leadId to keep data integrity safe, or remove this if you want to allow re-assigning
  if (updateData.leadId) {
      delete updateData.leadId; 
  }

  quotation = await prisma.quotation.update({
    where: { id },
    data: updateData,
  });

  res.status(200).json(
    new ApiResponse(200, { quotation }, "Quotation updated successfully")
  );
});

// @desc    Delete a quotation
// @route   DELETE /api/quotations/:id
// @access  Private 
export const deleteQuotation = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const quotation = await prisma.quotation.findUnique({ where: { id } });

  if (!quotation) {
    return next(new ErrorHandler("Quotation not found", 404));
  }

  await prisma.quotation.delete({ where: { id } });

  res.status(200).json(
    new ApiResponse(200, null, "Quotation removed successfully")
  );
});