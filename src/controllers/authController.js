import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs"; // Make sure to use bcryptjs to match your install
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

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    return next(
      new ErrorHandler("Invalid credentials or inactive account", 401),
    );
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }

  // 1. Generate the token FIRST
  const token = generateToken(user.id, user.role, user.departmentId);

  // 2. Create cookie options
  const cookieOptions = {
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    httpOnly: true, // 🔒 JavaScript cannot read this!
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  // 3. Attach the cookie and send ONLY the user data in the JSON
  res
    .status(200)
    .cookie("token", token, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            departmentId: user.departmentId,
          },
        },
        "Login successful",
      ),
    );
});


// @desc    Get current logged in user (Check Auth)
// @route   GET /api/auth/me
// @access  Private
export const getMe = catchAsyncError(async (req, res, next) => {
  // Because this route will be protected by your `protect` middleware,
  // req.user is already securely fetched from the DB!
  res.status(200).json(
    new ApiResponse(200, { user: req.user }, "User profile fetched successfully")
  );
});

// @desc    Log user out / clear cookie
// @route   POST /api/auth/logout
// @access  Public
export const logoutUser = catchAsyncError(async (req, res, next) => {
  // Overwrite the cookie with a blank one that expires in 10 seconds
  res.status(200).cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  }).json(
    new ApiResponse(200, null, "Logged out successfully")
  );
});