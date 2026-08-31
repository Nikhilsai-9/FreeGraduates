import React from "react";
import TemplateModern from "../templates/TemplateModern";
import TemplateMinimal from "../templates/TemplateMinimal";
import TemplateStudent from "../templates/TemplateStudent";
import TemplateClassic from "../templates/TemplateClassic";
import "./LiveCanvas.css";

export default function LiveCanvas({ resumeData, pendingSuggestions = [] }) {
  const templateId = resumeData?.templateId || "modern";
  const themeColor = resumeData?.themeColor || "#1a91f0";
  const fontSize = resumeData?.fontSize || "medium";

  const renderTemplate = () => {
    switch (templateId) {
      case "minimal":
        return <TemplateMinimal data={resumeData} themeColor={themeColor} fontSize={fontSize} pendingSuggestions={pendingSuggestions} />;
      case "student":
        return <TemplateStudent data={resumeData} themeColor={themeColor} fontSize={fontSize} pendingSuggestions={pendingSuggestions} />;
      case "classic":
        return <TemplateClassic data={resumeData} themeColor={themeColor} fontSize={fontSize} pendingSuggestions={pendingSuggestions} />;
      case "modern":
      default:
        return <TemplateModern data={resumeData} themeColor={themeColor} fontSize={fontSize} pendingSuggestions={pendingSuggestions} />;
    }
  };

  return (
    <div className="live-canvas-viewport">
      <div className="canvas-paper-wrapper" id="resume-print-area">
        {renderTemplate()}
      </div>
    </div>
  );
}
