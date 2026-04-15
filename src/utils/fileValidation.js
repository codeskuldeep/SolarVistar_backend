import ErrorHandler from "./ErrorHandler.js";

/**
 * Validates the MIME type intercepted by Busboy against our .env whitelist.
 * @param {string} mimeType - The info.mimeType from Busboy
 * @returns {boolean}
 */
export const validateFileMetadata = (mimeType) => {
  const envTypes = process.env.ALLOWED_MIME_TYPES;
  
  const allowedTypes = envTypes 
    ? envTypes.split(",").map(type => type.trim()) 
    : [
        "application/pdf", 
        "image/jpeg", 
        "image/png", 
        "application/msword", 
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" // .docx
      ];

  if (!allowedTypes.includes(mimeType)) {
    throw new ErrorHandler(
      `Unsupported file format: ${mimeType}. Please upload a valid document.`, 
      415
    );
  }

  return true;
};