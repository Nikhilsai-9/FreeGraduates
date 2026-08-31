import fs from "fs/promises";
import Resume from "../models/Resume.js";
import { parseFileToText } from "../services/fileParser.js";
import {
  importLinkedInProfile,
  importResumeFile,
  generateResumeDiffSuggestions
} from "../services/geminiService.js";
import { generateResumeDocx } from "../services/docxGenerator.js";

/**
 * POST /api/resumes/import-linkedin
 * Imports LinkedIn PDF export and creates a new Resume record
 */
export async function importLinkedIn(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload your LinkedIn Profile PDF." });
    }

    const rawText = await parseFileToText(req.file.path, req.file.mimetype);
    const structuredData = await importLinkedInProfile(rawText);

    const resume = new Resume({
      userId: req.user.uid,
      title: structuredData.title || `${structuredData.personalInfo?.fullName || "My"} Resume`,
      personalInfo: structuredData.personalInfo || {},
      summary: structuredData.summary || "",
      workExperience: structuredData.workExperience || [],
      education: structuredData.education || [],
      skills: structuredData.skills || { technical: [], tools: [], soft: [] },
      projects: structuredData.projects || [],
      certifications: structuredData.certifications || [],
      languages: structuredData.languages || []
    });

    await resume.save();

    // Clean up temporary uploaded file
    if (req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(201).json({
      success: true,
      data: resume,
      message: "LinkedIn profile imported successfully."
    });
  } catch (error) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
}

/**
 * POST /api/resumes/import-file
 * Imports existing Resume PDF/DOCX and creates a new Resume record
 */
export async function importFile(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload a resume file (PDF or DOCX)." });
    }

    const rawText = await parseFileToText(req.file.path, req.file.mimetype);
    const structuredData = await importResumeFile(rawText);

    const resume = new Resume({
      userId: req.user.uid,
      title: structuredData.title || req.file.originalname.replace(/\.[^/.]+$/, ""),
      personalInfo: structuredData.personalInfo || {},
      summary: structuredData.summary || "",
      workExperience: structuredData.workExperience || [],
      education: structuredData.education || [],
      skills: structuredData.skills || { technical: [], tools: [], soft: [] },
      projects: structuredData.projects || [],
      certifications: structuredData.certifications || [],
      languages: structuredData.languages || []
    });

    await resume.save();

    if (req.file.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }

    res.status(201).json({
      success: true,
      data: resume,
      message: "Resume file parsed and imported successfully."
    });
  } catch (error) {
    if (req.file?.path) {
      await fs.unlink(req.file.path).catch(() => {});
    }
    next(error);
  }
}

/**
 * POST /api/resumes
 * Create new blank/custom resume
 */
export async function createResume(req, res, next) {
  try {
    const resume = new Resume({
      userId: req.user.uid,
      ...req.body
    });

    await resume.save();

    res.status(201).json({
      success: true,
      data: resume,
      message: "Resume created successfully."
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/resumes
 * List all resumes for current user
 */
export async function getResumes(req, res, next) {
  try {
    const resumes = await Resume.find({ userId: req.user.uid }).sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: resumes
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/resumes/:id
 * Retrieve a single resume
 */
export async function getResumeById(req, res, next) {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.uid });
    if (!resume) {
      return res.status(404).json({ success: false, message: "Resume not found." });
    }

    res.status(200).json({
      success: true,
      data: resume
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PUT /api/resumes/:id
 * Update resume content and styling
 */
export async function updateResume(req, res, next) {
  try {
    const resume = await Resume.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.uid },
      { $set: req.body },
      { new: true, runValidators: true }
    );

    if (!resume) {
      return res.status(404).json({ success: false, message: "Resume not found." });
    }

    res.status(200).json({
      success: true,
      data: resume,
      message: "Resume saved successfully."
    });
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/resumes/:id
 * Delete resume
 */
export async function deleteResume(req, res, next) {
  try {
    const result = await Resume.findOneAndDelete({ _id: req.params.id, userId: req.user.uid });
    if (!result) {
      return res.status(404).json({ success: false, message: "Resume not found." });
    }

    res.status(200).json({
      success: true,
      message: "Resume deleted successfully."
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/resumes/:id/suggest-improvements
 * Generate AI diff suggestions against target Job Description
 */
export async function suggestImprovements(req, res, next) {
  try {
    const { jobDescription } = req.body;
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.uid });

    if (!resume) {
      return res.status(404).json({ success: false, message: "Resume not found." });
    }

    if (jobDescription) {
      resume.targetJobDescription = jobDescription;
    }

    const aiDiff = await generateResumeDiffSuggestions(resume.toObject(), resume.targetJobDescription);

    // Map new suggestions with unique IDs and 'pending' status
    const newSuggestions = (aiDiff.suggestions || []).map((s) => ({
      section: s.section,
      targetId: s.targetId || "",
      originalContent: s.originalContent || "",
      suggestedContent: s.suggestedContent || "",
      reason: s.reason || "",
      status: "pending"
    }));

    resume.pendingSuggestions = newSuggestions;
    await resume.save();

    res.status(200).json({
      success: true,
      data: {
        resume,
        targetRoleMatchScore: aiDiff.targetRoleMatchScore || 75,
        roleAlignmentSummary: aiDiff.roleAlignmentSummary || "",
        missingKeywords: aiDiff.missingKeywords || []
      },
      message: "AI improvements generated."
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/resumes/:id/export-docx
 * Generate and stream formatted Word document
 */
export async function exportDocx(req, res, next) {
  try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user.uid });
    if (!resume) {
      return res.status(404).json({ success: false, message: "Resume not found." });
    }

    const buffer = await generateResumeDocx(resume);
    const sanitizedFilename = (resume.personalInfo?.fullName || resume.title || "Resume")
      .replace(/[^a-zA-Z0-9_-]/g, "_");

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${sanitizedFilename}_FreeGraduates.docx"`
    );
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}
