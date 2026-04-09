import express from "express";
import { createUser, deleteUser, getUsers } from "../controllers/userController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";
import { pagination } from "../middlewares/paginationMiddleware.js";

const router = express.Router();

// 🔒 Apply middleware to ALL routes in this file
router.use(protect);

router.get("/", pagination(), getUsers);
router.post("/", authorize("ADMIN"), createUser);
router.delete("/:id", authorize("ADMIN"), deleteUser);

export default router;