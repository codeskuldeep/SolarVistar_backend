import busboy from "busboy";
import ErrorHandler from "./ErrorHandler.js";

/**
 * Parses a multipart/form-data stream and intercepts the file.
 * Returns a Promise that resolves with the LIVE file stream, preventing RAM buildup.
 * * @param {Object} req - The Express request object
 * @returns {Promise<Object>} { fileStream, info } 
 */
export const parseMultipartStream = (req) => {
  return new Promise((resolve, reject) => {
    let fileFound = false;
    
    // Initialize Busboy with request headers
    const bb = busboy({ 
      headers: req.headers,
      limits: {
        // Double-layered protection: hard cutoff if stream exceeds size
        fileSize: (process.env.MAX_FILE_SIZE_MB || 10) * 1024 * 1024,
      }
    });

    // Listen for the 'file' event
    bb.on("file", (fieldname, fileStream, info) => {
      fileFound = true;
      
      // If the stream hits the fileSize limit, Busboy truncates it.
      // We must listen for the 'limit' event to reject the promise.
      fileStream.on("limit", () => {
        reject(new ErrorHandler(`File exceeds the maximum size limit of ${process.env.MAX_FILE_SIZE_MB}MB.`, 413));
      });

      // Hand off the stream immediately. We DO NOT wait for it to finish.
      resolve({ fileStream, info });
    });

    // If the entire request finishes parsing and no file was found
    bb.on("close", () => {
      if (!fileFound) {
        reject(new ErrorHandler("No file provided in the request.", 400));
      }
    });

    // Handle generic parsing errors
    bb.on("error", (error) => {
      reject(new ErrorHandler(`Stream parsing error: ${error.message}`, 500));
    });

    // Start piping the raw request into Busboy
    req.pipe(bb);
  });
};