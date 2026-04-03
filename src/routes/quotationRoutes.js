import express from "express";
import {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  deleteQuotation,
} from "../controllers/quotationController.js";
import { protect } from "../middlewares/authMiddleware.js";
import { pagination } from "../middlewares/paginationMiddleware.js";

const router = express.Router();

// 🔒 Apply authentication middleware to ALL routes
// NOTE: Admin authorization removed as requested
router.use(protect);

router.route("/")
  .get(pagination(), getQuotations)
  .post(createQuotation);

router.route("/:id")
  .get(getQuotationById)
  .put(updateQuotation)
  .delete(deleteQuotation);

export default router;