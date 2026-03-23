import express from "express";
import { createUser, deleteUser } from "../controllers/userController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 🔒 Apply middleware to ALL routes in this file
router.use(protect);
router.use(authorize("ADMIN"));

router.post("/", createUser);
router.delete("/:id", deleteUser);

export default router;