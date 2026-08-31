import mongoose from "mongoose";

const resumeSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    title: { type: String, default: "Untitled Resume" },
    targetRole: { type: String, default: "" },
    targetJobDescription: { type: String, default: "" },
    templateId: {
      type: String,
      enum: ["modern", "minimal", "student", "classic"],
      default: "modern"
    },
    themeColor: { type: String, default: "#1a91f0" },
    fontFamily: { type: String, default: "inter" },
    fontSize: { type: String, enum: ["small", "medium", "large"], default: "medium" },
    personalInfo: {
      fullName: { type: String, default: "" },
      email: { type: String, default: "" },
      phone: { type: String, default: "" },
      location: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      github: { type: String, default: "" },
      portfolio: { type: String, default: "" }
    },
    summary: { type: String, default: "" },
    workExperience: [
      {
        id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        company: { type: String, default: "" },
        role: { type: String, default: "" },
        startDate: { type: String, default: "" },
        endDate: { type: String, default: "" },
        current: { type: Boolean, default: false },
        bullets: [{ type: String, default: "" }]
      }
    ],
    education: [
      {
        id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        institution: { type: String, default: "" },
        degree: { type: String, default: "" },
        field: { type: String, default: "" },
        year: { type: String, default: "" },
        grade: { type: String, default: "" }
      }
    ],
    skills: {
      technical: [{ type: String }],
      tools: [{ type: String }],
      soft: [{ type: String }]
    },
    projects: [
      {
        id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        title: { type: String, default: "" },
        description: { type: String, default: "" },
        techStack: [{ type: String }],
        link: { type: String, default: "" }
      }
    ],
    certifications: [{ type: String }],
    languages: [{ type: String }],
    pendingSuggestions: [
      {
        id: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
        section: { type: String, enum: ["summary", "experience", "skills", "projects", "general"] },
        targetId: { type: String, default: "" },
        originalContent: { type: String, default: "" },
        suggestedContent: { type: String, default: "" },
        reason: { type: String, default: "" },
        status: { type: String, enum: ["pending", "accepted", "rejected"], default: "pending" }
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("Resume", resumeSchema);
