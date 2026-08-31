import React from "react";
import "./JDInput.css";

export default function JDInput({ value = "", onChange }) {
  const charCount = value.length;
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const isTooShort = charCount > 0 && charCount < 50;

  return (
    <div className="jd-input-wrapper">
      <div className="jd-label-row">
        <label htmlFor="jdTextarea" className="jd-label">
          Target Job Description <span className="req">*</span>
        </label>
        <div className="jd-counter">
          <span>{wordCount} words</span>
          <span>&bull;</span>
          <span className={isTooShort ? "counter-short" : ""}>
            {charCount} / min 50 chars
          </span>
        </div>
      </div>

      <textarea
        id="jdTextarea"
        className={`jd-textarea ${isTooShort ? "textarea-invalid" : ""}`}
        placeholder="Paste the full job description or requirements here (minimum 50 characters)..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={7}
      ></textarea>

      {isTooShort && (
        <p className="jd-inline-warning">
          Please enter at least {50 - charCount} more character{50 - charCount > 1 ? "s" : ""} to enable analysis.
        </p>
      )}
    </div>
  );
}
