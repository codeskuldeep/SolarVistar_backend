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
    return next(new ErrorHandler("Invalid credentials or inactive account", 401));
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);

  if (!isMatch) {
    return next(new ErrorHandler("Invalid email or password", 401));
  }



  res.status(200).json(
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
        token: generateToken(user.id, user.role, user.departmentId),
      },
      "Login successful"
    )
  );
});

