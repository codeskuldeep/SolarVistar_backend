import express from "express";
import { 
  createVisit, 
  getVisits, 
  updateVisitStatus 
} from "../controllers/visitController.js";
import { protect } from "../middlewares/authMiddleware.js";

const router = express.Router();

// 🔒 All visit routes require the user to be logged in
router.use(protect);

router.post("/", createVisit);
router.get("/", getVisits);
router.patch("/:id/status", updateVisitStatus);

export default router;