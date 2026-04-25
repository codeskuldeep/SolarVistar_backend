import express from "express";
import { 
  createVisit, 
  getVisits, 
  updateVisitStatus,
  updateVisitLocation,
} from "../controllers/visitController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { pagination } from "../middlewares/paginationMiddleware.js";

const router = express.Router();

// 🔒 All visit routes require the user to be logged in
router.use(protect);

router.post("/", createVisit);
router.get("/", pagination(), getVisits);
router.patch("/:id/status", updateVisitStatus);
router.patch("/:id/location", updateVisitLocation);

export default router;