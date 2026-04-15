import cloudinary from "../config/cloudinary.js";
import ErrorHandler from "./ErrorHandler.js";

/**
 * Builds the dynamic Cloudinary folder path.
 */
const buildFolderPath = (category, userId) => {
  const baseFolder = process.env.CLOUDINARY_FOLDER || "default-app";
  return `${baseFolder}/documents/${category}/${userId}`;
};

/**
 * Pipes a live Node.js readable stream directly to Cloudinary.
 * * @param {ReadableStream} fileStream - The live stream from Busboy
 * @param {string} category - Document category (e.g., 'invoices')
 * @param {string} userId - ID of the user uploading
 * @returns {Promise<Object>} - Resolves with Cloudinary metadata
 */
export const streamUploadToCloudinary = (fileStream, category, userId) => {
  return new Promise((resolve, reject) => {
    const folderPath = buildFolderPath(category, userId);

    // Initialize the Cloudinary upload stream
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folderPath,
        resource_type: "auto", // Automatically detects PDFs, images, docs
      },
      (error, result) => {
        if (error) {
          return reject(
            new ErrorHandler(`Cloudinary Stream Upload Failed: ${error.message}`, 502)
          );
        }
        resolve(result);
      }
    );

    // Error handling for the read stream itself
    fileStream.on("error", (error) => {
      reject(new ErrorHandler(`Error reading file stream: ${error.message}`, 500));
    });

    // 🌊 THE MAGIC: Pipe the live user upload directly into Cloudinary's servers
    fileStream.pipe(uploadStream);
  });
};

/**
 * Deletes a file from Cloudinary using its exact public_id.
 * * @param {string} publicId - The public_id returned during upload
 * @returns {Promise<boolean>}
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    const response = await cloudinary.uploader.destroy(publicId);
    
    if (response.result !== "ok" && response.result !== "not found") {
      throw new Error(`Unexpected deletion status: ${response.result}`);
    }
    
    return true;
  } catch (error) {
    throw new ErrorHandler(`Cloudinary Delete Failed: ${error.message}`, 502);
  }
};