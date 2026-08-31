import React, { useEffect, useState } from "react";
import "./ScoreCircle.css";

export default function ScoreCircle({ score = 0, size = 160, strokeWidth = 12 }) {
  const [animatedScore, setAnimatedScore] = useState(0);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Clamped score between 0 and 100
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  // Color by band: red <50, amber 50-74, green >=75
  let strokeColor = "#dc2626"; // red
  let bandClass = "score-low";
  if (normalizedScore >= 75) {
    strokeColor = "#16a34a"; // green
    bandClass = "score-high";
  } else if (normalizedScore >= 50) {
    strokeColor = "#d97706"; // amber
    bandClass = "score-mid";
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedScore(normalizedScore);
    }, 100);
    return () => clearTimeout(timer);
  }, [normalizedScore]);

  const offset = circumference - (animatedScore / 100) * circumference;

  return (
    <div className={`score-circle-wrapper ${bandClass}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="score-circle-svg">
        {/* Background Track */}
        <circle
          className="score-track"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />
        {/* Animated Progress Indicator */}
        <circle
          className="score-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={strokeColor}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="score-content">
        <span className="score-number">{normalizedScore}</span>
        <span className="score-label">MATCH SCORE</span>
      </div>
    </div>
  );
}
