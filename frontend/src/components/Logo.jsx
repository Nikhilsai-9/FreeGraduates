import React from "react";

/**
 * FreeGraduates Logo — Single Source of Truth
 * 
 * Renders the official brand icon from favicon.svg inline.
 * Supports icon-only mode or icon + wordmark.
 * 
 * Props:
 *   showWordmark (boolean) - show "FreeGraduates" text next to icon
 *   size (number) - icon size in px (default 36)
 *   className (string) - additional CSS class
 */
export default function Logo({ showWordmark = true, size = 36, className = "" }) {
  return (
    <div className={`fg-logo-component ${className}`} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      {/* Official FreeGraduates brand icon — matches favicon.svg */}
      <div
        className="fg-logo-icon"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: `${Math.round(size * 0.25)}px`,
          backgroundColor: "#1a91f0",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0
        }}
      >
        <svg
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ width: `${Math.round(size * 0.6)}px`, height: `${Math.round(size * 0.6)}px` }}
        >
          <path
            d="M9 23V9h14M9 16h10M15 9l8 8"
            stroke="white"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {showWordmark && (
        <span
          className="fg-logo-wordmark"
          style={{
            fontSize: `${Math.max(14, Math.round(size * 0.47))}px`,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            color: "var(--color-ink-primary, #0f172a)",
            whiteSpace: "nowrap",
            lineHeight: 1
          }}
        >
          Free<span style={{ color: "#1a91f0" }}>Graduates</span>
        </span>
      )}
    </div>
  );
}
