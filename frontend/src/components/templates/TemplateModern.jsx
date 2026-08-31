import React from "react";
import "./TemplateModern.css";

export default function TemplateModern({ data = {}, themeColor = "#1a91f0", fontSize = "medium", pendingSuggestions = [] }) {
  const pInfo = data?.personalInfo || {};
  const workExp = Array.isArray(data?.workExperience) ? data.workExperience : [];
  const edu = Array.isArray(data?.education) ? data.education : [];
  const skills = data?.skills || {};
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  const certifications = Array.isArray(data?.certifications) ? data.certifications : [];

  // Check if a section has pending AI suggestions
  const hasSuggestion = (sec) => (pendingSuggestions || []).some((s) => s.section === sec && s.status === "pending");

  return (
    <div className={`template-canvas template-modern font-${fontSize}`} style={{ "--theme-color": themeColor }}>
      {/* Header */}
      <header className="modern-header">
        <h1 className="modern-name">{pInfo.fullName || "Your Full Name"}</h1>
        <div className="modern-contact-line">
          {pInfo.email && <span>{pInfo.email}</span>}
          {pInfo.phone && <span>&bull; {pInfo.phone}</span>}
          {pInfo.location && <span>&bull; {pInfo.location}</span>}
          {pInfo.linkedin && <span>&bull; {pInfo.linkedin}</span>}
          {pInfo.github && <span>&bull; {pInfo.github}</span>}
          {pInfo.portfolio && <span>&bull; {pInfo.portfolio}</span>}
        </div>
      </header>

      {/* Summary */}
      {data.summary && (
        <section className={`modern-section ${hasSuggestion("summary") ? "has-ai-badge" : ""}`}>
          {hasSuggestion("summary") && <span className="ai-pending-badge">AI Suggested Edit</span>}
          <h2 className="modern-section-title">Professional Summary</h2>
          <p className="modern-summary-text">{data.summary}</p>
        </section>
      )}

      {/* Skills */}
      {((skills.technical || []).length > 0 || (skills.tools || []).length > 0) && (
        <section className={`modern-section ${hasSuggestion("skills") ? "has-ai-badge" : ""}`}>
          {hasSuggestion("skills") && <span className="ai-pending-badge">AI Suggested Edit</span>}
          <h2 className="modern-section-title">Technical Skills</h2>
          <div className="modern-skills-list">
            {(skills.technical || []).length > 0 && (
              <div>
                <strong>Languages & Technologies:</strong> {(skills.technical || []).join(", ")}
              </div>
            )}
            {(skills.tools || []).length > 0 && (
              <div>
                <strong>Frameworks & Tools:</strong> {(skills.tools || []).join(", ")}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Work Experience */}
      {workExp.length > 0 && (
        <section className={`modern-section ${hasSuggestion("experience") ? "has-ai-badge" : ""}`}>
          {hasSuggestion("experience") && <span className="ai-pending-badge">AI Suggested Edit</span>}
          <h2 className="modern-section-title">Experience</h2>
          {workExp.map((exp, i) => (
            <div key={i} className="modern-entry">
              <div className="modern-entry-header">
                <div>
                  <strong className="entry-role">{exp.role || "Role"}</strong> —{" "}
                  <span className="entry-company">{exp.company || "Company"}</span>
                </div>
                <span className="entry-dates">
                  {exp.startDate || ""} {exp.startDate && "-"} {exp.current ? "Present" : exp.endDate || ""}
                </span>
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

      {/* Projects */}
      {projects.length > 0 && (
        <section className={`modern-section ${hasSuggestion("projects") ? "has-ai-badge" : ""}`}>
          {hasSuggestion("projects") && <span className="ai-pending-badge">AI Suggested Edit</span>}
          <h2 className="modern-section-title">Projects</h2>
          {projects.map((proj, i) => (
            <div key={i} className="modern-entry">
              <div className="modern-entry-header">
                <div>
                  <strong className="entry-role">{proj.title || "Project Title"}</strong>
                  {(proj.techStack || []).length > 0 && (
                    <span className="entry-tech"> &bull; {(proj.techStack || []).join(", ")}</span>
                  )}
                </div>
                {proj.link && <span className="entry-link">{proj.link}</span>}
              </div>
              {proj.description && <p className="proj-desc-text">{proj.description}</p>}
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {edu.length > 0 && (
        <section className="modern-section">
          <h2 className="modern-section-title">Education</h2>
          {edu.map((item, i) => (
            <div key={i} className="modern-entry-header" style={{ marginBottom: "6px" }}>
              <div>
                <strong className="entry-role">{item.degree} {item.field ? `in ${item.field}` : ""}</strong> —{" "}
                <span className="entry-company">{item.institution}</span>
              </div>
              <span className="entry-dates">{item.year} {item.grade ? `(${item.grade})` : ""}</span>
            </div>
          ))}
        </section>
      )}

      {/* Certifications */}
      {certifications.length > 0 && (
        <section className="modern-section">
          <h2 className="modern-section-title">Certifications</h2>
          <ul className="modern-bullets">
            {certifications.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
