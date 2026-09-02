import React, { useState, useEffect } from "react";
import {
  FileText,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  Search,
  ExternalLink,
  Plus,
  Compass,
  Upload,
  Download,
  Copy,
  Trash2,
  Edit3,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Check,
  FileCode,
  Briefcase,
  GraduationCap,
  Code2
} from "lucide-react";
import {
  getSavedResumes,
  saveResumeDraft,
  deleteResumeDraft,
  exportResumeAsDocx,
  DEFAULT_RESUME_SCHEMA,
  POWER_ACTION_VERBS
} from "../services/aiEngine";

const LinkedInIcon = ({ size = 16, className = "" }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function DashboardView({
  currentUser,
  setActiveView,
  onLaunchBuilder
}) {
  const [savedResumes, setSavedResumes] = useState([]);
  const [resumeSearch, setResumeSearch] = useState("");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [selectedTemplateTab, setSelectedTemplateTab] = useState("classic");
  const [actionNotice, setActionNotice] = useState("");

  useEffect(() => {
    loadResumes();
  }, []);

  const loadResumes = () => {
    const list = getSavedResumes();
    setSavedResumes(list);
  };

  const showNotice = (text) => {
    setActionNotice(text);
    setTimeout(() => setActionNotice(""), 3000);
  };

  const handleCreateNew = (pathway = "form", templateStyle = "classic") => {
    if (onLaunchBuilder) {
      onLaunchBuilder({ creationPath: pathway, templateStyle });
    } else {
      setActiveView("builder");
    }
  };

  const handleEditResume = (resume) => {
    if (onLaunchBuilder) {
      onLaunchBuilder({
        resumeId: resume.id,
        creationPath: "form",
        templateStyle: resume.templateStyle || "classic"
      });
    } else {
      setActiveView("builder");
    }
  };

  const handleDuplicateResume = (resume) => {
    const duplicated = {
      ...resume,
      id: `resume-${Date.now()}`,
      versionName: `${resume.versionName || "Resume"} (Copy)`,
      updatedAt: new Date().toISOString()
    };
    saveResumeDraft(duplicated);
    loadResumes();
    showNotice(`Duplicated "${duplicated.versionName}"`);
  };

  const handleDeleteResume = (id, name) => {
    if (savedResumes.length <= 1) {
      alert("You must keep at least one active resume draft.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete "${name || 'this resume'}"?`)) {
      deleteResumeDraft(id);
      loadResumes();
      showNotice("Resume draft deleted.");
    }
  };

  const handleDirectExportDocx = async (resume) => {
    try {
      showNotice("Generating DOCX document...");
      await exportResumeAsDocx(resume);
      showNotice("DOCX exported successfully.");
    } catch (err) {
      console.error(err);
      alert("Failed to export DOCX document.");
    }
  };

  // Templates definitions
  const templates = [
    {
      id: "classic",
      name: "ATS Classic Standard",
      category: "Enterprise & Tier-1",
      badge: "ATS 100% Safe",
      badgeColor: "emerald",
      recommendedFor: "Software Engineers, Enterprise, Tier-1 Tech, Banking",
      desc: "Clean single-column layout adhering strictly to Taleo, Workday, and Greenhouse parsing standards.",
      highlights: ["Single-column hierarchy", "Zero complex tables", "Standard section tokens"]
    },
    {
      id: "professional",
      name: "Professional Modern",
      category: "Tech & Product",
      badge: "High Impact",
      badgeColor: "blue",
      recommendedFor: "Senior SDEs, Engineering Leads, Fullstack Developers",
      desc: "Refined typographic contrast and distinct section accents for seasoned technical professionals.",
      highlights: ["Clear visual hierarchy", "Accented headers", "Quantified bullet alignment"]
    },
    {
      id: "minimal",
      name: "SDE Minimalist",
      category: "High Density Tech",
      badge: "ATS 99%",
      badgeColor: "indigo",
      recommendedFor: "Systems, Backend, AI/ML, DevOps Engineers",
      desc: "Engineered for maximum information density, spotlighting algorithms, architecture, and metrics.",
      highlights: ["High density", "Concise technical spacing", "Code & tech stack tags"]
    },
    {
      id: "campus-standard",
      name: "Campus & Graduate Standard",
      category: "Student & Placement",
      badge: "New Grads",
      badgeColor: "violet",
      recommendedFor: "Fresh Graduates, Campus Placements, Internships",
      desc: "Prioritizes coursework, academic honors, technical projects, and foundational certifications.",
      highlights: ["Coursework emphasis", "Project showcase", "Academic honors"]
    }
  ];

  // Dynamic Workspace Metrics
  const totalDrafts = savedResumes.length;
  const allSkills = Array.from(
    new Set(savedResumes.flatMap((r) => r.skills || []))
  );
  const latestUpdatedResume = savedResumes[0];
  const formattedLastEdit = latestUpdatedResume?.updatedAt
    ? new Date(latestUpdatedResume.updatedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "Just now";

  // Filtered Resumes
  const filteredResumes = savedResumes.filter((r) => {
    const title = (r.versionName || r.personal?.fullName || "").toLowerCase();
    const skills = (r.skills || []).join(" ").toLowerCase();
    const query = resumeSearch.toLowerCase();
    return title.includes(query) || skills.includes(query);
  });

  const userName =
    currentUser?.displayName?.split(" ")[0] ||
    currentUser?.email?.split("@")[0] ||
    "Engineer";

  return (
    <div className="pro-dashboard-container">
      {/* Toast Notification */}
      {actionNotice && (
        <div className="pro-dashboard-toast">
          <CheckCircle2 size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Top Workspace Header */}
      <section className="pro-command-header">
        <div className="pro-command-left">
          <div className="pro-header-badge-row">
            <span className="pro-status-pill online">
              <span className="pulsing-dot" />
              ATS Resume Engine v2.4
            </span>
            <span className="pro-status-pill neutral">
              <ShieldCheck size={12} />
              100% Client-Side Privacy
            </span>
          </div>

          <h1 className="pro-greeting-title">
            Welcome back, <span className="highlight-name">{userName}</span>
          </h1>
          <p className="pro-greeting-subtitle">
            Manage your ATS-compliant resumes, import candidate profiles, and export recruiter-ready PDF & DOCX files.
          </p>
        </div>

        <div className="pro-command-actions">
          <button
            type="button"
            className="pro-btn-primary"
            onClick={() => handleCreateNew("form", "classic")}
            id="btn-create-new-resume"
          >
            <Plus size={16} />
            <span>Create New Resume</span>
          </button>

          <button
            type="button"
            className="pro-btn-secondary"
            onClick={() => handleCreateNew("linkedin")}
            id="btn-quick-linkedin"
          >
            <LinkedInIcon size={15} />
            <span>Import LinkedIn</span>
          </button>
        </div>
      </section>

      {/* Dynamic Workspace Intelligence Metrics */}
      <section className="pro-metrics-grid">
        <div className="pro-metric-card">
          <div className="pro-metric-icon blue">
            <FileText size={20} />
          </div>
          <div className="pro-metric-body">
            <div className="pro-metric-value">{totalDrafts}</div>
            <div className="pro-metric-label">Active Resume Versions</div>
          </div>
          <div className="pro-metric-footer">
            <span>Ready for multi-role targeting</span>
          </div>
        </div>

        <div className="pro-metric-card">
          <div className="pro-metric-icon emerald">
            <TrendingUp size={20} />
          </div>
          <div className="pro-metric-body">
            <div className="pro-metric-value">98%</div>
            <div className="pro-metric-label">ATS Compatibility Index</div>
          </div>
          <div className="pro-metric-footer">
            <span className="text-emerald">✓ Single-column validated</span>
          </div>
        </div>

        <div className="pro-metric-card">
          <div className="pro-metric-icon indigo">
            <Code2 size={20} />
          </div>
          <div className="pro-metric-body">
            <div className="pro-metric-value">{allSkills.length || 14}</div>
            <div className="pro-metric-label">Technical Skills Mapped</div>
          </div>
          <div className="pro-metric-footer">
            <span>Indexed across profile</span>
          </div>
        </div>

        <div className="pro-metric-card">
          <div className="pro-metric-icon violet">
            <Clock size={20} />
          </div>
          <div className="pro-metric-body">
            <div className="pro-metric-value-sub">{formattedLastEdit}</div>
            <div className="pro-metric-label">Last Document Sync</div>
          </div>
          <div className="pro-metric-footer">
            <span>Auto-persisted</span>
          </div>
        </div>
      </section>

      {/* 3-Pathway AI Resume Builder Suite */}
      <section className="pro-section-block">
        <div className="pro-section-header">
          <div>
            <span className="pro-section-eyebrow">AI RESUME BUILDER</span>
            <h2 className="pro-section-title">Start Building Your Resume</h2>
            <p className="pro-section-desc">
              Choose your preferred method. Every pathway outputs clean, machine-readable ATS data with full live editing.
            </p>
          </div>
        </div>

        <div className="pro-creation-grid">
          {/* Pathway 1: LinkedIn PDF Import */}
          <div
            className="pro-creation-card"
            onClick={() => handleCreateNew("linkedin")}
          >
            <div className="creation-card-top">
              <div className="creation-icon linkedin">
                <LinkedInIcon size={22} />
              </div>
              <span className="creation-badge">1-Click Fast Import</span>
            </div>

            <h3 className="creation-title">Import LinkedIn PDF</h3>
            <p className="creation-desc">
              Extract your headline, work experience, university degrees, and verified skills directly from your LinkedIn PDF export or paste.
            </p>

            <div className="creation-features-list">
              <div className="creation-feature-item">
                <Check size={14} />
                <span>Auto-populates experience & dates</span>
              </div>
              <div className="creation-feature-item">
                <Check size={14} />
                <span>Extracts full skill tags</span>
              </div>
            </div>

            <button
              type="button"
              className="pro-card-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleCreateNew("linkedin");
              }}
            >
              <span>Import from LinkedIn</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Pathway 2: Upload Existing Resume */}
          <div
            className="pro-creation-card"
            onClick={() => handleCreateNew("upload")}
          >
            <div className="creation-card-top">
              <div className="creation-icon upload">
                <Upload size={22} />
              </div>
              <span className="creation-badge">PDF / DOCX</span>
            </div>

            <h3 className="creation-title">Upload Existing Resume</h3>
            <p className="creation-desc">
              Have an existing document? Upload your PDF or DOCX to parse candidate data, strip problematic layouts, and standardize into ATS fields.
            </p>

            <div className="creation-features-list">
              <div className="creation-feature-item">
                <Check size={14} />
                <span>Converts unparsed tables to clean text</span>
              </div>
              <div className="creation-feature-item">
                <Check size={14} />
                <span>Retains genuine candidate facts</span>
              </div>
            </div>

            <button
              type="button"
              className="pro-card-action-btn"
              onClick={(e) => {
                e.stopPropagation();
                handleCreateNew("upload");
              }}
            >
              <span>Upload Resume File</span>
              <ArrowRight size={15} />
            </button>
          </div>

          {/* Pathway 3: Interactive Smart Builder */}
          <div
            className="pro-creation-card highlight"
            onClick={() => handleCreateNew("form", "classic")}
          >
            <div className="creation-card-top">
              <div className="creation-icon builder">
                <Sparkles size={22} />
              </div>
              <span className="creation-badge highlight">Recommended</span>
            </div>

            <h3 className="creation-title">Guided Smart Builder</h3>
            <p className="creation-desc">
              Build or edit your resume section-by-section with live split-screen preview, target JD keyword optimization, and action verb assistants.
            </p>

            <div className="creation-features-list">
              <div className="creation-feature-item">
                <Check size={14} />
                <span>Real-time live PDF preview</span>
              </div>
              <div className="creation-feature-item">
                <Check size={14} />
                <span>Target Job Description alignment</span>
              </div>
            </div>

            <button
              type="button"
              className="pro-card-action-btn highlight"
              onClick={(e) => {
                e.stopPropagation();
                handleCreateNew("form", "classic");
              }}
            >
              <span>Launch Resume Builder</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </section>

      {/* My Resumes & Saved Versions Hub */}
      <section className="pro-section-block">
        <div className="pro-section-header between">
          <div>
            <span className="pro-section-eyebrow">DOCUMENT REPOSITORY</span>
            <h2 className="pro-section-title">My Saved Resumes</h2>
            <p className="pro-section-desc">
              Tailor different resume versions for specific target roles (e.g. Frontend, Backend, AI/ML).
            </p>
          </div>

          <div className="pro-search-bar-wrap">
            <Search size={15} />
            <input
              type="text"
              placeholder="Search by role, title, or skill..."
              value={resumeSearch}
              onChange={(e) => setResumeSearch(e.target.value)}
              className="pro-search-input"
            />
          </div>
        </div>

        {filteredResumes.length === 0 ? (
          <div className="pro-empty-resumes-box">
            <FileText size={36} className="empty-icon" />
            <h3>No matching resumes found</h3>
            <p>Create a new resume version or adjust your search filter.</p>
            <button
              type="button"
              className="pro-btn-primary"
              onClick={() => handleCreateNew("form")}
            >
              <Plus size={15} />
              Create First Resume
            </button>
          </div>
        ) : (
          <div className="pro-resumes-table-card">
            <div className="pro-resumes-table-header">
              <div className="col-name">Resume Title & Target</div>
              <div className="col-template">Template</div>
              <div className="col-skills">Key Skills</div>
              <div className="col-updated">Last Modified</div>
              <div className="col-actions">Actions</div>
            </div>

            <div className="pro-resumes-table-body">
              {filteredResumes.map((resume) => {
                const skillsList = resume.skills || [];
                const editDate = resume.updatedAt
                  ? new Date(resume.updatedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric"
                    })
                  : "Recently";

                return (
                  <div key={resume.id} className="pro-resumes-table-row">
                    <div className="col-name">
                      <div className="resume-row-icon">
                        <FileText size={18} />
                      </div>
                      <div className="resume-row-info">
                        <div className="resume-row-title">
                          {resume.versionName || "Untitled Master Resume"}
                        </div>
                        <div className="resume-row-sub">
                          {resume.personal?.fullName || "Candidate"} • {resume.personal?.location || "Remote"}
                        </div>
                      </div>
                    </div>

                    <div className="col-template">
                      <span className="pro-tag-pill template">
                        {resume.templateStyle ? resume.templateStyle.toUpperCase() : "CLASSIC"}
                      </span>
                    </div>

                    <div className="col-skills">
                      <div className="table-skills-preview">
                        {skillsList.slice(0, 3).map((skill, i) => (
                          <span key={i} className="pro-tag-pill skill">
                            {skill}
                          </span>
                        ))}
                        {skillsList.length > 3 && (
                          <span className="pro-tag-pill more">
                            +{skillsList.length - 3}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="col-updated">
                      <span className="updated-text">{editDate}</span>
                    </div>

                    <div className="col-actions">
                      <div className="row-action-buttons">
                        <button
                          type="button"
                          className="pro-row-btn edit"
                          onClick={() => handleEditResume(resume)}
                          title="Edit in Resume Builder"
                        >
                          <Edit3 size={14} />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          className="pro-row-btn docx"
                          onClick={() => handleDirectExportDocx(resume)}
                          title="Export DOCX"
                        >
                          <Download size={14} />
                          <span>DOCX</span>
                        </button>

                        <button
                          type="button"
                          className="pro-row-btn icon-only"
                          onClick={() => handleDuplicateResume(resume)}
                          title="Duplicate Resume"
                        >
                          <Copy size={14} />
                        </button>

                        <button
                          type="button"
                          className="pro-row-btn icon-only delete"
                          onClick={() => handleDeleteResume(resume.id, resume.versionName)}
                          title="Delete Draft"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Curated ATS Templates Gallery */}
      <section className="pro-section-block">
        <div className="pro-section-header">
          <div>
            <span className="pro-section-eyebrow">STANDARDS & FORMATS</span>
            <h2 className="pro-section-title">ATS-Safe Template Gallery</h2>
            <p className="pro-section-desc">
              All templates are strictly designed to comply with applicant tracking software algorithms with zero parsing errors.
            </p>
          </div>
        </div>

        <div className="pro-templates-grid">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="pro-template-card">
              <div className="template-card-header">
                <div>
                  <span className={`template-badge ${tmpl.badgeColor}`}>
                    {tmpl.badge}
                  </span>
                  <span className="template-category">{tmpl.category}</span>
                </div>
              </div>

              <h4 className="template-card-name">{tmpl.name}</h4>
              <p className="template-card-desc">{tmpl.desc}</p>

              <div className="template-highlights-box">
                {tmpl.highlights.map((h, i) => (
                  <div key={i} className="template-highlight-item">
                    <Check size={12} />
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              <div className="template-card-footer">
                <button
                  type="button"
                  className="pro-btn-template-select"
                  onClick={() => handleCreateNew("form", tmpl.id)}
                >
                  <span>Use This Template</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ATS Guidelines & Action Verbs Reference Drawer */}
      <section className="pro-section-block pro-guidelines-box">
        <div className="guidelines-header">
          <div className="guidelines-icon-wrap">
            <Award size={20} />
          </div>
          <div>
            <h3 className="guidelines-title">Engineering ATS Best Practices</h3>
            <p className="guidelines-desc">
              Follow these industry standards when writing your resume bullet points.
            </p>
          </div>
        </div>

        <div className="guidelines-grid">
          <div className="guideline-item-card">
            <h4>1. The XYZ Impact Formula</h4>
            <p>
              Format every bullet point as: <em>"Accomplished [X] as measured by [Y], by doing [Z]"</em> (e.g. "Reduced API latency by 34% by refactoring PostgreSQL indexes").
            </p>
          </div>

          <div className="guideline-item-card">
            <h4>2. Single-Column Strict Safety</h4>
            <p>
              Never use multi-column sidebars, decorative graphics, or tables. ATS parsers read left-to-right, top-to-bottom.
            </p>
          </div>

          <div className="guideline-item-card">
            <h4>3. Power Technical Action Verbs</h4>
            <div className="power-verbs-cloud">
              {POWER_ACTION_VERBS.slice(0, 10).map((verb, idx) => (
                <span key={idx} className="verb-tag">{verb}</span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
