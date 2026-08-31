import mongoose from "mongoose";

const analysisSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    filePath: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    rawText: { type: String, select: false },
    parsedData: { type: mongoose.Schema.Types.Mixed, default: {} },
    jobDescription: { type: String, default: "" },
    matchScore: { type: Number, default: 0 },
    verdict: { type: String, default: "" },
    subScores: {
      type: mongoose.Schema.Types.Mixed,
      default: { skills: 0, experience: 0, education: 0, keywordDensity: 0 }
    },
    matchedKeywords: { type: [String], default: [] },
    missingKeywords: { type: mongoose.Schema.Types.Mixed, default: [] },
    skillGaps: { type: mongoose.Schema.Types.Mixed, default: [] },
    bulletRewrites: { type: mongoose.Schema.Types.Mixed, default: [] },
    layoutSuggestions: { type: [String], default: [] },
    overallFeedback: {
      type: mongoose.Schema.Types.Mixed,
      default: { strengths: [], weaknesses: [], quickWins: [] }
    }
  },
  { timestamps: true }
);

export default mongoose.model("Analysis", analysisSchema);
