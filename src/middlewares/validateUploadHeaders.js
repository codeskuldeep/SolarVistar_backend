import ErrorHandler from "../utils/ErrorHandler.js";

export const validateUploadHeaders = (req, res, next) => {
  const contentType = req.headers["content-type"];
  const contentLength = parseInt(req.headers["content-length"], 10);
  
  const maxMb = process.env.MAX_FILE_SIZE_MB || 10;
  const maxBytes = maxMb * 1024 * 1024;

  // 1. Enforce Multipart Form Data
  if (!contentType || !contentType.includes("multipart/form-data")) {
    return next(
      new ErrorHandler("Invalid request: Content-Type must be multipart/form-data", 400)
    );
  }

  // 2. Pre-emptive Size Check (Fails fast before parsing stream)
  // Note: chunked requests might not send content-length, but standard browser FormDatas do.
  if (contentLength && contentLength > maxBytes) {
    return next(
      new ErrorHandler(`Payload too large. Maximum allowed size is ${maxMb}MB.`, 413)
    );
  }

  next();
};