import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { resumeApi } from "../api/api";
import Loader from "../components/Loader";
import Toast from "../components/Toast";
import FileUpload from "../components/FileUpload";
import JDInput from "../components/JDInput";
import "./Onboarding.css";

export default function Onboarding() {
  const [selectedPath, setSelectedPath] = useState(null); // 'linkedin' | 'file' | 'manual'
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const navigate = useNavigate();

  // Manual Form State
  const [manualStep, setManualStep] = useState(1);
  const [manualData, setManualData] = useState({
    title: "My Professional Resume",
    targetRole: "",
    personalInfo: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      linkedin: "",
      github: "",
      portfolio: ""
    },
    summary: "",
    workExperience: [
      { company: "", role: "", startDate: "", endDate: "", current: false, bullets: [""] }
    ],
    education: [
      { institution: "", degree: "", field: "", year: "", grade: "" }
    ],
    skills: { technical: [""], tools: [""], soft: [""] },
    projects: [
      { title: "", description: "", techStack: [""], link: "" }
    ]
  });

  // Handle Path A & B Submissions
  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setToastMessage("Please select a file to import.");
      return;
    }

    try {
      setLoading(true);
      setToastMessage("");
      const formData = new FormData();

      let res;
      if (selectedPath === "linkedin") {
        formData.append("linkedinPdf", file);
        res = await resumeApi.importLinkedIn(formData);
      } else {
        formData.append("resumeFile", file);
        res = await resumeApi.importFile(formData);
      }

      if (res && res.data) {
        // If user provided a target JD, save it as well
        if (jobDescription) {
          await resumeApi.updateResume(res.data._id, { targetJobDescription: jobDescription.trim() });
        }
        navigate(`/builder/${res.data._id}`);
      }
    } catch (err) {
      console.error("Import error:", err);
      setToastMessage(err.response?.data?.message || err.message || "Failed to import profile.");
    } finally {
      setLoading(false);
    }
  };

  // Handle Path C Manual Submission
  const handleManualSubmit = async () => {
    try {
      setLoading(true);
      setToastMessage("");

      // Filter empty list items
      const cleanData = {
        ...manualData,
        targetJobDescription: jobDescription.trim(),
        skills: {
          technical: manualData.skills.technical.filter(Boolean),
          tools: manualData.skills.tools.filter(Boolean),
          soft: manualData.skills.soft.filter(Boolean)
        },
        workExperience: manualData.workExperience.map((w) => ({
          ...w,
          bullets: w.bullets.filter(Boolean)
        })),
        projects: manualData.projects.map((p) => ({
          ...p,
          techStack: p.techStack.filter(Boolean)
        }))
      };

      const res = await resumeApi.createResume(cleanData);
      if (res && res.data) {
        navigate(`/builder/${res.data._id}`);
      }
    } catch (err) {
      console.error("Manual creation error:", err);
      setToastMessage(err.message || "Failed to create resume.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page-container">
      <Loader active={loading} />
      <Toast message={toastMessage} type="error" onClose={() => setToastMessage("")} />

      <div className="container">
        <div className="onboarding-header">
          <h1 className="onboarding-title">How would you like to build your resume?</h1>
          <p className="onboarding-subtitle">Choose the method that works best for you. FreeGraduates AI will assist you in real time.</p>
        </div>

        {!selectedPath ? (
          /* Selection Cards Grid */
          <div className="onboarding-cards-grid">
            <div className="ui-card onboarding-option-card" onClick={() => setSelectedPath("linkedin")}>
              <div className="opt-icon-circle opt-linkedin">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
                  <rect x="2" y="9" width="4" height="12" />
                  <circle cx="4" cy="4" r="2" />
                </svg>
              </div>
              <h3 className="opt-title">Import LinkedIn Profile</h3>
              <p className="opt-desc">Upload your LinkedIn PDF export ("Save to PDF"). AI extracts all roles, skills, and coursework automatically.</p>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: "16px" }}>Import LinkedIn &rarr;</button>
            </div>

            <div className="ui-card onboarding-option-card" onClick={() => setSelectedPath("file")}>
              <div className="opt-icon-circle opt-resume">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </div>
              <h3 className="opt-title">Upload Existing Resume</h3>
              <p className="opt-desc">Upload a PDF or DOCX file. AI restructures your resume into clean, ATS-compliant templates.</p>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: "16px" }}>Upload File &rarr;</button>
            </div>

            <div className="ui-card onboarding-option-card" onClick={() => setSelectedPath("manual")}>
              <div className="opt-icon-circle opt-manual">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </div>
              <h3 className="opt-title">Build Step-by-Step</h3>
              <p className="opt-desc">Fill out your details manually with guided prompts. Great for creating your first professional resume.</p>
              <button className="btn btn-secondary btn-sm" style={{ marginTop: "16px" }}>Start Manual Form &rarr;</button>
            </div>
          </div>
        ) : selectedPath === "linkedin" || selectedPath === "file" ? (
          /* Import Upload View */
          <div className="ui-card onboarding-form-box">
            <button className="btn-back-link" onClick={() => { setSelectedPath(null); setFile(null); }}>
              &larr; Choose different method
            </button>
            <h2 style={{ fontSize: "24px", marginBlock: "12px" }}>
              {selectedPath === "linkedin" ? "Upload LinkedIn PDF Export" : "Upload Existing Resume"}
            </h2>
            <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
              {selectedPath === "linkedin"
                ? "Go to your LinkedIn Profile -> More -> 'Save to PDF' and upload the file here."
                : "Upload your current resume file (PDF or DOCX)."}
            </p>

            <form onSubmit={handleImportSubmit}>
              <FileUpload file={file} onFileSelect={setFile} onFileRemove={() => setFile(null)} />
              <JDInput value={jobDescription} onChange={setJobDescription} />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedPath(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-lg" disabled={!file || loading}>
                  Parse & Open Builder
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Manual Step Wizard */
          <div className="ui-card onboarding-form-box">
            <button className="btn-back-link" onClick={() => setSelectedPath(null)}>
              &larr; Choose different method
            </button>
            <div className="wizard-progress-bar">
              <div className={`step-dot ${manualStep >= 1 ? "active" : ""}`}>1. Personal</div>
              <div className={`step-dot ${manualStep >= 2 ? "active" : ""}`}>2. Experience</div>
              <div className={`step-dot ${manualStep >= 3 ? "active" : ""}`}>3. Education</div>
              <div className={`step-dot ${manualStep >= 4 ? "active" : ""}`}>4. Skills & Finish</div>
            </div>

            {manualStep === 1 && (
              <div className="wizard-step-pane">
                <h3>Step 1: Contact Details & Target Role</h3>
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      placeholder="Rahul Sharma"
                      value={manualData.personalInfo.fullName}
                      onChange={(e) => setManualData({ ...manualData, personalInfo: { ...manualData.personalInfo, fullName: e.target.value } })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Target Role Title *</label>
                    <input
                      type="text"
                      placeholder="Software Engineer / Data Analyst"
                      value={manualData.targetRole}
                      onChange={(e) => setManualData({ ...manualData, targetRole: e.target.value, title: `${e.target.value || "My"} Resume` })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Email *</label>
                    <input
                      type="email"
                      placeholder="rahul@example.com"
                      value={manualData.personalInfo.email}
                      onChange={(e) => setManualData({ ...manualData, personalInfo: { ...manualData.personalInfo, email: e.target.value } })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={manualData.personalInfo.phone}
                      onChange={(e) => setManualData({ ...manualData, personalInfo: { ...manualData.personalInfo, phone: e.target.value } })}
                    />
                  </div>
                </div>
              </div>
            )}

            {manualStep === 2 && (
              <div className="wizard-step-pane">
                <h3>Step 2: Summary & Target Job Description</h3>
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label>Professional Summary</label>
                  <textarea
                    rows={4}
                    placeholder="Enthusiastic CS student specializing in Java backend development and scalable cloud architectures..."
                    value={manualData.summary}
                    onChange={(e) => setManualData({ ...manualData, summary: e.target.value })}
                  ></textarea>
                </div>
                <JDInput value={jobDescription} onChange={setJobDescription} />
              </div>
            )}

            {manualStep === 3 && (
              <div className="wizard-step-pane">
                <h3>Step 3: Work Experience & Internships</h3>
                {manualData.workExperience.map((exp, idx) => (
                  <div key={idx} className="sub-form-block">
                    <div className="form-grid-2">
                      <div className="form-group">
                        <label>Company / Organization</label>
                        <input
                          type="text"
                          placeholder="Tech Corp"
                          value={exp.company}
                          onChange={(e) => {
                            const newExp = [...manualData.workExperience];
                            newExp[idx].company = e.target.value;
                            setManualData({ ...manualData, workExperience: newExp });
                          }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Role / Position</label>
                        <input
                          type="text"
                          placeholder="Backend Developer Intern"
                          value={exp.role}
                          onChange={(e) => {
                            const newExp = [...manualData.workExperience];
                            newExp[idx].role = e.target.value;
                            setManualData({ ...manualData, workExperience: newExp });
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {manualStep === 4 && (
              <div className="wizard-step-pane">
                <h3>Step 4: Key Skills</h3>
                <div className="form-group" style={{ marginBottom: "16px" }}>
                  <label>Technical Skills (comma separated)</label>
                  <input
                    type="text"
                    placeholder="Java, Python, Spring Boot, PostgreSQL, REST APIs"
                    value={manualData.skills.technical.join(", ")}
                    onChange={(e) => setManualData({
                      ...manualData,
                      skills: { ...manualData.skills, technical: e.target.value.split(",").map(s => s.trim()) }
                    })}
                  />
                </div>
              </div>
            )}

            <div className="wizard-actions-row">
              {manualStep > 1 && (
                <button type="button" className="btn btn-secondary" onClick={() => setManualStep(manualStep - 1)}>
                  Back
                </button>
              )}
              {manualStep < 4 ? (
                <button type="button" className="btn btn-primary" onClick={() => setManualStep(manualStep + 1)}>
                  Next Step &rarr;
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-lg" onClick={handleManualSubmit} disabled={loading}>
                  Open Interactive Builder
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
