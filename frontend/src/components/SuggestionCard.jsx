import React, { useState } from "react";
import "./SuggestionCard.css";

export default function SuggestionCard({ bulletRewrites = [], layoutSuggestions = [] }) {
  const [copiedIndex, setCopiedIndex] = useState(null);

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const safeBullets = Array.isArray(bulletRewrites) ? bulletRewrites : [];
  const safeLayouts = Array.isArray(layoutSuggestions) ? layoutSuggestions : [];

  return (
    <div className="suggestions-container">
      {/* Bullet Rewrites */}
      <div className="suggestion-section-block">
        <h4 className="suggestion-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
          Bullet Point Rewrites ({safeBullets.length})
        </h4>
        <p className="suggestion-section-desc">
          AI-optimized bullet points rewritten with action verbs, quantified metrics, and target JD keywords.
        </p>

        {safeBullets.length > 0 ? (
          <div className="bullet-cards-list">
            {safeBullets.map((item, idx) => (
              <div key={idx} className="bullet-rewrite-card">
                <div className="bullet-original-box">
                  <div className="bullet-box-label label-original">ORIGINAL</div>
                  <p className="bullet-text text-original">{item?.original}</p>
                </div>

                <div className="bullet-improved-box">
                  <div className="improved-header-row">
                    <div className="bullet-box-label label-improved">IMPROVED (ACTION + METRIC + JD KEYWORD)</div>
                    <button
                      type="button"
                      className={`btn-copy ${copiedIndex === idx ? "copied" : ""}`}
                      onClick={() => handleCopy(item?.improved, idx)}
                      title="Copy improved bullet to clipboard"
                    >
                      {copiedIndex === idx ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                          Copied
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                  <p className="bullet-text text-improved">{item?.improved}</p>
                  {item?.reason && (
                    <div className="bullet-reason-note">
                      <strong>Why this helps:</strong> {item.reason}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-state-text">No specific bullet point rewrites generated.</p>
        )}
      </div>

      {/* Layout & Structure Suggestions */}
      <div className="suggestion-section-block">
        <h4 className="suggestion-section-title">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          Layout & Formatting Suggestions ({safeLayouts.length})
        </h4>
        <p className="suggestion-section-desc">
          Recommendations to enhance ATS readability, visual hierarchy, and section ordering.
        </p>

        {safeLayouts.length > 0 ? (
          <ul className="layout-suggestions-list">
            {safeLayouts.map((sug, idx) => (
              <li key={idx} className="layout-suggestion-item">
                <div className="layout-item-icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                </div>
                <span>{sug}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="empty-state-text">No layout adjustments needed.</p>
        )}
      </div>
    </div>
  );
}
