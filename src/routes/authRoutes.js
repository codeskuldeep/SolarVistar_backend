import express from "express";
import { getMe, loginUser, logoutUser } from "../controllers/authController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Public Route
router.post("/login", loginUser);
router.post("/logout", logoutUser);
router.get("/me", protect, getMe); // 🔒 Protect this so it reads the cookie!
export default router;
