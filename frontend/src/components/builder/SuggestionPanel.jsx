import React, { useState } from "react";
import DiffCard from "./DiffCard";
import "./SuggestionPanel.css";

export default function SuggestionPanel({
  resumeData,
  pendingSuggestions = [],
  missingKeywords = [],
  targetRoleMatchScore = 75,
  onGenerateSuggestions,
  onAcceptSuggestion,
  onRejectSuggestion,
  onAcceptAll,
  onAddKeyword,
  loading
}) {
  const [jdText, setJdText] = useState(resumeData?.targetJobDescription || "");

  const pendingList = (pendingSuggestions || []).filter((s) => s.status === "pending");

  return (
    <div className="suggestion-panel-wrapper">
      {/* Target JD & Trigger Section */}
      <div className="panel-box-card">
        <h3 className="panel-box-title">Target Job Optimization</h3>
        <p className="panel-box-desc">
          Paste your target Job Description below. AI will analyze gaps, extract missing technical terms, and propose quantified bullet rewrites.
        </p>

        <textarea
          className="jd-panel-textarea"
          rows={5}
          placeholder="Paste Job Description here..."
          value={jdText}
          onChange={(e) => setJdText(e.target.value)}
        ></textarea>

        <button
          type="button"
          className="btn btn-primary btn-sm"
          style={{ width: "100%", marginTop: "10px" }}
          disabled={loading || !jdText || jdText.trim().length < 30}
          onClick={() => onGenerateSuggestions(jdText.trim())}
        >
          {loading ? "Analyzing & Generating Diffs..." : "⚡ Generate AI Improvements"}
        </button>
      </div>

      {/* Target Role Match Rating */}
      {targetRoleMatchScore > 0 && (
        <div className="match-score-strip">
          <span>Target JD Role Match:</span>
          <strong>{targetRoleMatchScore}%</strong>
        </div>
      )}

      {/* Missing Keywords Quick-Adder */}
      {(missingKeywords || []).length > 0 && (
        <div className="panel-box-card">
          <h4 className="panel-box-subtitle">Missing JD Keywords</h4>
          <p className="panel-box-desc">Click any keyword to add it to your Technical Skills list:</p>
          <div className="missing-kw-chips">
            {missingKeywords.map((kw, idx) => (
              <button
                key={idx}
                type="button"
                className="kw-add-btn"
                onClick={() => onAddKeyword(kw)}
                title={`Click to add ${kw} to skills`}
              >
                + {kw}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pending Diff Suggestions Review Section */}
      <div className="panel-box-card">
        <div className="suggestions-header-row">
          <h3 className="panel-box-title">Pending Suggestions ({pendingList.length})</h3>
          {pendingList.length > 0 && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onAcceptAll}
            >
              ✓ Accept All Changes
            </button>
          )}
        </div>

        {pendingList.length > 0 ? (
          <div className="diff-cards-stack">
            {pendingList.map((item) => (
              <DiffCard
                key={item.id || item._id}
                suggestion={item}
                onAccept={onAcceptSuggestion}
                onReject={onRejectSuggestion}
              />
            ))}
          </div>
        ) : (
          <div className="empty-panel-msg">
            <p>No pending AI suggestions right now. Click "Generate AI Improvements" above to get customized recommendations.</p>
          </div>
        )}
      </div>
    </div>
  );
}
