import React, { useState } from "react";
import "./FormEditor.css";

export default function FormEditor({ resumeData, onChange }) {
  const [activeTab, setActiveTab] = useState("personal");

  const pInfo = resumeData?.personalInfo || {};
  const workExp = Array.isArray(resumeData?.workExperience) ? resumeData.workExperience : [];
  const edu = Array.isArray(resumeData?.education) ? resumeData.education : [];
  const projects = Array.isArray(resumeData?.projects) ? resumeData.projects : [];
  const skills = resumeData?.skills || { technical: [], tools: [], soft: [] };

  const updatePersonalInfo = (field, value) => {
    onChange({
      ...resumeData,
      personalInfo: { ...pInfo, [field]: value }
    });
  };

  const updateSummary = (value) => {
    onChange({ ...resumeData, summary: value });
  };

  // Work Experience Handlers
  const addExperience = () => {
    const newExp = [
      ...workExp,
      { id: Date.now().toString(), company: "", role: "", startDate: "", endDate: "", current: false, bullets: [""] }
    ];
    onChange({ ...resumeData, workExperience: newExp });
  };

  const updateExp = (index, field, value) => {
    const updated = [...workExp];
    updated[index][field] = value;
    onChange({ ...resumeData, workExperience: updated });
  };

  const updateExpBullet = (expIndex, bulletIndex, value) => {
    const updated = [...workExp];
    updated[expIndex].bullets[bulletIndex] = value;
    onChange({ ...resumeData, workExperience: updated });
  };

  const addExpBullet = (expIndex) => {
    const updated = [...workExp];
    updated[expIndex].bullets.push("");
    onChange({ ...resumeData, workExperience: updated });
  };

  const removeExp = (index) => {
    const updated = workExp.filter((_, i) => i !== index);
    onChange({ ...resumeData, workExperience: updated });
  };

  return (
    <div className="form-editor-wrapper">
      {/* Editor Sub-Tabs */}
      <div className="editor-tab-bar">
        <button className={`ed-tab ${activeTab === "personal" ? "active" : ""}`} onClick={() => setActiveTab("personal")}>
          Contact
        </button>
        <button className={`ed-tab ${activeTab === "summary" ? "active" : ""}`} onClick={() => setActiveTab("summary")}>
          Summary
        </button>
        <button className={`ed-tab ${activeTab === "experience" ? "active" : ""}`} onClick={() => setActiveTab("experience")}>
          Experience
        </button>
        <button className={`ed-tab ${activeTab === "education" ? "active" : ""}`} onClick={() => setActiveTab("education")}>
          Education
        </button>
        <button className={`ed-tab ${activeTab === "projects" ? "active" : ""}`} onClick={() => setActiveTab("projects")}>
          Projects
        </button>
        <button className={`ed-tab ${activeTab === "skills" ? "active" : ""}`} onClick={() => setActiveTab("skills")}>
          Skills
        </button>
      </div>

      <div className="editor-form-body">
        {/* Tab 1: Personal Contact */}
        {activeTab === "personal" && (
          <div className="ed-section">
            <h4 className="ed-section-title">Personal Contact Info</h4>
            <div className="form-group">
              <label>Full Name</label>
              <input
                type="text"
                value={pInfo.fullName || ""}
                onChange={(e) => updatePersonalInfo("fullName", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={pInfo.email || ""}
                onChange={(e) => updatePersonalInfo("email", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                value={pInfo.phone || ""}
                onChange={(e) => updatePersonalInfo("phone", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Location</label>
              <input
                type="text"
                value={pInfo.location || ""}
                onChange={(e) => updatePersonalInfo("location", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>LinkedIn URL</label>
              <input
                type="text"
                value={pInfo.linkedin || ""}
                onChange={(e) => updatePersonalInfo("linkedin", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>GitHub URL</label>
              <input
                type="text"
                value={pInfo.github || ""}
                onChange={(e) => updatePersonalInfo("github", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Tab 2: Summary */}
        {activeTab === "summary" && (
          <div className="ed-section">
            <h4 className="ed-section-title">Professional Summary</h4>
            <div className="form-group">
              <textarea
                rows={6}
                value={resumeData.summary || ""}
                onChange={(e) => updateSummary(e.target.value)}
                placeholder="Write a concise overview of your background..."
              ></textarea>
            </div>
          </div>
        )}

        {/* Tab 3: Work Experience */}
        {activeTab === "experience" && (
          <div className="ed-section">
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <h4 className="ed-section-title">Work Experience</h4>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addExperience}>
                + Add Experience
              </button>
            </div>

            {workExp.map((exp, idx) => (
              <div key={idx} className="ed-card-block">
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <strong>Experience #{idx + 1}</strong>
                  <button type="button" className="btn-link" style={{ color: "var(--danger)" }} onClick={() => removeExp(idx)}>
                    Remove
                  </button>
                </div>
                <div className="form-group">
                  <label>Company</label>
                  <input type="text" value={exp.company || ""} onChange={(e) => updateExp(idx, "company", e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <input type="text" value={exp.role || ""} onChange={(e) => updateExp(idx, "role", e.target.value)} />
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Start Date</label>
                    <input type="text" value={exp.startDate || ""} onChange={(e) => updateExp(idx, "startDate", e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>End Date</label>
                    <input type="text" value={exp.endDate || ""} onChange={(e) => updateExp(idx, "endDate", e.target.value)} />
                  </div>
                </div>

                <div style={{ marginTop: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 700 }}>Bullet Points</label>
                  {(exp.bullets || []).map((b, bIdx) => (
                    <input
                      key={bIdx}
                      type="text"
                      style={{ marginTop: "4px" }}
                      value={b}
                      onChange={(e) => updateExpBullet(idx, bIdx, e.target.value)}
                    />
                  ))}
                  <button type="button" className="btn-link" style={{ marginTop: "6px" }} onClick={() => addExpBullet(idx)}>
                    + Add Bullet
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Skills */}
        {activeTab === "skills" && (
          <div className="ed-section">
            <h4 className="ed-section-title">Technical Skills</h4>
            <div className="form-group">
              <label>Technical Skills (comma separated)</label>
              <input
                type="text"
                value={(skills.technical || []).join(", ")}
                onChange={(e) => onChange({
                  ...resumeData,
                  skills: { ...skills, technical: e.target.value.split(",").map(s => s.trim()) }
                })}
              />
            </div>
            <div className="form-group">
              <label>Tools & Frameworks (comma separated)</label>
              <input
                type="text"
                value={(skills.tools || []).join(", ")}
                onChange={(e) => onChange({
                  ...resumeData,
                  skills: { ...skills, tools: e.target.value.split(",").map(s => s.trim()) }
                })}
              />
            </div>
          </div>
        )}

        {/* Tab 5: Education */}
        {activeTab === "education" && (
          <div className="ed-section">
            <h4 className="ed-section-title">Education</h4>
            {edu.map((item, idx) => (
              <div key={idx} className="ed-card-block">
                <div className="form-group">
                  <label>Degree</label>
                  <input
                    type="text"
                    value={item.degree || ""}
                    onChange={(e) => {
                      const updated = [...edu];
                      updated[idx].degree = e.target.value;
                      onChange({ ...resumeData, education: updated });
                    }}
                  />
                </div>
                <div className="form-group">
                  <label>Institution</label>
                  <input
                    type="text"
                    value={item.institution || ""}
                    onChange={(e) => {
                      const updated = [...edu];
                      updated[idx].institution = e.target.value;
                      onChange({ ...resumeData, education: updated });
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
