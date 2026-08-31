import express from "express";
import { upload } from "../middleware/upload.js";
import { requireAuth } from "../middleware/auth.js";
import {
  importLinkedIn,
  importFile,
  createResume,
  getResumes,
  getResumeById,
  updateResume,
  deleteResume,
  suggestImprovements,
  exportDocx
} from "../controllers/resumeBuilderController.js";

const router = express.Router();

// All resume builder routes require authentication
router.use(requireAuth);

router.post("/import-linkedin", upload.single("linkedinPdf"), importLinkedIn);
router.post("/import-file", upload.single("resumeFile"), importFile);
router.post("/", createResume);
router.get("/", getResumes);
router.get("/:id", getResumeById);
router.put("/:id", updateResume);
router.delete("/:id", deleteResume);
router.post("/:id/suggest-improvements", suggestImprovements);
router.post("/:id/export-docx", exportDocx);

export default router;
