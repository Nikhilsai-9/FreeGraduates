import React from "react";
import "./Toolbar.css";

const THEME_COLORS = ["#1a91f0", "#0f172a", "#16a34a", "#5660e8", "#b83d1b", "#8c3b62"];

export default function Toolbar({
  title,
  onTitleChange,
  templateId,
  onTemplateChange,
  themeColor,
  onThemeColorChange,
  fontSize,
  onFontSizeChange,
  onExportPdf,
  onExportDocx,
  onSave,
  saving,
  onRequestAi
}) {
  return (
    <div className="builder-toolbar-bar no-print">
      <div className="toolbar-left-group">
        <input
          type="text"
          className="toolbar-title-input"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Resume Title..."
        />
        <span className="save-status-indicator">
          {saving ? "Saving…" : "✓ Saved"}
        </span>
      </div>

      <div className="toolbar-controls-group">
        {/* Template Selector */}
        <div className="control-picker">
          <label>Template:</label>
          <select value={templateId} onChange={(e) => onTemplateChange(e.target.value)}>
            <option value="modern">Modern Tech</option>
            <option value="minimal">Minimal SDE</option>
            <option value="student">Student / Campus</option>
            <option value="classic">Executive Classic</option>
          </select>
        </div>

        {/* Theme Color Picker */}
        <div className="control-picker">
          <label>Accent:</label>
          <div className="color-swatches">
            {THEME_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch-btn ${themeColor === c ? "active" : ""}`}
                style={{ backgroundColor: c }}
                onClick={() => onThemeColorChange(c)}
              />
            ))}
          </div>
        </div>

        {/* Font Size Toggle */}
        <div className="control-picker">
          <label>Font:</label>
          <select value={fontSize} onChange={(e) => onFontSizeChange(e.target.value)}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>

        {/* AI Improve Action */}
        <button type="button" className="btn btn-secondary btn-sm" onClick={onRequestAi}>
          🤖 Ask AI Suggestions
        </button>

        {/* Export Buttons */}
        <div className="export-btn-group">
          <button type="button" className="btn btn-secondary btn-sm" onClick={onExportDocx}>
            📄 Export DOCX
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={onExportPdf}>
            🖨️ Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}
