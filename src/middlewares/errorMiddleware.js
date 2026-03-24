export const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal Server Error";

  res.status(err.statusCode).json({
    success: false, // Always false for errors
    statusCode: err.statusCode,
    message: err.message,
    data: null, // Keep the contract consistent so frontend doesn't crash
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};