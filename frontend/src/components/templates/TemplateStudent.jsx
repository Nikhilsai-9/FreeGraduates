import React from "react";
import "./TemplateModern.css";

export default function TemplateStudent({ data = {}, themeColor = "#16a34a", fontSize = "medium" }) {
  const pInfo = data?.personalInfo || {};
  const edu = Array.isArray(data?.education) ? data.education : [];
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  const skills = data?.skills || {};
  const workExp = Array.isArray(data?.workExperience) ? data.workExperience : [];

  return (
    <div className={`template-canvas font-${fontSize}`} style={{ "--theme-color": themeColor }}>
      <header className="modern-header" style={{ borderBottomColor: themeColor }}>
        <h1 className="modern-name">{pInfo.fullName || "Student Name"}</h1>
        <div style={{ fontSize: "13px", fontWeight: "600", color: themeColor, marginBottom: "4px" }}>
          {data.targetRole || "Aspiring Software Engineer"}
        </div>
        <div className="modern-contact-line">
          {[pInfo.email, pInfo.phone, pInfo.location, pInfo.github, pInfo.linkedin].filter(Boolean).join(" • ")}
        </div>
      </header>

      {/* Education First */}
      {edu.length > 0 && (
        <section className="modern-section">
          <h2 className="modern-section-title" style={{ color: themeColor }}>Education & Academic Background</h2>
          {edu.map((item, i) => (
            <div key={i} className="modern-entry" style={{ marginBottom: "8px" }}>
              <div className="modern-entry-header">
                <strong>{item.degree} {item.field ? `in ${item.field}` : ""}</strong>
                <span>{item.year}</span>
              </div>
              <div style={{ fontSize: "0.9em", color: "#475569" }}>
                {item.institution} {item.grade ? `| Grade/CGPA: ${item.grade}` : ""}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <section className="modern-section">
          <h2 className="modern-section-title" style={{ color: themeColor }}>Technical Projects</h2>
          {projects.map((proj, i) => (
            <div key={i} className="modern-entry">
              <div className="modern-entry-header">
                <strong>{proj.title}</strong>
                {(proj.techStack || []).length > 0 && (
                  <span className="entry-tech" style={{ color: themeColor }}>
                    {(proj.techStack || []).join(", ")}
                  </span>
                )}
              </div>
              <p className="proj-desc-text">{proj.description}</p>
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {((skills.technical || []).length > 0) && (
        <section className="modern-section">
          <h2 className="modern-section-title" style={{ color: themeColor }}>Skills & Competencies</h2>
          <div className="modern-skills-list">
            {(skills.technical || []).length > 0 && <div><strong>Technical:</strong> {(skills.technical || []).join(", ")}</div>}
            {(skills.tools || []).length > 0 && <div><strong>Tools & Libraries:</strong> {(skills.tools || []).join(", ")}</div>}
          </div>
        </section>
      )}

      {/* Experience */}
      {workExp.length > 0 && (
        <section className="modern-section">
          <h2 className="modern-section-title" style={{ color: themeColor }}>Internships & Work Experience</h2>
          {workExp.map((exp, i) => (
            <div key={i} className="modern-entry">
              <div className="modern-entry-header">
                <strong>{exp.role} — {exp.company}</strong>
                <span>{exp.startDate} - {exp.current ? "Present" : exp.endDate}</span>
              </div>
              <ul className="modern-bullets">
                {(exp.bullets || []).map((b, bIdx) => (
                  <li key={bIdx}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
