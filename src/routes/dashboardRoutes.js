import express from "express";
import { getAdminStats } from "../controllers/dashboardController.js";
import { protect, authorize } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Only Admins (or Sales for some cards) can view company-wide stats
// For now, we restrict to ADMIN as per AdminDashboard's purpose
router.get("/admin-stats", protect, authorize("ADMIN"), getAdminStats);

export default router;
