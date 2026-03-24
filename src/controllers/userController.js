import bcrypt from "bcryptjs";
import prisma from "../config/db.js";
import catchAsyncError from "../middlewares/catchAsyncError.js";
import ErrorHandler from "../utils/ErrorHandler.js";
import ApiResponse from "../utils/ApiResponse.js";

// @desc    Create a new user (Staff or Admin)
// @route   POST /api/users
// @access  Private/Admin Only
export const createUser = catchAsyncError(async (req, res, next) => {
  const { name, email, password, role, department } = req.body;
  let departmentName = department[0].toUpperCase() + department.slice(1).toLowerCase(); // Normalize department name

  if (!name || !email || !password) {
    return next(new ErrorHandler("Please provide all required fields", 400));
  }

  const userExists = await prisma.user.findUnique({ where: { email } });
  if (userExists) {
    return next(new ErrorHandler("User already exists with this email", 400));
  }

  // Validate department if creating a STAFF member
  if (role !== "ADMIN") {
    if (!departmentName) {
      return next(new ErrorHandler("Staff members must be assigned to a department", 400));
    }
    const deptExists = await prisma.department.findUnique({ where: { name: departmentName } });
    if (!deptExists) {
      return next(new ErrorHandler("Invalid Department Name", 404));
    }
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: role || "STAFF",
      // Connects the user to the department by its name (e.g., "Sales")
      department: departmentName ? {
        connect: { name: departmentName }
      } : undefined
    }
  });

  res.status(201).json(
    new ApiResponse(
      201,
      {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          departmentId: user.departmentId,
        },
      },
      "User created successfully"
    )
  );
});

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private/Admin Only
export const deleteUser = catchAsyncError(async (req, res, next) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    return next(new ErrorHandler("User not found", 404));
  }

  // Prevent admin from deleting themselves accidentally
  if (user.id === req.user.id) {
    return next(new ErrorHandler("You cannot delete your own admin account", 400));
  }

  await prisma.user.delete({ where: { id } });

  res.status(200).json(new ApiResponse(200, null, "User removed successfully"));
});