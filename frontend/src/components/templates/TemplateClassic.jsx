import React from "react";

export default function TemplateClassic({ data = {}, themeColor = "#1e293b", fontSize = "medium" }) {
  const pInfo = data?.personalInfo || {};
  const workExp = Array.isArray(data?.workExperience) ? data.workExperience : [];
  const edu = Array.isArray(data?.education) ? data.education : [];
  const skills = data?.skills || {};

  return (
    <div
      className={`template-canvas font-${fontSize}`}
      style={{
        fontFamily: "'Georgia', serif",
        color: "#1c1917",
        "--theme-color": themeColor
      }}
    >
      <header style={{ textAlignment: "center", textAlign: "center", borderBottom: "1px solid #78716c", paddingBottom: "12px", marginBottom: "20px" }}>
        <h1 style={{ fontSize: "28px", fontWeight: "700", letterSpacing: "0.02em", color: "#0c0a09" }}>
          {pInfo.fullName || "Candidate Name"}
        </h1>
        <div style={{ fontSize: "12px", fontStyle: "italic", marginTop: "4px", color: "#57534e" }}>
          {[pInfo.location, pInfo.phone, pInfo.email, pInfo.linkedin].filter(Boolean).join(" • ")}
        </div>
      </header>

      {data.summary && (
        <section style={{ marginBottom: "18px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #d6d3d1", paddingBottom: "3px", marginBottom: "8px", color: themeColor }}>
            Executive Summary
          </h2>
          <p style={{ fontSize: "0.95em", lineHeight: "1.5" }}>{data.summary}</p>
        </section>
      )}

      {workExp.length > 0 && (
        <section style={{ marginBottom: "18px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #d6d3d1", paddingBottom: "3px", marginBottom: "10px", color: themeColor }}>
            Professional Experience
          </h2>
          {workExp.map((exp, i) => (
            <div key={i} style={{ marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontStyle: "italic", fontSize: "0.95em" }}>
                <strong>{exp.company}</strong>
                <span>{exp.startDate} – {exp.current ? "Present" : exp.endDate}</span>
              </div>
              <div style={{ fontWeight: "700", fontSize: "0.95em", marginBottom: "4px" }}>{exp.role}</div>
              <ul style={{ paddingLeft: "18px", fontSize: "0.9em", lineHeight: "1.45" }}>
                {(exp.bullets || []).map((b, bIdx) => (
                  <li key={bIdx}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {((skills.technical || []).length > 0) && (
        <section style={{ marginBottom: "18px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #d6d3d1", paddingBottom: "3px", marginBottom: "8px", color: themeColor }}>
            Areas of Expertise
          </h2>
          <div style={{ fontSize: "0.9em" }}>
            {(skills.technical || []).concat(skills.tools || []).join(" • ")}
          </div>
        </section>
      )}

      {edu.length > 0 && (
        <section style={{ marginBottom: "18px" }}>
          <h2 style={{ fontSize: "14px", fontWeight: "700", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #d6d3d1", paddingBottom: "3px", marginBottom: "8px", color: themeColor }}>
            Education
          </h2>
          {edu.map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.95em" }}>
              <span><strong>{item.institution}</strong> — {item.degree}</span>
              <span>{item.year}</span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
