import React, { useState, useEffect } from "react";
import {
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  Plus,
  Upload,
  Copy,
  Trash2,
  Edit3,
  Search,
  PenTool,
  Wand2,
  Bot
} from "lucide-react";
import { resumeApi } from "../api/api";
import { getSavedResumes, deleteResumeDraft, saveResumeDraft } from "../services/aiEngine";

export default function DashboardView({
  currentUser,
  setActiveView,
  onLaunchBuilder
}) {
  const [savedResumes, setSavedResumes] = useState([]);
  const [backendLive, setBackendLive] = useState(null);
  const [resumeSearch, setResumeSearch] = useState("");
  const [actionNotice, setActionNotice] = useState("");

  useEffect(() => {
    loadResumes();
    resumeApi.health().then(() => setBackendLive(true)).catch(() => setBackendLive(false));
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
    if (window.confirm(`Delete "${name || 'this resume'}"?`)) {
      deleteResumeDraft(id);
      loadResumes();
      showNotice("Resume draft deleted.");
    }
  };

  const filteredResumes = savedResumes.filter((r) => {
    const title = (r.versionName || r.personal?.fullName || "").toLowerCase();
    const query = resumeSearch.toLowerCase();
    return title.includes(query);
  });

  const userName =
    currentUser?.displayName?.split(" ")[0] ||
    currentUser?.email?.split("@")[0] ||
    "there";

  const hasResume = savedResumes.length > 0;
  const totalDrafts = savedResumes.length;
  const latestUpdated = savedResumes[0]?.updatedAt
    ? new Date(savedResumes[0].updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <div className="pro-dashboard-container">
      {actionNotice && (
        <div className="pro-dashboard-toast">
          <CheckCircle2 size={15} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Welcome banner */}
      <section className="pro-welcome-banner">
        <div>
          <h1 className="pro-greeting-title">
            Welcome back, <span className="highlight-name">{userName}</span>
          </h1>
          <p className="pro-greeting-subtitle">
            Build, analyze, and optimize ATS-ready resumes in one workspace.
          </p>
        </div>
        <div className="pro-command-actions">
          <button type="button" className="pro-btn-primary" onClick={() => handleCreateNew("upload")}>
            <Upload size={16} />
            Upload Resume
          </button>
          <button type="button" className="pro-btn-secondary" onClick={() => handleCreateNew("form", "classic")}>
            <Plus size={16} />
            Create New
          </button>
        </div>
      </section>

      {/* Quick metrics */}
      <section className="pro-metrics-grid">
        <div className="pro-metric-card">
          <div className="pro-metric-icon blue"><FileText size={18} /></div>
          <div className="pro-metric-body">
            <div className="pro-metric-value">{totalDrafts}</div>
            <div className="pro-metric-label">Saved Resumes</div>
          </div>
          <div className="pro-metric-footer">
            {latestUpdated ? `Last edited ${latestUpdated}` : "No drafts yet"}
          </div>
        </div>

        <div className="pro-metric-card">
          <div className="pro-metric-icon emerald"><CheckCircle2 size={18} /></div>
          <div className="pro-metric-body">
            <div className="pro-metric-value-sub">{backendLive ? "Online" : "Checking"}</div>
            <div className="pro-metric-label">AI Engine</div>
          </div>
          <div className="pro-metric-footer">
            {backendLive ? "Ready to generate" : "Connecting to service"}
          </div>
        </div>

        <div className="pro-metric-card">
          <div className="pro-metric-icon indigo"><Wand2 size={18} /></div>
          <div className="pro-metric-body">
            <div className="pro-metric-value-sub">ATS</div>
            <div className="pro-metric-label">Compatibility Mode</div>
          </div>
          <div className="pro-metric-footer">Single-column validated</div>
        </div>

        <div className="pro-metric-card">
          <div className="pro-metric-icon violet"><Bot size={18} /></div>
          <div className="pro-metric-body">
            <div className="pro-metric-value-sub">Unlimited</div>
            <div className="pro-metric-label">AI Generations</div>
          </div>
          <div className="pro-metric-footer">Gemini powered</div>
        </div>
      </section>

      {/* Quick actions */}
      <section className="pro-section-block">
        <div className="pro-section-header">
          <div>
            <span className="pro-section-eyebrow">START HERE</span>
            <h2 className="pro-section-title">Career Tools</h2>
          </div>
        </div>

        <div className="pro-tools-grid">
          <button type="button" className="pro-tool-card" onClick={() => handleCreateNew("form", "classic")}>
            <div className="pro-tool-icon blue"><PenTool size={20} /></div>
            <div className="pro-tool-body">
              <span className="pro-tool-title">Resume Builder</span>
              <span className="pro-tool-desc">Build section by section with live preview.</span>
            </div>
            <ArrowRight size={16} className="pro-tool-arrow" />
          </button>

          <button type="button" className="pro-tool-card" onClick={() => setActiveView("analyzer")}>
            <div className="pro-tool-icon emerald"><Sparkles size={20} /></div>
            <div className="pro-tool-body">
              <span className="pro-tool-title">AI Resume Analyzer</span>
              <span className="pro-tool-desc">See how your resume matches a target role.</span>
            </div>
            <ArrowRight size={16} className="pro-tool-arrow" />
          </button>

          <button type="button" className="pro-tool-card" onClick={() => setActiveView("ats-checker")}>
            <div className="pro-tool-icon indigo"><CheckCircle2 size={20} /></div>
            <div className="pro-tool-body">
              <span className="pro-tool-title">ATS Scanner</span>
              <span className="pro-tool-desc">Check parser compatibility and readability.</span>
            </div>
            <ArrowRight size={16} className="pro-tool-arrow" />
          </button>

          <button type="button" className="pro-tool-card" onClick={() => setActiveView("optimizer")}>
            <div className="pro-tool-icon violet"><Wand2 size={20} /></div>
            <div className="pro-tool-body">
              <span className="pro-tool-title">AI Resume Optimizer</span>
              <span className="pro-tool-desc">Tailor content toward a job description.</span>
            </div>
            <ArrowRight size={16} className="pro-tool-arrow" />
          </button>
        </div>
      </section>

      {/* My Resumes */}
      <section className="pro-section-block">
        <div className="pro-section-header between">
          <div>
            <span className="pro-section-eyebrow">DOCUMENTS</span>
            <h2 className="pro-section-title">My Resumes</h2>
          </div>
          <div className="pro-search-bar-wrap">
            <Search size={14} />
            <input
              type="text"
              placeholder="Search resumes..."
              value={resumeSearch}
              onChange={(e) => setResumeSearch(e.target.value)}
              className="pro-search-input"
            />
          </div>
        </div>

        {filteredResumes.length === 0 ? (
          <div className="pro-empty-resumes-box">
            <FileText size={34} className="empty-icon" />
            <h3>{hasResume ? "No matching resumes" : "No resumes yet"}</h3>
            <p>
              {hasResume
                ? "Try a different search term."
                : "Create your first resume to get started."}
            </p>
            <button type="button" className="pro-btn-primary" onClick={() => handleCreateNew("form")}>
              <Plus size={14} />
              Create First Resume
            </button>
          </div>
        ) : (
          <div className="pro-resumes-list">
            {filteredResumes.map((resume) => {
              const editDate = resume.updatedAt
                ? new Date(resume.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                : "Recently";
              return (
                <div key={resume.id} className="pro-resume-row">
                  <div className="pro-resume-row-main">
                    <div className="resume-row-icon">
                      <FileText size={17} />
                    </div>
                    <div className="resume-row-info">
                      <div className="resume-row-title">
                        {resume.versionName || "Untitled Resume"}
                      </div>
                      <div className="resume-row-sub">
                        {resume.personal?.fullName || resume.personal?.email || "Candidate"}
                        <span className="resume-row-date"><Clock size={11} /> {editDate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="pro-resume-row-actions">
                    <span className="pro-tag-pill template">
                      {(resume.templateStyle || "classic").toUpperCase()}
                    </span>
                    <button className="pro-row-btn edit" onClick={() => handleEditResume(resume)}>
                      <Edit3 size={13} /> Edit
                    </button>
                    <button
                      className="pro-row-btn icon-only"
                      onClick={() => handleDuplicateResume(resume)}
                      title="Duplicate"
                    >
                      <Copy size={13} />
                    </button>
                    <button
                      className="pro-row-btn icon-only delete"
                      onClick={() => handleDeleteResume(resume.id, resume.versionName)}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}