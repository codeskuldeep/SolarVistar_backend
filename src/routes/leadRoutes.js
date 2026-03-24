import express from "express";
import { 
  createLead, 
  getLeads, 
  updateLeadStatus, 
  addFollowUp 
} from "../controllers/leadController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 🔒 All lead routes require the user to be logged in
router.use(protect);

router.post("/", createLead);
router.get("/", getLeads);
router.patch("/:id/status", updateLeadStatus);
router.post("/:id/followups", addFollowUp);

export default router;