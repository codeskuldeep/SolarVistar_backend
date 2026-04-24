import catchAsyncError from "../middlewares/catchAsyncError.js";
import ApiResponse from "../utils/ApiResponse.js";
import {
  uploadDocumentService,
  deleteDocumentService,
  getLeadDocumentsService,
  getVisitDocumentsService,
} from "../services/documentService.js";

// @desc    Upload a new document (Streamed)
// @route   POST /api/documents?category=INVOICE&leadId=123
// @access  Private (Staff/Admin)
export const uploadDocument = catchAsyncError(async (req, res, next) => {
  // req.user.id comes from your auth middleware
  const document = await uploadDocumentService(req, req.user.id);

  res.status(201).json(
    new ApiResponse(201, { document }, "Document uploaded successfully")
  );
});

// @desc    Delete a document
// @route   DELETE /api/documents/:id
// @access  Private (Staff/Admin)
export const deleteDocument = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  await deleteDocumentService(id);

  res.status(200).json(
    new ApiResponse(200, null, "Document deleted successfully")
  );
});

// @desc    Get all documents for a specific lead
// @route   GET /api/documents/lead/:leadId
// @access  Private (Staff/Admin)
export const getLeadDocuments = catchAsyncError(async (req, res, next) => {
  const { leadId } = req.params;

  const documents = await getLeadDocumentsService(leadId);

  res.status(200).json(
    new ApiResponse(200, { documents }, "Documents fetched successfully")
  );
});

// @desc    Get all documents (photos) for a specific visit
// @route   GET /api/documents/visit/:visitId
// @access  Private (Staff/Admin)
export const getVisitDocuments = catchAsyncError(async (req, res, next) => {
  const { visitId } = req.params;

  const documents = await getVisitDocumentsService(visitId);

  res.status(200).json(
    new ApiResponse(200, { documents }, "Visit documents fetched successfully")
  );
});