import React from "react";
import "./TemplateModern.css"; // Uses shared base styling

export default function TemplateMinimal({ data = {}, themeColor = "#0f172a", fontSize = "medium" }) {
  const pInfo = data?.personalInfo || {};
  const workExp = Array.isArray(data?.workExperience) ? data.workExperience : [];
  const edu = Array.isArray(data?.education) ? data.education : [];
  const skills = data?.skills || {};
  const projects = Array.isArray(data?.projects) ? data.projects : [];

  return (
    <div className={`template-canvas template-minimal font-${fontSize}`} style={{ "--theme-color": themeColor }}>
      <header style={{ marginBottom: "20px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: "800", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          {pInfo.fullName || "Candidate Name"}
        </h1>
        <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
          {[pInfo.email, pInfo.phone, pInfo.location, pInfo.linkedin, pInfo.github].filter(Boolean).join(" | ")}
        </div>
      </header>

      {data.summary && (
        <section className="modern-section">
          <h2 className="modern-section-title" style={{ color: "#0f172a", borderBottomColor: "#0f172a" }}>Summary</h2>
          <p className="modern-summary-text">{data.summary}</p>
        </section>
      )}

      {((skills.technical || []).length > 0) && (
        <section className="modern-section">
          <h2 className="modern-section-title" style={{ color: "#0f172a", borderBottomColor: "#0f172a" }}>Skills</h2>
          <div className="modern-skills-list">
            <div>{(skills.technical || []).concat(skills.tools || []).join(" • ")}</div>
          </div>
        </section>
      )}

      {workExp.length > 0 && (
        <section className="modern-section">
          <h2 className="modern-section-title" style={{ color: "#0f172a", borderBottomColor: "#0f172a" }}>Work Experience</h2>
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

      {projects.length > 0 && (
        <section className="modern-section">
          <h2 className="modern-section-title" style={{ color: "#0f172a", borderBottomColor: "#0f172a" }}>Projects</h2>
          {projects.map((proj, i) => (
            <div key={i} className="modern-entry">
              <div className="modern-entry-header">
                <strong>{proj.title}</strong>
                {proj.link && <span>{proj.link}</span>}
              </div>
              <p className="proj-desc-text">{proj.description}</p>
            </div>
          ))}
        </section>
      )}

      {edu.length > 0 && (
        <section className="modern-section">
          <h2 className="modern-section-title" style={{ color: "#0f172a", borderBottomColor: "#0f172a" }}>Education</h2>
          {edu.map((item, i) => (
            <div key={i} className="modern-entry-header">
              <span><strong>{item.degree}</strong>, {item.institution}</span>
              <span>{item.year}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
