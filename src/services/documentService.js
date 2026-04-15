import prisma from "../config/db.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import { parseMultipartStream } from "../utils/streamParser.js";
import { validateFileMetadata } from "../utils/fileValidation.js";
import { streamUploadToCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";

/**
 * Orchestrates the full streaming upload cycle.
 * @param {Object} req - The raw Express request object
 * @param {string} uploadedById - The ID of the Staff/Admin (req.user.id)
 * @returns {Promise<Object>} - The newly created Prisma document
 */
export const uploadDocumentService = async (req, uploadedById) => {
  // 1. Extract metadata from Query Params (Bulletproof against multipart race conditions)
  const { category, leadId } = req.query;

  if (!category) {
    throw new ErrorHandler("Document 'category' is required in query parameters.", 400);
  }

  // Optional: Verify the Lead exists before accepting a massive file stream
  if (leadId) {
    const leadExists = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!leadExists) throw new ErrorHandler("Lead not found.", 404);
  }

  // 2. Intercept the live stream
  const { fileStream, info } = await parseMultipartStream(req);

  // 3. Validate MIME Type instantly
  validateFileMetadata(info.mimeType);

  // 4. Stream directly to Cloudinary (Zero Server RAM overhead)
  const cloudData = await streamUploadToCloudinary(fileStream, category, uploadedById);

  // 5. Save the finalized record in the Database
  const document = await prisma.document.create({
    data: {
      url: cloudData.secure_url,
      publicId: cloudData.public_id,
      format: cloudData.format || info.mimeType.split("/")[1],
      bytes: cloudData.bytes,
      category: category.toUpperCase(),
      uploadedById,
      leadId: leadId || null, // Links to Lead if provided
    },
  });

  return document;
};

/**
 * Deletes a document from both Cloudinary and the Database.
 * @param {string} documentId - The Prisma Document ID
 */
export const deleteDocumentService = async (documentId) => {
  // 1. Verify existence
  const document = await prisma.document.findUnique({ where: { id: documentId } });
  
  if (!document) {
    throw new ErrorHandler("Document not found.", 404);
  }

  // 2. Wipe from Cloudinary first (If DB fails, Cloudinary is still clean. Better than orphan files)
  await deleteFromCloudinary(document.publicId);

  // 3. Wipe from Database
  await prisma.document.delete({ where: { id: documentId } });

  return true;
};

/**
 * Fetches all documents for a specific lead.
 * @param {string} leadId 
 */
export const getLeadDocumentsService = async (leadId) => {
  const documents = await prisma.document.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    include: {
      // ⚡ Include the staff member's name so the UI can show "Uploaded by John (Admin)"
      uploadedBy: {
        select: { name: true, role: true } 
      }
    }
  });

  return documents;
};