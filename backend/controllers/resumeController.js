import fs from "fs/promises";
import path from "path";
import Analysis from "../models/Analysis.js";
import { parseFileToText } from "../services/fileParser.js";
import { parseResume, analyzeAgainstJD } from "../services/geminiService.js";

/**
 * Helper to prepare an Analysis document for JSON response (removes rawText)
 */
function sanitizeAnalysisDoc(doc) {
  const obj = doc.toObject ? doc.toObject() : { ...doc };
  delete obj.rawText;
  return obj;
}

/**
 * POST /api/resume/upload
 * Multipart file (field: resume) -> Parse & structure only
 */
export async function uploadResume(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No resume file uploaded." });
    }

    const rawText = await parseFileToText(req.file.path, req.file.mimetype);
    const parsedData = await parseResume(rawText);

    const analysis = new Analysis({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      rawText,
      parsedData
    });

    await analysis.save();

    res.status(201).json({
      success: true,
      data: {
        id: analysis._id,
        parsedData: analysis.parsedData
      },
      message: "Resume uploaded and structured successfully."
    });
  } catch (error) {
    // If error happened after file was uploaded to disk, cleanup file
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
}

/**
 * POST /api/resume/analyze
 * Body: { analysisId, jobDescription }
 */
export async function analyzeResume(req, res, next) {
  try {
    const { analysisId, jobDescription } = req.body;

    if (!analysisId) {
      return res.status(400).json({ success: false, message: "analysisId is required." });
    }

    if (!jobDescription || jobDescription.trim().length < 50) {
      return res.status(400).json({
        success: false,
        message: "Job description is required and must be at least 50 characters."
      });
    }

    const analysis = await Analysis.findById(analysisId).select("+rawText");
    if (!analysis) {
      return res.status(404).json({ success: false, message: "Analysis record not found." });
    }

    const result = await analyzeAgainstJD(analysis.rawText, jobDescription.trim());

    analysis.parsedData = result.parsedData || analysis.parsedData;
    analysis.jobDescription = jobDescription.trim();
    analysis.matchScore = result.matchScore ?? 0;
    analysis.verdict = result.verdict || "Evaluated";
    analysis.subScores = result.subScores || { skills: 0, experience: 0, education: 0, keywordDensity: 0 };
    analysis.matchedKeywords = result.matchedKeywords || [];
    analysis.missingKeywords = result.missingKeywords || [];
    analysis.skillGaps = result.skillGaps || [];
    analysis.bulletRewrites = result.bulletRewrites || [];
    analysis.layoutSuggestions = result.layoutSuggestions || [];
    analysis.overallFeedback = result.overallFeedback || { strengths: [], weaknesses: [], quickWins: [] };

    await analysis.save();

    res.status(200).json({
      success: true,
      data: sanitizeAnalysisDoc(analysis),
      message: "Resume analysis completed successfully."
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/resume/full-analyze
 * Multipart: file (resume) + jobDescription
 */
export async function fullAnalyzeResume(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload a resume file (PDF or DOCX)." });
    }

    const jobDescription = req.body.jobDescription ? req.body.jobDescription.trim() : "";
    if (!jobDescription || jobDescription.length < 50) {
      if (req.file?.path) {
        await fs.unlink(req.file.path).catch(() => {});
      }
      return res.status(400).json({
        success: false,
        message: "Job description is required and must be at least 50 characters."
      });
    }

    const rawText = await parseFileToText(req.file.path, req.file.mimetype);
    const aiResult = await analyzeAgainstJD(rawText, jobDescription);

    const analysis = new Analysis({
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileType: req.file.mimetype,
      fileSize: req.file.size,
      rawText,
      parsedData: aiResult.parsedData || {},
      jobDescription,
      matchScore: aiResult.matchScore ?? 0,
      verdict: aiResult.verdict || "Evaluated",
      subScores: aiResult.subScores || { skills: 0, experience: 0, education: 0, keywordDensity: 0 },
      matchedKeywords: aiResult.matchedKeywords || [],
      missingKeywords: aiResult.missingKeywords || [],
      skillGaps: aiResult.skillGaps || [],
      bulletRewrites: aiResult.bulletRewrites || [],
      layoutSuggestions: aiResult.layoutSuggestions || [],
      overallFeedback: aiResult.overallFeedback || { strengths: [], weaknesses: [], quickWins: [] }
    });

    await analysis.save();

    res.status(201).json({
      success: true,
      data: sanitizeAnalysisDoc(analysis),
      message: "Full resume analysis generated successfully."
    });
  } catch (error) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
}

/**
 * GET /api/resume/history
 * Returns last 20 analyses (excludes rawText)
 */
export async function getHistory(req, res, next) {
  try {
    const list = await Analysis.find()
      .select("-rawText")
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      data: list
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/resume/:id
 * Returns single full analysis by ID
 */
export async function getAnalysisById(req, res, next) {
  try {
    const analysis = await Analysis.findById(req.params.id).select("-rawText");
    if (!analysis) {
      return res.status(404).json({ success: false, message: "Analysis not found." });
    }

    res.status(200).json({
      success: true,
      data: analysis
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/resume/:id
 * Deletes analysis document and removes file from disk
 */
export async function deleteAnalysis(req, res, next) {
  try {
    const analysis = await Analysis.findById(req.params.id);
    if (!analysis) {
      return res.status(404).json({ success: false, message: "Analysis not found." });
    }

    // Attempt to unlink local file
    if (analysis.filePath) {
      await fs.unlink(analysis.filePath).catch(() => {
        // File may have already been removed
      });
    }

    await Analysis.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Analysis and associated file deleted successfully."
    });
  } catch (error) {
    next(error);
  }
}
