import express from "express";
import { upload } from "../middleware/upload.js";
import {
  uploadResume,
  analyzeResume,
  fullAnalyzeResume,
  getHistory,
  getAnalysisById,
  deleteAnalysis
} from "../controllers/resumeController.js";

const router = express.Router();

router.post("/upload", upload.single("resume"), uploadResume);
router.post("/analyze", analyzeResume);
router.post("/full-analyze", upload.single("resume"), fullAnalyzeResume);
router.get("/history", getHistory);
router.get("/:id", getAnalysisById);
router.delete("/:id", deleteAnalysis);

export default router;
