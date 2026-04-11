import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import prisma from "../config/db.js";
import catchAsyncError from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

const generateToken = (id, role, departmentId) => {
  return jwt.sign({ id, role, departmentId }, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });
};

// --- LOGIN ---
export const loginUser = catchAsyncError(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorHandler("Please provide email and password", 400));
  }

  const user = await prisma.user.findUnique({ 
    where: { email },
    include: { department: true } 
  });

  if (!user || !user.isActive) {
    return next(new ErrorHandler("Invalid credentials or inactive account", 401));
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  // 1. Generate the token
  const token = generateToken(user.id, user.role, user.departmentId);

  // 2. Send token and user data in the JSON response (NO COOKIES)
  res.status(200).json(
    new ApiResponse(
      200,
      {
        token, // Added token to the payload
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department,
          departmentId: user.departmentId,
        },
      },
      "Login successful"
    )
  );
});

// --- GET ME ---
export const getMe = catchAsyncError(async (req, res, next) => {
  // req.user will be populated by your updated middleware
  res.status(200).json(
    new ApiResponse(200, { user: req.user }, "User profile fetched successfully")
  );
});

// --- LOGOUT ---
export const logoutUser = catchAsyncError(async (req, res, next) => {
  // The server has no cookies to clear anymore. 
  // We just return a success response.
  res.status(200).json(
    new ApiResponse(200, null, "Logged out successfully")
  );
});