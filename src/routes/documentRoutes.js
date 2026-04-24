import express from "express";
import {
  uploadDocument,
  deleteDocument,
  getLeadDocuments,
  getVisitDocuments,
} from "../controllers/documentController.js";
import { validateUploadHeaders } from "../middlewares/validateUploadHeaders.js";

// Import your existing auth middleware (adjust path as needed)
import { protect } from "../middlewares/authMiddleware.js"; 

const router = express.Router();

// Apply authentication to ALL document routes
router.use(protect);

// POST /api/documents?category=INVOICE&leadId=123
// Notice the middleware chain: Auth -> Header Check -> Controller
router.post("/", validateUploadHeaders, uploadDocument);

// GET /api/documents/lead/:leadId
router.get("/lead/:leadId", getLeadDocuments);

// GET /api/documents/visit/:visitId
router.get("/visit/:visitId", getVisitDocuments);

// DELETE /api/documents/:id
router.delete("/:id", deleteDocument);

export default router;