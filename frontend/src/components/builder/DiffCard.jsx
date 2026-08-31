import React from "react";
import "./DiffCard.css";

export default function DiffCard({ suggestion, onAccept, onReject }) {
  if (!suggestion) return null;

  return (
    <div className="diff-card-item">
      <div className="diff-card-header">
        <span className="diff-section-tag">Target: {suggestion.section}</span>
        <span className="diff-status-badge">Pending Review</span>
      </div>

      <div className="diff-content-comparison">
        <div className="diff-box diff-original">
          <div className="diff-box-label">ORIGINAL CONTENT</div>
          <p className="diff-text">{suggestion.originalContent || "(Section Empty)"}</p>
        </div>

        <div className="diff-box diff-suggested">
          <div className="diff-box-label">AI SUGGESTED IMPROVEMENT</div>
          <p className="diff-text">{suggestion.suggestedContent}</p>
          {suggestion.reason && (
            <div className="diff-reason-note">
              💡 <strong>Why:</strong> {suggestion.reason}
            </div>
          )}
        </div>
      </div>

      <div className="diff-actions-row">
        <button
          type="button"
          className="btn btn-danger btn-sm"
          onClick={() => onReject(suggestion)}
        >
          ✗ Reject
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onAccept(suggestion)}
        >
          ✓ Accept & Apply to Resume
        </button>
      </div>
    </div>
  );
}
