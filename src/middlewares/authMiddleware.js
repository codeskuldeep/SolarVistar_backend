import jwt from "jsonwebtoken";
import prisma from "../config/db.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import catchAsyncError from "./catchAsyncError.js";

// 🔒 1. Protect Routes (Check for valid JWT in Headers)
export const protect = catchAsyncError(async (req, res, next) => {
  let token;

  // 1. Check if the Authorization header exists and starts with "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Extract the token (Format: "Bearer eyJhbGciOiJIUzI1NiI...")
    token = req.headers.authorization.split(" ")[1];
  }

  // 2. If no token was found in the headers
  if (!token) {
    return next(new ErrorHandler("Not authorized to access this route", 401));
  }

  try {
    // 3. Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Fetch user from DB (excluding password)
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        departmentId: true,
        isActive: true,
      },
    });

    // 5. Check if user still exists and is active
    if (!user || !user.isActive) {
      return next(
        new ErrorHandler(
          "The user belonging to this token no longer exists or is inactive.",
          401
        )
      );
    }

    // 6. Attach the user object to the request so controllers can use it
    req.user = user;
    next();
  } catch (error) {
    // This catches expired, malformed, or manipulated tokens
    return next(
      new ErrorHandler("Not authorized, token failed or expired", 401)
    );
  }
});

// 🛡️ 2. Role Authorization (No changes needed!)
export const authorize = (...roles) => {
  return (req, res, next) => {
    // Failsafe in case protect wasn't run first
    if (!req.user) {
      return next(new ErrorHandler("Not authorized, user not verified", 401));
    }

    // Check if the user's role is in the allowed roles array
    if (!roles.includes(req.user.role)) {
      return next(
        new ErrorHandler(
          `User role '${req.user.role}' is not allowed to access this resource`,
          403
        )
      );
    }

    next();
  };
};