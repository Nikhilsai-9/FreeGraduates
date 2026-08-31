import React from "react";
import "./ParsedDataView.css";

export default function ParsedDataView({ data = {} }) {
  const contact = data?.contact || {};
  const workExperience = Array.isArray(data?.workExperience) ? data.workExperience : [];
  const education = Array.isArray(data?.education) ? data.education : [];
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  const skills = data?.skills || {};
  const certifications = Array.isArray(data?.certifications) ? data.certifications : [];
  const languages = Array.isArray(data?.languages) ? data.languages : [];

  return (
    <div className="parsed-data-container">
      {/* Contact & Summary Header */}
      <div className="parsed-card">
        <div className="parsed-header-block">
          <h3 className="parsed-name">{contact?.name || "Candidate Name"}</h3>
          <div className="parsed-meta-links">
            {contact?.email && <span>✉ {contact.email}</span>}
            {contact?.phone && <span>📞 {contact.phone}</span>}
            {contact?.location && <span>📍 {contact.location}</span>}
            {contact?.linkedin && <span>🔗 {contact.linkedin}</span>}
            {contact?.github && <span>🐙 {contact.github}</span>}
            {contact?.portfolio && <span>🌐 {contact.portfolio}</span>}
          </div>
        </div>

        {data?.summary && (
          <div className="parsed-summary-box">
            <h4 className="parsed-sub-title">Professional Summary</h4>
            <p className="parsed-summary-text">{data.summary}</p>
          </div>
        )}

        {data?.totalExperienceYears !== undefined && (
          <div className="parsed-exp-badge">
            Total Calculated Experience: <strong>{data.totalExperienceYears} year{data.totalExperienceYears !== 1 ? "s" : ""}</strong>
          </div>
        )}
      </div>

      {/* Skills Grid */}
      <div className="parsed-card">
        <h4 className="parsed-section-heading">Extracted Skills</h4>
        <div className="parsed-skills-grid">
          <div>
            <div className="skill-cat-title">Technical Skills</div>
            <div className="chips-row">
              {(skills?.technical || []).map((s, i) => (
                <span key={i} className="skill-badge">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="skill-cat-title">Tools & Frameworks</div>
            <div className="chips-row">
              {(skills?.tools || []).map((s, i) => (
                <span key={i} className="skill-badge">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <div className="skill-cat-title">Soft Skills</div>
            <div className="chips-row">
              {(skills?.soft || []).map((s, i) => (
                <span key={i} className="skill-badge">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Work Experience */}
      {workExperience.length > 0 && (
        <div className="parsed-card">
          <h4 className="parsed-section-heading">Work Experience</h4>
          <div className="parsed-items-stack">
            {workExperience.map((item, idx) => (
              <div key={idx} className="parsed-exp-item">
                <div className="exp-item-header">
                  <div>
                    <h5 className="exp-role">{item?.role || "Role"}</h5>
                    <span className="exp-company">{item?.company || "Company"}</span>
                  </div>
                  <span className="exp-duration">
                    {item?.startDate || ""} {item?.endDate ? `– ${item.endDate}` : ""} {item?.duration ? `(${item.duration})` : ""}
                  </span>
                </div>
                {(item?.bullets || []).length > 0 && (
                  <ul className="exp-bullets">
                    {(item.bullets || []).map((b, bIdx) => (
                      <li key={bIdx}>{b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {education.length > 0 && (
        <div className="parsed-card">
          <h4 className="parsed-section-heading">Education</h4>
          <div className="parsed-items-stack">
            {education.map((edu, idx) => (
              <div key={idx} className="parsed-edu-item">
                <div className="exp-item-header">
                  <div>
                    <h5 className="exp-role">{edu?.degree || "Degree"} {edu?.field ? `in ${edu.field}` : ""}</h5>
                    <span className="exp-company">{edu?.institution || "Institution"}</span>
                  </div>
                  <span className="exp-duration">{edu?.year || ""} {edu?.grade ? `• Grade: ${edu.grade}` : ""}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects */}
      {projects.length > 0 && (
        <div className="parsed-card">
          <h4 className="parsed-section-heading">Projects</h4>
          <div className="parsed-items-stack">
            {projects.map((proj, idx) => (
              <div key={idx} className="parsed-exp-item">
                <h5 className="exp-role">{proj?.name || "Project"}</h5>
                <p className="proj-desc">{proj?.description || ""}</p>
                {(proj?.techStack || []).length > 0 && (
                  <div className="chips-row" style={{ marginTop: "8px" }}>
                    {(proj.techStack || []).map((t, tIdx) => (
                      <span key={tIdx} className="skill-badge">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Certifications & Languages */}
      {(certifications.length > 0 || languages.length > 0) && (
        <div className="parsed-card parsed-cert-grid">
          {certifications.length > 0 && (
            <div>
              <h4 className="parsed-section-heading">Certifications</h4>
              <ul className="simple-list">
                {certifications.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {languages.length > 0 && (
            <div>
              <h4 className="parsed-section-heading">Languages</h4>
              <div className="chips-row">
                {languages.map((lang, i) => (
                  <span key={i} className="skill-badge">{lang}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
