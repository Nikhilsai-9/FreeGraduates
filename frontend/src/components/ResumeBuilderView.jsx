import React, { useState, useRef } from "react";
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
  RefreshCw
} from "lucide-react";
import html2pdf from "html2pdf.js";
import { parseLinkedInData, parseResumeDocument } from "../services/aiEngine";

const LinkedInIcon = ({ size = 16, className = "" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

export default function ResumeBuilderView({ onBackToDashboard }) {
  // Active Path: 'select' | 'linkedin' | 'upload' | 'form'
  const [creationPath, setCreationPath] = useState("form");
  const [activeTab, setActiveTab] = useState("personal"); // personal | experience | education | skills | projects
  const [isExporting, setIsExporting] = useState(false);
  const [linkedinInput, setLinkedinInput] = useState("");
  const [parsingLoading, setParsingLoading] = useState(false);

  const previewRef = useRef(null);

  // Resume Data State
  const [resumeData, setResumeData] = useState({
    personal: {
      fullName: "Nikhil Sai",
      email: "nikhil.sai@freegraduates.com",
      phone: "+1 (555) 432-8901",
      location: "San Francisco, CA",
      linkedin: "linkedin.com/in/nikhilsai",
      github: "github.com/nikhilsai",
      summary: "Software Engineer specializing in scalable fullstack web architectures, distributed systems, and modern React/Node.js ecosystems. Proven ability to optimize API throughput and design intuitive user interfaces."
    },
    experience: [
      {
        id: "exp-1",
        role: "Software Engineering Intern",
        company: "TechNova Cloud Systems",
        location: "Remote",
        startDate: "Jun 2025",
        endDate: "Aug 2025",
        description: "Engineered scalable REST APIs in Node.js and Go, reducing query latency by 34%.\nContainerized microservices using Docker and automated CI/CD pipelines via GitHub Actions.\nCollaborated with UI team to build accessible React dashboards serving 12,000+ daily active users."
      }
    ],
    education: [
      {
        id: "edu-1",
        school: "State University of Technology",
        degree: "Bachelor of Technology in Computer Science",
        field: "Software Engineering",
        startDate: "2022",
        endDate: "2026",
        gpa: "3.88 / 4.0"
      }
    ],
    skills: [
      "JavaScript", "TypeScript", "React.js", "Node.js", "Python",
      "Go", "PostgreSQL", "MongoDB", "Docker", "AWS", "Git", "REST APIs"
    ],
    projects: [
      {
        id: "proj-1",
        title: "FreeGraduates Career Platform",
        techStack: "React, Node.js, Express, MongoDB",
        description: "Architected an open-source career workspace featuring real-time ATS auditing, split-screen interactive diffing, and 1-click PDF resume exports."
      }
    ]
  });

  // Handle LinkedIn Import
  const handleLinkedInSubmit = async () => {
    if (!linkedinInput.trim()) return;
    try {
      setParsingLoading(true);
      const parsed = await parseLinkedInData(linkedinInput);
      setResumeData(parsed);
      setCreationPath("form");
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
    } finally {
      setParsingLoading(false);
    }
  };

  // PDF Export
  const handleExportPDF = () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    const opt = {
      margin: 8,
      filename: `${resumeData.personal.fullName.replace(/\s+/g, "_")}_Resume.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    html2pdf()
      .set(opt)
      .from(previewRef.current)
      .save()
      .then(() => setIsExporting(false))
      .catch(() => {
        window.print();
        setIsExporting(false);
      });
  };

  // Field updates
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
          company: "Company Name",
          location: "Location",
          startDate: "2024",
          endDate: "Present",
          description: "Describe key engineering achievements and quantifiable outcomes."
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

  const addSkill = (skillText) => {
    if (!skillText.trim()) return;
    setResumeData((prev) => ({
      ...prev,
      skills: [...new Set([...prev.skills, skillText.trim()])]
    }));
  };

  const removeSkill = (skillText) => {
    setResumeData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skillText)
    }));
  };

  return (
    <div className="builder-view-container">
      {/* Top Controls Bar */}
      <div className="builder-top-bar">
        <div className="builder-header-left">
          <button
            type="button"
            className="btn-back-nav"
            onClick={onBackToDashboard}
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>
          <div className="builder-status-badge">
            <CheckCircle size={14} className="green-icon" />
            <span>ATS Compliant Format</span>
          </div>
        </div>

        {/* 3 Pathway Quick Switcher */}
        <div className="pathway-switcher-pills">
          <button
            type="button"
            className={`path-pill ${creationPath === "linkedin" ? "active" : ""}`}
            onClick={() => setCreationPath("linkedin")}
          >
            <LinkedInIcon size={14} />
            <span>LinkedIn Import</span>
          </button>
          <label className={`path-pill ${creationPath === "upload" ? "active" : ""}`}>
            <Upload size={14} />
            <span>Upload Resume</span>
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
            <span>Form Editor</span>
          </button>
        </div>

        <button
          type="button"
          className="btn-export-pdf"
          onClick={handleExportPDF}
          disabled={isExporting}
        >
          <Download size={16} />
          <span>{isExporting ? "Exporting PDF..." : "Export Resume (PDF)"}</span>
        </button>
      </div>

      {/* LinkedIn Import Drawer / Modal */}
      {creationPath === "linkedin" && (
        <div className="builder-import-panel">
          <div className="import-panel-inner">
            <div className="panel-title-row">
              <LinkedInIcon size={22} className="linkedin-brand" />
              <h3>Import LinkedIn Profile Data</h3>
            </div>
            <p className="panel-desc">
              Paste your LinkedIn profile text, summary, experience, or resume export for instant field population.
            </p>
            <textarea
              className="import-textarea"
              rows={6}
              placeholder="Paste your LinkedIn headline, summary, job history, or profile text here..."
              value={linkedinInput}
              onChange={(e) => setLinkedinInput(e.target.value)}
            ></textarea>
            <div className="import-actions-row">
              <button
                type="button"
                className="btn-secondary-action"
                onClick={() => setCreationPath("form")}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary-action"
                onClick={handleLinkedInSubmit}
                disabled={parsingLoading || !linkedinInput.trim()}
              >
                {parsingLoading ? "Parsing Profile..." : "Populate Resume Fields"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Split-Screen Workspace */}
      <div className="builder-split-workspace">
        {/* Left Side: Form Editor */}
        <div className="builder-form-pane">
          {/* Step Form Tabs */}
          <div className="builder-section-tabs">
            {["personal", "experience", "education", "skills", "projects"].map((tab) => (
              <button
                key={tab}
                type="button"
                className={`tab-btn ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="form-fields-scrollable">
            {/* 1. Personal Info */}
            {activeTab === "personal" && (
              <div className="form-section-block">
                <h4 className="form-block-title">Contact & Personal Details</h4>
                <div className="input-grid-2">
                  <div className="form-group">
                    <label>Full Name</label>
                    <input
                      type="text"
                      value={resumeData.personal.fullName}
                      onChange={(e) => updatePersonal("fullName", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input
                      type="email"
                      value={resumeData.personal.email}
                      onChange={(e) => updatePersonal("email", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone</label>
                    <input
                      type="text"
                      value={resumeData.personal.phone}
                      onChange={(e) => updatePersonal("phone", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      value={resumeData.personal.location}
                      onChange={(e) => updatePersonal("location", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>LinkedIn URL</label>
                    <input
                      type="text"
                      value={resumeData.personal.linkedin}
                      onChange={(e) => updatePersonal("linkedin", e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>GitHub / Portfolio</label>
                    <input
                      type="text"
                      value={resumeData.personal.github}
                      onChange={(e) => updatePersonal("github", e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: "16px" }}>
                  <label>Professional Summary</label>
                  <textarea
                    rows={4}
                    value={resumeData.personal.summary}
                    onChange={(e) => updatePersonal("summary", e.target.value)}
                  ></textarea>
                </div>
              </div>
            )}

            {/* 2. Experience */}
            {activeTab === "experience" && (
              <div className="form-section-block">
                <div className="block-header-flex">
                  <h4 className="form-block-title">Work & Internship Experience</h4>
                  <button
                    type="button"
                    className="btn-add-item"
                    onClick={addExperience}
                  >
                    <Plus size={14} /> Add Role
                  </button>
                </div>

                {resumeData.experience.map((exp) => (
                  <div key={exp.id} className="card-item-editor">
                    <div className="card-item-head">
                      <input
                        type="text"
                        className="item-title-input"
                        placeholder="Role / Title"
                        value={exp.role}
                        onChange={(e) => updateExperience(exp.id, "role", e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn-delete-item"
                        onClick={() => removeExperience(exp.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="input-grid-2">
                      <div className="form-group">
                        <label>Company</label>
                        <input
                          type="text"
                          value={exp.company}
                          onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
                        />
                      </div>
                      <div className="form-group">
                        <label>Dates</label>
                        <input
                          type="text"
                          value={`${exp.startDate} - ${exp.endDate}`}
                          onChange={(e) => {
                            const [start, end] = e.target.value.split("-");
                            updateExperience(exp.id, "startDate", start?.trim() || "");
                            updateExperience(exp.id, "endDate", end?.trim() || "");
                          }}
                        />
                      </div>
                    </div>

                    <div className="form-group" style={{ marginTop: "12px" }}>
                      <label>Bullet Points / Achievements</label>
                      <textarea
                        rows={3}
                        value={exp.description}
                        onChange={(e) => updateExperience(exp.id, "description", e.target.value)}
                      ></textarea>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. Skills */}
            {activeTab === "skills" && (
              <div className="form-section-block">
                <h4 className="form-block-title">Technical & Soft Skills</h4>
                <div className="skill-input-row">
                  <input
                    type="text"
                    id="new-skill-input"
                    placeholder="Type skill (e.g., Docker, GraphQL, Python) & press Add"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill(e.currentTarget.value);
                        e.currentTarget.value = "";
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="btn-primary-action"
                    onClick={() => {
                      const el = document.getElementById("new-skill-input");
                      if (el) {
                        addSkill(el.value);
                        el.value = "";
                      }
                    }}
                  >
                    Add Skill
                  </button>
                </div>

                <div className="skills-chips-cloud">
                  {resumeData.skills.map((skill) => (
                    <span key={skill} className="skill-removable-chip">
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
                        aria-label="Remove"
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 4. Education & Projects (Render standard fields) */}
            {(activeTab === "education" || activeTab === "projects") && (
              <div className="form-section-block">
                <h4 className="form-block-title">
                  {activeTab === "education" ? "Academic Qualifications" : "Key Engineering Projects"}
                </h4>
                <p className="form-hint">
                  Highlight verified coursework, thesis, and quantifiable project metrics.
                </p>
                {activeTab === "education" &&
                  resumeData.education.map((edu) => (
                    <div key={edu.id} className="card-item-editor">
                      <div className="form-group">
                        <label>School / University</label>
                        <input
                          type="text"
                          value={edu.school}
                          onChange={(e) => {
                            setResumeData((prev) => ({
                              ...prev,
                              education: prev.education.map((ed) =>
                                ed.id === edu.id ? { ...ed, school: e.target.value } : ed
                              )
                            }));
                          }}
                        />
                      </div>
                      <div className="input-grid-2" style={{ marginTop: "10px" }}>
                        <div className="form-group">
                          <label>Degree</label>
                          <input type="text" value={edu.degree} readOnly />
                        </div>
                        <div className="form-group">
                          <label>GPA</label>
                          <input type="text" value={edu.gpa} readOnly />
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Real-Time Live Preview Document */}
        <div className="builder-preview-pane">
          <div className="preview-pane-header">
            <span className="preview-label">LIVE ATS PREVIEW</span>
            <span className="page-count-tag">1 Page (Standard)</span>
          </div>

          <div className="preview-paper-wrapper">
            <div className="resume-sheet-document" ref={previewRef}>
              {/* Header */}
              <div className="resume-doc-header">
                <h1 className="doc-full-name">{resumeData.personal.fullName}</h1>
                <div className="doc-contact-line">
                  <span>{resumeData.personal.email}</span> &bull;{" "}
                  <span>{resumeData.personal.phone}</span> &bull;{" "}
                  <span>{resumeData.personal.location}</span>
                </div>
                <div className="doc-links-line">
                  <span>{resumeData.personal.linkedin}</span> &bull;{" "}
                  <span>{resumeData.personal.github}</span>
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
                      <span className="doc-item-loc">{exp.location}</span>
                    </div>
                    <ul className="doc-bullet-list">
                      {exp.description.split("\n").filter(Boolean).map((bullet, idx) => (
                        <li key={idx}>{bullet}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Education */}
              <div className="doc-section">
                <div className="doc-section-heading">EDUCATION</div>
                {resumeData.education.map((edu) => (
                  <div key={edu.id} className="doc-item-entry">
                    <div className="doc-item-top">
                      <span className="doc-item-title">{edu.school}</span>
                      <span className="doc-item-date">{edu.startDate} – {edu.endDate}</span>
                    </div>
                    <div className="doc-item-sub">
                      <span>{edu.degree} &bull; GPA: {edu.gpa}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Skills */}
              <div className="doc-section">
                <div className="doc-section-heading">TECHNICAL SKILLS</div>
                <div className="doc-skills-inline">
                  <strong>Languages & Frameworks: </strong>
                  {resumeData.skills.join(", ")}
                </div>
              </div>

              {/* Projects */}
              {resumeData.projects?.length > 0 && (
                <div className="doc-section">
                  <div className="doc-section-heading">PROJECTS</div>
                  {resumeData.projects.map((proj) => (
                    <div key={proj.id} className="doc-item-entry">
                      <div className="doc-item-top">
                        <span className="doc-item-title">{proj.title}</span>
                        <span className="doc-item-date">{proj.techStack}</span>
                      </div>
                      <p className="doc-proj-desc">{proj.description}</p>
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
