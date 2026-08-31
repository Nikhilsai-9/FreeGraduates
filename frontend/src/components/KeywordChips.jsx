import React from "react";
import "./KeywordChips.css";

export default function KeywordChips({ matched = [], missing = [] }) {
  const safeMatched = Array.isArray(matched) ? matched : [];
  const safeMissing = Array.isArray(missing) ? missing : [];

  return (
    <div className="keyword-chips-section">
      {/* Matched Keywords Grid */}
      <div className="keyword-block">
        <div className="keyword-block-header">
          <h4 className="keyword-block-title">
            <span className="kw-badge-dot kw-dot-green"></span>
            Matched Keywords ({safeMatched.length})
          </h4>
          <span className="keyword-block-subtitle">Found in both your resume and the job description</span>
        </div>

        {safeMatched.length > 0 ? (
          <div className="chips-grid">
            {safeMatched.map((kw, i) => (
              <div key={i} className="chip chip-matched">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{kw}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-chips-msg">No exact matching keywords identified.</p>
        )}
      </div>

      {/* Missing Keywords Grid */}
      <div className="keyword-block">
        <div className="keyword-block-header">
          <h4 className="keyword-block-title">
            <span className="kw-badge-dot kw-dot-red"></span>
            Missing Keywords ({safeMissing.length})
          </h4>
          <span className="keyword-block-subtitle">Present in JD but absent from your resume</span>
        </div>

        {safeMissing.length > 0 ? (
          <div className="chips-grid">
            {safeMissing.map((item, i) => {
              const kwName = typeof item === "string" ? item : item?.keyword || "Keyword";
              const importance = String(item?.importance || "important").toLowerCase();
              const why = item?.why || "Recommended in job description";

              return (
                <div key={i} className="chip chip-missing" title={why}>
                  <div className="chip-missing-content">
                    <span className="chip-kw-name">{kwName}</span>
                    <span className={`badge badge-${importance.replace(/\s+/g, "-")}`}>
                      {importance}
                    </span>
                  </div>
                  {why && <span className="chip-why-tooltip">{why}</span>}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="empty-chips-msg">Great job! No major missing keywords identified.</p>
        )}
      </div>
    </div>
  );
}
