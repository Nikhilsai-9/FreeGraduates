import React, { useState, useEffect } from "react";
import "./Loader.css";

const STATUS_MESSAGES = [
  "Reading your resume…",
  "Extracting sections and skills…",
  "Comparing against the job description…",
  "Evaluating keyword density and ATS metrics…",
  "Generating actionable fix suggestions and rewrites…"
];

export default function Loader({ active = false }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % STATUS_MESSAGES.length);
    }, 2200);

    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div className="full-screen-loader" role="dialog" aria-modal="true" aria-label="Analyzing resume">
      <div className="loader-card">
        <div className="loader-spinner-ring">
          <div className="spinner-inner"></div>
        </div>
        <h3 className="loader-title">AI Analysis in Progress</h3>
        <p className="loader-status-text" key={index}>
          {STATUS_MESSAGES[index]}
        </p>
        <div className="loader-progress-bar">
          <div className="loader-progress-fill"></div>
        </div>
        <span className="loader-subtext">Usually takes ~5 to 10 seconds</span>
      </div>
    </div>
  );
}
