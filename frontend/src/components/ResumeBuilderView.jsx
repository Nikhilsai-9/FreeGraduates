import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  FileText,
  Plus,
  Trash2,
  Download,
  Eye,
  CheckCircle,
  Sparkles,
  ArrowLeft,
  RefreshCw,
  Save,
  Layers,
  FileDown,
  Briefcase,
  GraduationCap,
  Wrench,
  FolderGit2,
  Award,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  Target,
  Check,
  HelpCircle,
  Info
} from "lucide-react";
import html2pdf from "html2pdf.js";
import {
  parseLinkedInData,
  parseResumeDocument,
  tailorResumeWithJD,
  analyzeJobDescription,
  exportResumeAsDocx,
  getSavedResumes,
  saveResumeDraft,
  deleteResumeDraft,
  DEFAULT_RESUME_SCHEMA,
  POWER_ACTION_VERBS
} from "../services/aiEngine";

const LinkedInIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function ResumeBuilderView({ onBackToDashboard }) {
  // Saved versions & active resume state
  const [savedResumes, setSavedResumes] = useState([]);
  const [resumeData, setResumeData] = useState(DEFAULT_RESUME_SCHEMA);
  
  // Navigation & Pathway States
  const [creationPath, setCreationPath] = useState("form"); // 'form' | 'linkedin' | 'upload'
  const [activeTab, setActiveTab] = useState("personal"); // 'personal' | 'experience' | 'education' | 'skills' | 'projects' | 'certifications' | 'awards'
  const [templateStyle, setTemplateStyle] = useState("classic"); // 'classic' | 'professional' | 'modern' | 'minimal'

  // Job Description Tailoring States
  const [showJdPanel, setShowJdPanel] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [jdAnalysis, setJdAnalysis] = useState(null);
  const [isTailoring, setIsTailoring] = useState(false);
  const [tailorStepText, setTailorStepText] = useState("");

  // Input & Parsing States
  const [linkedinInput, setLinkedinInput] = useState("");
  const [parsingLoading, setParsingLoading] = useState(false);
  const [newSkillInput, setNewSkillInput] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [showDraftsMenu, setShowDraftsMenu] = useState(false);

  const previewRef = useRef(null);

  // Load saved drafts on mount
  useEffect(() => {
    const list = getSavedResumes();
    setSavedResumes(list);
    if (list.length > 0) {
      setResumeData(list[0]);
      if (list[0].templateStyle) setTemplateStyle(list[0].templateStyle);
    }
  }, []);

  // Save current resume draft
  const handleSave = () => {
    const updated = saveResumeDraft({
      ...resumeData,
      templateStyle
    });
    setResumeData(updated);
    setSavedResumes(getSavedResumes());
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Switch to a specific saved version
  const handleSelectDraft = (draft) => {
    setResumeData(draft);
    if (draft.templateStyle) setTemplateStyle(draft.templateStyle);
    setShowDraftsMenu(false);
  };

  // Create new blank draft
  const handleCreateNewVersion = () => {
    const newDraft = {
      ...DEFAULT_RESUME_SCHEMA,
      id: `resume-${Date.now()}`,
      versionName: `New Resume Draft (${new Date().toLocaleDateString()})`,
      updatedAt: new Date().toISOString(),
      templateStyle
    };
    const saved = saveResumeDraft(newDraft);
    setResumeData(saved);
    setSavedResumes(getSavedResumes());
    setShowDraftsMenu(false);
  };

  // Handle LinkedIn Import
  const handleLinkedInSubmit = async () => {
    if (!linkedinInput.trim()) return;
    try {
      setParsingLoading(true);
      const parsed = await parseLinkedInData(linkedinInput);
      setResumeData(parsed);
      setCreationPath("form");
      saveResumeDraft(parsed);
      setSavedResumes(getSavedResumes());
    } finally {
      setParsingLoading(false);
    }
  };

  // Handle Resume File Upload Parse
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setParsingLoading(true);
      const parsed = await parseResumeDocument(file);
      setResumeData(parsed);
      setCreationPath("form");
      saveResumeDraft(parsed);
      setSavedResumes(getSavedResumes());
    } finally {
      setParsingLoading(false);
    }
  };

  // AI JD Alignment with Multi-step Progress
  const handleTailorWithJD = async () => {
    if (!jobDescription.trim()) return;
    setIsTailoring(true);
    
    // Step 1
    setTailorStepText("Analyzing target role requirements...");
    await new Promise((r) => setTimeout(r, 600));

    // Step 2
    setTailorStepText("Mapping candidate skills against JD terminology...");
    const analysis = analyzeJobDescription(jobDescription);
    setJdAnalysis(analysis);
    await new Promise((r) => setTimeout(r, 700));

    // Step 3
    setTailorStepText("Optimizing ATS summary & bullet points with factual integrity...");
    const tailored = tailorResumeWithJD(resumeData, jobDescription);
    setResumeData(tailored);
    saveResumeDraft(tailored);
    setSavedResumes(getSavedResumes());
    await new Promise((r) => setTimeout(r, 500));

    setIsTailoring(false);
    setTailorStepText("");
  };

  // PDF Export
  const handleExportPDF = () => {
    if (!previewRef.current) return;
    setIsExportingPdf(true);
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${(resumeData.personal.fullName || "Resume").replace(/\s+/g, "_")}_ATS_Resume.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    html2pdf()
      .set(opt)
      .from(previewRef.current)
      .save()
      .then(() => setIsExportingPdf(false))
      .catch(() => {
        window.print();
        setIsExportingPdf(false);
      });
  };

  // DOCX Export
  const handleExportDOCX = async () => {
    try {
      setIsExportingDocx(true);
      await exportResumeAsDocx(resumeData);
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Helper State Modifiers
  const updatePersonal = (field, val) => {
    setResumeData((prev) => ({
      ...prev,
      personal: { ...prev.personal, [field]: val }
    }));
  };

  const addExperience = () => {
    setResumeData((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          id: `exp-${Date.now()}`,
          role: "Role Title",
          company: "Company / Organization",
          location: "City, State",
          startDate: "Jan 2024",
          endDate: "Present",
          description: "Engineered high-impact features and optimized performance metrics."
        }
      ]
    }));
  };

  const updateExperience = (id, field, val) => {
    setResumeData((prev) => ({
      ...prev,
      experience: prev.experience.map((e) => (e.id === id ? { ...e, [field]: val } : e))
    }));
  };

  const removeExperience = (id) => {
    setResumeData((prev) => ({
      ...prev,
      experience: prev.experience.filter((e) => e.id !== id)
    }));
  };

  const addEducation = () => {
    setResumeData((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        {
          id: `edu-${Date.now()}`,
          school: "University Name",
          degree: "Bachelor of Technology",
          field: "Computer Science",
          startDate: "2022",
          endDate: "2026",
          gpa: "3.8 / 4.0"
        }
      ]
    }));
  };

  const updateEducation = (id, field, val) => {
    setResumeData((prev) => ({
      ...prev,
      education: prev.education.map((e) => (e.id === id ? { ...e, [field]: val } : e))
    }));
  };

  const removeEducation = (id) => {
    setResumeData((prev) => ({
      ...prev,
      education: prev.education.filter((e) => e.id !== id)
    }));
  };

  const addProject = () => {
    setResumeData((prev) => ({
      ...prev,
      projects: [
        ...(prev.projects || []),
        {
          id: `proj-${Date.now()}`,
          title: "Project Title",
          techStack: "React, Node.js, PostgreSQL",
          link: "github.com/developer/project",
          description: "Built a fullstack application with responsive UI and optimized database queries."
        }
      ]
    }));
  };

  const updateProject = (id, field, val) => {
    setResumeData((prev) => ({
      ...prev,
      projects: (prev.projects || []).map((p) => (p.id === id ? { ...p, [field]: val } : p))
    }));
  };

  const removeProject = (id) => {
    setResumeData((prev) => ({
      ...prev,
      projects: (prev.projects || []).filter((p) => p.id !== id)
    }));
  };

  const addCertification = () => {
    setResumeData((prev) => ({
      ...prev,
      certifications: [
        ...(prev.certifications || []),
        {
          id: `cert-${Date.now()}`,
          name: "Certification Name",
          issuer: "Issuing Organization",
          issueDate: "2025"
        }
      ]
    }));
  };

  const updateCertification = (id, field, val) => {
    setResumeData((prev) => ({
      ...prev,
      certifications: (prev.certifications || []).map((c) => (c.id === id ? { ...c, [field]: val } : c))
    }));
  };

  const removeCertification = (id) => {
    setResumeData((prev) => ({
      ...prev,
      certifications: (prev.certifications || []).filter((c) => c.id !== id)
    }));
  };

  const addSkill = (skillText) => {
    if (!skillText.trim()) return;
    setResumeData((prev) => ({
      ...prev,
      skills: [...new Set([...prev.skills, skillText.trim()])]
    }));
    setNewSkillInput("");
  };

  const removeSkill = (skillText) => {
    setResumeData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillText)
    }));
  };

  // Append a power action verb to experience
  const insertActionVerb = (expId, verb) => {
    const exp = resumeData.experience.find((e) => e.id === expId);
    if (!exp) return;
    const current = exp.description ? `${exp.description}\n` : "";
    updateExperience(expId, "description", `${current}${verb} `);
  };

  return (
    <div className="builder-view-container">
      {/* 1. TOP HEADER & WORKSPACE TOOLBAR */}
      <div className="builder-top-bar">
        <div className="builder-header-left">
          <button
            type="button"
            className="btn-back-nav"
            onClick={onBackToDashboard}
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>

          {/* Editable Resume Title */}
          <div className="resume-version-input-wrap">
            <input
              type="text"
              className="resume-title-input"
              value={resumeData.versionName || "My Resume"}
              onChange={(e) => setResumeData((p) => ({ ...p, versionName: e.target.value }))}
              title="Click to rename resume version"
            />
          </div>

          {/* Drafts Manager Dropdown */}
          <div className="drafts-dropdown-wrap" style={{ position: "relative" }}>
            <button
              type="button"
              className="btn-drafts-selector"
              onClick={() => setShowDraftsMenu(!showDraftsMenu)}
            >
              <Layers size={14} />
              <span>Versions ({savedResumes.length})</span>
              <ChevronDown size={14} />
            </button>

            {showDraftsMenu && (
              <div className="drafts-menu-popover">
                <div className="drafts-menu-header">
                  <span>Saved Resume Versions</span>
                  <button type="button" className="btn-add-version-mini" onClick={handleCreateNewVersion}>
                    + New
                  </button>
                </div>
                <div className="drafts-list">
                  {savedResumes.map((d) => (
                    <div
                      key={d.id}
                      className={`draft-menu-item ${d.id === resumeData.id ? "active" : ""}`}
                      onClick={() => handleSelectDraft(d)}
                    >
                      <div className="draft-name">{d.versionName || "Untitled"}</div>
                      <div className="draft-date">{new Date(d.updatedAt || Date.now()).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Action Cluster */}
        <div className="builder-header-right" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Template Style Switcher */}
          <div className="template-style-selector">
            <select
              value={templateStyle}
              onChange={(e) => setTemplateStyle(e.target.value)}
              className="template-select-input"
              title="Select ATS Template Style"
            >
              <option value="classic">ATS Classic (Times)</option>
              <option value="professional">ATS Professional (Sans)</option>
              <option value="modern">Modern ATS (Indigo)</option>
              <option value="minimal">Minimalist Technical</option>
            </select>
          </div>

          {/* Save Draft Button */}
          <button
            type="button"
            className={`btn-save-draft ${saveSuccess ? "saved" : ""}`}
            onClick={handleSave}
          >
            {saveSuccess ? <Check size={15} /> : <Save size={15} />}
            <span>{saveSuccess ? "Saved ✓" : "Save Draft"}</span>
          </button>

          {/* Export DOCX (Word) */}
          <button
            type="button"
            className="btn-export-secondary"
            onClick={handleExportDOCX}
            disabled={isExportingDocx}
            title="Download editable Microsoft Word (.docx) file"
          >
            <FileDown size={15} />
            <span>{isExportingDocx ? "Generating..." : "Export DOCX"}</span>
          </button>

          {/* Export PDF */}
          <button
            type="button"
            className="btn-export-pdf"
            onClick={handleExportPDF}
            disabled={isExportingPdf}
            title="Download ATS-compliant print PDF"
          >
            <Download size={15} />
            <span>{isExportingPdf ? "Exporting..." : "Export PDF"}</span>
          </button>
        </div>
      </div>

      {/* 2. THREE SEAMLESS PATHWAY SWITCHERS */}
      <div className="pathway-sub-bar">
        <div className="pathway-sub-pills">
          <button
            type="button"
            className={`path-pill ${creationPath === "linkedin" ? "active" : ""}`}
            onClick={() => setCreationPath(creationPath === "linkedin" ? "form" : "linkedin")}
          >
            <LinkedInIcon size={14} />
            <span>Import LinkedIn PDF / Profile</span>
          </button>

          <label className={`path-pill ${creationPath === "upload" ? "active" : ""}`}>
            <Upload size={14} />
            <span>Upload Existing Resume (PDF / DOCX)</span>
            <input
              type="file"
              accept=".pdf,.docx,.txt"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
          </label>

          <button
            type="button"
            className={`path-pill ${creationPath === "form" ? "active" : ""}`}
            onClick={() => setCreationPath("form")}
          >
            <FileText size={14} />
            <span>Step-by-Step Editor</span>
          </button>
        </div>

        {/* Target JD Tailoring Trigger */}
        <button
          type="button"
          className={`btn-jd-toggle ${showJdPanel ? "active" : ""}`}
          onClick={() => setShowJdPanel(!showJdPanel)}
        >
          <Target size={14} />
          <span>{showJdPanel ? "Hide Target Job Description" : "Target Job Description (AI Tailoring)"}</span>
          {showJdPanel ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* 3. TARGET JOB DESCRIPTION PERSONALIZATION PANEL */}
      {showJdPanel && (
        <div className="jd-tailor-panel">
          <div className="jd-panel-header">
            <div>
              <div className="jd-panel-title">
                <Target size={18} className="text-signal-blue" />
                <span>Job Description Keyword Alignment</span>
              </div>
              <p className="jd-panel-desc">
                Paste your target job description. The AI extracts role competencies and tailor-ranks your real experience with 100% factual integrity.
              </p>
            </div>
            <button
              type="button"
              className="btn-primary-action btn-sm"
              onClick={handleTailorWithJD}
              disabled={isTailoring || !jobDescription.trim()}
            >
              <Sparkles size={14} />
              <span>{isTailoring ? "Tailoring Content..." : "Tailor Resume with AI"}</span>
            </button>
          </div>

          <textarea
            className="jd-textarea"
            rows={4}
            placeholder="Paste target job description (responsibilities, required qualifications, tech stack)..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
          />

          {/* Progressive Loader */}
          {isTailoring && (
            <div className="tailoring-loader-box">
              <RefreshCw size={16} className="spin-icon" />
              <span>{tailorStepText}</span>
            </div>
          )}

          {/* Extracted JD Analysis Display */}
          {jdAnalysis && !isTailoring && (
            <div className="jd-analysis-summary">
              <div className="analysis-badge-row">
                <span className="role-tag">Target: {jdAnalysis.roleTitle}</span>
                <span className="kw-count-tag">{jdAnalysis.keywords.length} Target Keywords Found</span>
              </div>
              <div className="jd-keywords-cloud">
                {jdAnalysis.keywords.map((kw) => (
                  <span key={kw} className="jd-kw-chip">✓ {kw}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. LINKEDIN IMPORT DRAWER */}
      {creationPath === "linkedin" && (
        <div className="builder-import-panel">
          <div className="import-panel-inner">
            <div className="import-icon-wrap linkedin">
              <LinkedInIcon size={24} />
            </div>
            <h3>Import from LinkedIn</h3>
            <p>
              Paste your exported LinkedIn profile text or PDF content below to extract your experience, skills, and education.
            </p>
            <textarea
              className="import-textarea"
              rows={5}
              placeholder="Paste LinkedIn profile export text here (Name, Headline, Experience, Education, Skills)..."
              value={linkedinInput}
              onChange={(e) => setLinkedinInput(e.target.value)}
            />
            <div className="import-actions">
              <button
                type="button"
                className="btn-primary-action"
                onClick={handleLinkedInSubmit}
                disabled={parsingLoading || !linkedinInput.trim()}
              >
                {parsingLoading ? "Parsing Profile..." : "Extract & Populate Resume"}
              </button>
              <button
                type="button"
                className="btn-secondary-action"
                onClick={() => setCreationPath("form")}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MAIN SPLIT-SCREEN WORKSPACE */}
      <div className="builder-split-workspace">
        {/* Left Side: Form Editor Navigation & Input Controls */}
        <div className="builder-form-pane">
          {/* Section Navigation Tabs */}
          <div className="builder-section-tabs">
            {[
              { id: "personal", label: "Personal Info", icon: Briefcase },
              { id: "experience", label: "Experience", count: resumeData.experience.length },
              { id: "education", label: "Education", count: resumeData.education.length },
              { id: "skills", label: "Skills", count: resumeData.skills.length },
              { id: "projects", label: "Projects", count: (resumeData.projects || []).length },
              { id: "certifications", label: "Certifications", count: (resumeData.certifications || []).length }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && <span className="tab-count">{tab.count}</span>}
              </button>
            ))}
          </div>

          <div className="builder-form-body">
            {/* TAB 1: PERSONAL DETAILS */}
            {activeTab === "personal" && (
              <div className="form-section-block">
                <h3 className="form-block-title">Personal & Contact Details</h3>
                <div className="input-grid-2">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={resumeData.personal.fullName}
                      onChange={(e) => updatePersonal("fullName", e.target.value)}
                      placeholder="e.g. Jane Doe"
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={resumeData.personal.email}
                      onChange={(e) => updatePersonal("email", e.target.value)}
                      placeholder="jane.doe@example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      value={resumeData.personal.phone}
                      onChange={(e) => updatePersonal("phone", e.target.value)}
                      placeholder="+1 (555) 000-0000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Location (City, State / Country)</label>
                    <input
                      type="text"
                      value={resumeData.personal.location}
                      onChange={(e) => updatePersonal("location", e.target.value)}
                      placeholder="San Francisco, CA"
                    />
                  </div>
                  <div className="form-group">
                    <label>LinkedIn Profile URL</label>
                    <input
                      type="text"
                      value={resumeData.personal.linkedin}
                      onChange={(e) => updatePersonal("linkedin", e.target.value)}
                      placeholder="linkedin.com/in/username"
                    />
                  </div>
                  <div className="form-group">
                    <label>GitHub Profile / Portfolio</label>
                    <input
                      type="text"
                      value={resumeData.personal.github}
                      onChange={(e) => updatePersonal("github", e.target.value)}
                      placeholder="github.com/username"
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "16px" }}>
                  <label>Professional Summary</label>
                  <textarea
                    rows={4}
                    value={resumeData.personal.summary}
                    onChange={(e) => updatePersonal("summary", e.target.value)}
                    placeholder="Concise 2-3 sentence overview highlighting your engineering specialization and key achievements..."
                  />
                </div>
              </div>
            )}

            {/* TAB 2: WORK EXPERIENCE */}
            {activeTab === "experience" && (
              <div className="form-section-block">
                <div className="section-header-flex">
                  <h3 className="form-block-title">Work & Internship Experience</h3>
                  <button type="button" className="btn-add-item" onClick={addExperience}>
                    <Plus size={14} />
                    <span>Add Experience</span>
                  </button>
                </div>

                {resumeData.experience.map((exp, idx) => (
                  <div key={exp.id} className="card-item-editor">
                    <div className="card-item-head">
                      <span className="item-index-badge">#{idx + 1}</span>
                      <input
                        type="text"
                        className="item-title-input"
                        value={exp.role}
                        onChange={(e) => updateExperience(exp.id, "role", e.target.value)}
                        placeholder="Job Title"
                      />
                      <button
                        type="button"
                        className="btn-delete-item"
                        onClick={() => removeExperience(exp.id)}
                        title="Delete Role"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="input-grid-2">
                      <div className="form-group">
                        <label>Company / Organization</label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
                          placeholder="e.g. Acme Corp"
                        />
                      </div>
                      <div className="form-group">
                        <label>Location</label>
                        <input
                          type="text"
                          value={exp.location}
                          onChange={(e) => updateExperience(exp.id, "location", e.target.value)}
                          placeholder="City, State (or Remote)"
                        />
                      </div>
                      <div className="form-group">
                        <label>Start Date</label>
                        <input
                          type="text"
                          value={exp.startDate}
                          onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)}
                          placeholder="e.g. Jun 2024"
                        />
                      </div>
                      <div className="form-group">
                        <label>End Date</label>
                        <input
                          type="text"
                          value={exp.endDate}
                          onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)}
                          placeholder="e.g. Present"
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: "12px" }}>
                      <div className="label-with-hint">
                        <label>Bullet Points & Achievements</label>
                        <span className="hint-text">1 bullet per line</span>
                      </div>
                      <textarea
                        rows={4}
                        value={exp.description}
                        onChange={(e) => updateExperience(exp.id, "description", e.target.value)}
                        placeholder="• Engineered REST API endpoints in Node.js, reducing query latency by 34%..."
                      />
                      {/* Action Verb Helper Bar */}
                      <div className="action-verbs-bar">
                        <span className="verbs-label">Insert Power Verb:</span>
                        {POWER_ACTION_VERBS.slice(0, 6).map((verb) => (
                          <button
                            key={verb}
                            type="button"
                            className="verb-chip-btn"
                            onClick={() => insertActionVerb(exp.id, verb)}
                          >
                            +{verb}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: EDUCATION */}
            {activeTab === "education" && (
              <div className="form-section-block">
                <div className="section-header-flex">
                  <h3 className="form-block-title">Education & Academics</h3>
                  <button type="button" className="btn-add-item" onClick={addEducation}>
                    <Plus size={14} />
                    <span>Add Degree</span>
                  </button>
                </div>

                {resumeData.education.map((edu, idx) => (
                  <div key={edu.id} className="card-item-editor">
                    <div className="card-item-head">
                      <span className="item-index-badge">#{idx + 1}</span>
                      <input
                        type="text"
                        className="item-title-input"
                        value={edu.school}
                        onChange={(e) => updateEducation(edu.id, "school", e.target.value)}
                        placeholder="School or University Name"
                      />
                      <button
                        type="button"
                        className="btn-delete-item"
                        onClick={() => removeEducation(edu.id)}
                        title="Delete Degree"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="input-grid-2">
                      <div className="form-group">
                        <label>Degree</label>
                        <input
                          type="text"
                          value={edu.degree}
                          onChange={(e) => updateEducation(edu.id, "degree", e.target.value)}
                          placeholder="e.g. Bachelor of Science"
                        />
                      </div>
                      <div className="form-group">
                        <label>Major / Field of Study</label>
                        <input
                          type="text"
                          value={edu.field}
                          onChange={(e) => updateEducation(edu.id, "field", e.target.value)}
                          placeholder="e.g. Computer Science"
                        />
                      </div>
                      <div className="form-group">
                        <label>Dates Attended / Graduation Year</label>
                        <input
                          type="text"
                          value={`${edu.startDate} – ${edu.endDate}`}
                          onChange={(e) => {
                            const [start, end] = e.target.value.split("–").map(s => s.trim());
                            updateEducation(edu.id, "startDate", start || edu.startDate);
                            if (end) updateEducation(edu.id, "endDate", end);
                          }}
                          placeholder="e.g. 2022 – 2026"
                        />
                      </div>
                      <div className="form-group">
                        <label>GPA (Optional)</label>
                        <input
                          type="text"
                          value={edu.gpa}
                          onChange={(e) => updateEducation(edu.id, "gpa", e.target.value)}
                          placeholder="e.g. 3.9 / 4.0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 4: TECHNICAL SKILLS */}
            {activeTab === "skills" && (
              <div className="form-section-block">
                <h3 className="form-block-title">Skills & Technical Competencies</h3>
                <div className="skill-input-row">
                  <input
                    type="text"
                    placeholder="Type skill name (e.g. React, Docker, Python) and press Enter..."
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill(newSkillInput);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn-primary-action btn-sm"
                    onClick={() => addSkill(newSkillInput)}
                  >
                    Add
                  </button>
                </div>

                {/* Popular Quick Suggestions */}
                <div className="quick-suggestions-row">
                  <span className="sugg-label">Quick Add:</span>
                  {["TypeScript", "PostgreSQL", "Docker", "AWS", "Git", "REST APIs", "Python", "GraphQL"]
                    .filter((s) => !resumeData.skills.includes(s))
                    .slice(0, 5)
                    .map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="quick-sugg-chip"
                        onClick={() => addSkill(s)}
                      >
                        +{s}
                      </button>
                    ))}
                </div>

                {/* Skill Chips */}
                <div className="skills-chips-cloud">
                  {resumeData.skills.map((skill) => (
                    <span key={skill} className="skill-removable-chip">
                      <span>{skill}</span>
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        aria-label={`Remove ${skill}`}
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 5: PROJECTS */}
            {activeTab === "projects" && (
              <div className="form-section-block">
                <div className="section-header-flex">
                  <h3 className="form-block-title">Featured Projects</h3>
                  <button type="button" className="btn-add-item" onClick={addProject}>
                    <Plus size={14} />
                    <span>Add Project</span>
                  </button>
                </div>

                {(resumeData.projects || []).map((proj, idx) => (
                  <div key={proj.id} className="card-item-editor">
                    <div className="card-item-head">
                      <span className="item-index-badge">#{idx + 1}</span>
                      <input
                        type="text"
                        className="item-title-input"
                        value={proj.title}
                        onChange={(e) => updateProject(proj.id, "title", e.target.value)}
                        placeholder="Project Name"
                      />
                      <button
                        type="button"
                        className="btn-delete-item"
                        onClick={() => removeProject(proj.id)}
                        title="Delete Project"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="input-grid-2">
                      <div className="form-group">
                        <label>Technologies Used</label>
                        <input
                          type="text"
                          value={proj.techStack}
                          onChange={(e) => updateProject(proj.id, "techStack", e.target.value)}
                          placeholder="e.g. React, Node.js, Docker"
                        />
                      </div>
                      <div className="form-group">
                        <label>Project Link / Repository</label>
                        <input
                          type="text"
                          value={proj.link || ""}
                          onChange={(e) => updateProject(proj.id, "link", e.target.value)}
                          placeholder="github.com/user/project"
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: "10px" }}>
                      <label>Project Description & Outcomes</label>
                      <textarea
                        rows={3}
                        value={proj.description}
                        onChange={(e) => updateProject(proj.id, "description", e.target.value)}
                        placeholder="Describe key problem solved, system scale, and quantitative results achieved..."
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* TAB 6: CERTIFICATIONS */}
            {activeTab === "certifications" && (
              <div className="form-section-block">
                <div className="section-header-flex">
                  <h3 className="form-block-title">Certifications & Honors</h3>
                  <button type="button" className="btn-add-item" onClick={addCertification}>
                    <Plus size={14} />
                    <span>Add Certification</span>
                  </button>
                </div>

                {(resumeData.certifications || []).map((cert, idx) => (
                  <div key={cert.id} className="card-item-editor">
                    <div className="card-item-head">
                      <span className="item-index-badge">#{idx + 1}</span>
                      <input
                        type="text"
                        className="item-title-input"
                        value={cert.name}
                        onChange={(e) => updateCertification(cert.id, "name", e.target.value)}
                        placeholder="Certification Title"
                      />
                      <button
                        type="button"
                        className="btn-delete-item"
                        onClick={() => removeCertification(cert.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="input-grid-2">
                      <div className="form-group">
                        <label>Issuing Organization</label>
                        <input
                          type="text"
                          value={cert.issuer}
                          onChange={(e) => updateCertification(cert.id, "issuer", e.target.value)}
                          placeholder="e.g. AWS, Coursera, Google"
                        />
                      </div>
                      <div className="form-group">
                        <label>Issue Date / Year</label>
                        <input
                          type="text"
                          value={cert.issueDate}
                          onChange={(e) => updateCertification(cert.id, "issueDate", e.target.value)}
                          placeholder="e.g. 2025"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Real-Time Live ATS Preview Document */}
        <div className="builder-preview-pane">
          <div className="preview-pane-header">
            <div className="preview-header-left">
              <Eye size={14} className="text-signal-blue" />
              <span className="preview-label">LIVE ATS PREVIEW</span>
              <span className="template-style-badge">
                {templateStyle === "classic" && "Classic ATS"}
                {templateStyle === "professional" && "Professional Sans"}
                {templateStyle === "modern" && "Modern Accent"}
                {templateStyle === "minimal" && "Minimalist"}
              </span>
            </div>
            <span className="page-count-tag">1 Page (Standard ATS)</span>
          </div>

          <div className="preview-paper-wrapper">
            <div
              className={`resume-sheet-document template-${templateStyle}`}
              ref={previewRef}
            >
              {/* Header */}
              <div className="resume-doc-header">
                <h1 className="doc-full-name">{resumeData.personal.fullName || "Candidate Name"}</h1>
                <div className="doc-contact-line">
                  {[
                    resumeData.personal.email,
                    resumeData.personal.phone,
                    resumeData.personal.location
                  ].filter(Boolean).join(" • ")}
                </div>
                <div className="doc-links-line">
                  {[
                    resumeData.personal.linkedin,
                    resumeData.personal.github,
                    resumeData.personal.portfolio
                  ].filter(Boolean).join(" • ")}
                </div>
              </div>

              {/* Summary */}
              {resumeData.personal.summary && (
                <div className="doc-section">
                  <div className="doc-section-heading">PROFESSIONAL SUMMARY</div>
                  <p className="doc-summary-text">{resumeData.personal.summary}</p>
                </div>
              )}

              {/* Experience */}
              {resumeData.experience?.length > 0 && (
                <div className="doc-section">
                  <div className="doc-section-heading">WORK EXPERIENCE</div>
                  {resumeData.experience.map((exp) => (
                    <div key={exp.id} className="doc-item-entry">
                      <div className="doc-item-top">
                        <span className="doc-item-title">{exp.role}</span>
                        <span className="doc-item-date">{exp.startDate} – {exp.endDate}</span>
                      </div>
                      <div className="doc-item-sub">
                        <span className="doc-item-company">{exp.company}</span>
                        {exp.location && <span className="doc-item-loc">{exp.location}</span>}
                      </div>
                      <ul className="doc-bullet-list">
                        {exp.description.split("\n").filter(Boolean).map((bullet, idx) => (
                          <li key={idx}>{bullet.replace(/^[•\-*]\s*/, "")}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}

              {/* Education */}
              {resumeData.education?.length > 0 && (
                <div className="doc-section">
                  <div className="doc-section-heading">EDUCATION</div>
                  {resumeData.education.map((edu) => (
                    <div key={edu.id} className="doc-item-entry">
                      <div className="doc-item-top">
                        <span className="doc-item-title">{edu.school}</span>
                        <span className="doc-item-date">{edu.startDate} – {edu.endDate}</span>
                      </div>
                      <div className="doc-item-sub">
                        <span>{edu.degree} in {edu.field}</span>
                        {edu.gpa && <span>GPA: {edu.gpa}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Technical Skills */}
              {resumeData.skills?.length > 0 && (
                <div className="doc-section">
                  <div className="doc-section-heading">TECHNICAL SKILLS</div>
                  <div className="doc-skills-inline">
                    <strong>Core Competencies: </strong>
                    {resumeData.skills.join(" • ")}
                  </div>
                </div>
              )}

              {/* Projects */}
              {resumeData.projects?.length > 0 && (
                <div className="doc-section">
                  <div className="doc-section-heading">PROJECTS</div>
                  {resumeData.projects.map((proj) => (
                    <div key={proj.id} className="doc-item-entry">
                      <div className="doc-item-top">
                        <span className="doc-item-title">{proj.title}</span>
                        {proj.techStack && <span className="doc-item-date">{proj.techStack}</span>}
                      </div>
                      {proj.link && <div className="doc-item-link">{proj.link}</div>}
                      <p className="doc-proj-desc">{proj.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Certifications */}
              {resumeData.certifications?.length > 0 && (
                <div className="doc-section">
                  <div className="doc-section-heading">CERTIFICATIONS</div>
                  {resumeData.certifications.map((cert) => (
                    <div key={cert.id} className="doc-item-entry doc-cert-row">
                      <span className="doc-item-title">{cert.name}</span>
                      <span className="doc-item-date">{cert.issuer} ({cert.issueDate})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
