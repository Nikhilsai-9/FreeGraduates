import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { resumeApi } from "../api/api";
import Toolbar from "../components/builder/Toolbar";
import LiveCanvas from "../components/builder/LiveCanvas";
import SuggestionPanel from "../components/builder/SuggestionPanel";
import FormEditor from "../components/builder/FormEditor";
import Loader from "../components/Loader";
import Toast from "../components/Toast";
import "./Builder.css";

export default function Builder() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [resumeData, setResumeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("error");

  const [rightPanelTab, setRightPanelTab] = useState("ai"); // 'ai' | 'form'
  const [targetRoleMatchScore, setTargetRoleMatchScore] = useState(78);
  const [missingKeywords, setMissingKeywords] = useState([]);

  // Load Resume by ID
  useEffect(() => {
    async function loadResume() {
      if (id === "new") {
        navigate("/builder/new");
        return;
      }
      try {
        setLoading(true);
        const res = await resumeApi.getResume(id);
        if (res && res.data) {
          setResumeData(res.data);
        } else {
          throw new Error("Resume not found.");
        }
      } catch (err) {
        console.error("Error loading resume:", err);
        setToastType("error");
        setToastMessage(err.response?.data?.message || err.message || "Failed to load resume.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      loadResume();
    }
  }, [id]);

  // Auto-save changes to DB (debounced)
  const saveResumeToCloud = async (updatedData) => {
    if (!id || id === "new") return;
    try {
      setSaving(true);
      await resumeApi.updateResume(id, updatedData);
    } catch (err) {
      console.warn("Auto-save warning:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDataChange = (updated) => {
    setResumeData(updated);
    saveResumeToCloud(updated);
  };

  // Generate AI Suggestions
  const handleGenerateSuggestions = async (jobDescription) => {
    try {
      setAiLoading(true);
      setToastMessage("");
      const res = await resumeApi.suggestImprovements(id, jobDescription);
      if (res && res.data) {
        setResumeData(res.data.resume);
        if (res.data.targetRoleMatchScore) setTargetRoleMatchScore(res.data.targetRoleMatchScore);
        if (res.data.missingKeywords) setMissingKeywords(res.data.missingKeywords);
        setToastType("success");
        setToastMessage("✓ AI Suggestions generated based on target job description!");
      }
    } catch (err) {
      console.error("Error generating AI suggestions:", err);
      setToastType("error");
      setToastMessage(err.response?.data?.message || err.message || "Failed to generate AI improvements.");
    } finally {
      setAiLoading(false);
    }
  };

  // Accept a single AI Diff suggestion
  const handleAcceptSuggestion = (suggestion) => {
    if (!resumeData) return;

    const updated = { ...resumeData };
    const sec = suggestion.section;

    // Apply content based on section
    if (sec === "summary") {
      updated.summary = suggestion.suggestedContent;
    } else if (sec === "experience") {
      // Find matching experience bullet or append
      const experiences = [...(updated.workExperience || [])];
      let applied = false;

      for (let exp of experiences) {
        if (exp.id === suggestion.targetId || (exp.bullets || []).includes(suggestion.originalContent)) {
          const bIdx = exp.bullets.indexOf(suggestion.originalContent);
          if (bIdx !== -1) {
            exp.bullets[bIdx] = suggestion.suggestedContent;
          } else {
            exp.bullets.push(suggestion.suggestedContent);
          }
          applied = true;
          break;
        }
      }

      if (!applied && experiences.length > 0) {
        experiences[0].bullets.push(suggestion.suggestedContent);
      }
      updated.workExperience = experiences;
    } else if (sec === "skills") {
      const tech = [...(updated.skills?.technical || [])];
      if (!tech.includes(suggestion.suggestedContent)) {
        tech.push(suggestion.suggestedContent);
      }
      updated.skills = { ...updated.skills, technical: tech };
    }

    // Mark suggestion status as accepted
    const pending = (updated.pendingSuggestions || []).map((s) =>
      (s.id || s._id) === (suggestion.id || suggestion._id) ? { ...s, status: "accepted" } : s
    );

    updated.pendingSuggestions = pending;
    handleDataChange(updated);
    setToastType("success");
    setToastMessage("✓ Suggestion accepted and applied to resume preview!");
  };

  // Reject a single AI Diff suggestion
  const handleRejectSuggestion = (suggestion) => {
    if (!resumeData) return;

    const updated = { ...resumeData };
    const pending = (updated.pendingSuggestions || []).map((s) =>
      (s.id || s._id) === (suggestion.id || suggestion._id) ? { ...s, status: "rejected" } : s
    );

    updated.pendingSuggestions = pending;
    handleDataChange(updated);
  };

  // Accept ALL pending suggestions
  const handleAcceptAll = () => {
    if (!resumeData) return;

    let updated = { ...resumeData };
    const pendingList = (updated.pendingSuggestions || []).filter((s) => s.status === "pending");

    pendingList.forEach((s) => {
      if (s.section === "summary") {
        updated.summary = s.suggestedContent;
      } else if (s.section === "experience") {
        if (updated.workExperience && updated.workExperience.length > 0) {
          updated.workExperience[0].bullets.push(s.suggestedContent);
        }
      }
    });

    updated.pendingSuggestions = (updated.pendingSuggestions || []).map((s) => ({ ...s, status: "accepted" }));
    handleDataChange(updated);
    setToastType("success");
    setToastMessage("✓ All pending AI suggestions accepted and applied!");
  };

  // Add missing keyword to skills
  const handleAddKeyword = (kw) => {
    if (!resumeData || !kw) return;

    const updated = { ...resumeData };
    const tech = [...(updated.skills?.technical || [])];
    if (!tech.includes(kw)) {
      tech.push(kw);
      updated.skills = { ...updated.skills, technical: tech };
      handleDataChange(updated);
      setToastType("success");
      setToastMessage(`✓ Added "${kw}" to Technical Skills.`);
    }
  };

  // Export DOCX
  const handleExportDocx = () => {
    const downloadUrl = resumeApi.exportDocxUrl(id);
    window.open(downloadUrl, "_blank");
  };

  // Export PDF (Print view)
  const handleExportPdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="builder-loading-container">
        <div className="loader-spinner-ring" style={{ width: 44, height: 44 }}></div>
        <p>Loading interactive resume editor…</p>
      </div>
    );
  }

  if (!resumeData) return null;

  return (
    <div className="builder-workspace-page">
      <Loader active={aiLoading} />
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage("")} />

      {/* Top Interactive Toolbar */}
      <Toolbar
        title={resumeData.title || "Untitled Resume"}
        onTitleChange={(t) => handleDataChange({ ...resumeData, title: t })}
        templateId={resumeData.templateId || "modern"}
        onTemplateChange={(t) => handleDataChange({ ...resumeData, templateId: t })}
        themeColor={resumeData.themeColor || "#1a91f0"}
        onThemeColorChange={(c) => handleDataChange({ ...resumeData, themeColor: c })}
        fontSize={resumeData.fontSize || "medium"}
        onFontSizeChange={(f) => handleDataChange({ ...resumeData, fontSize: f })}
        onExportPdf={handleExportPdf}
        onExportDocx={handleExportDocx}
        onSave={() => saveResumeToCloud(resumeData)}
        saving={saving}
        onRequestAi={() => setRightPanelTab("ai")}
      />

      {/* Split-Screen Workspace (Left Canvas, Right Control Panel) */}
      <div className="builder-split-screen">
        {/* LEFT PANE: WYSIWYG Resume Preview Canvas */}
        <div className="builder-left-pane">
          <LiveCanvas resumeData={resumeData} pendingSuggestions={resumeData.pendingSuggestions} />
        </div>

        {/* RIGHT PANE: AI Assistant & Form Controls */}
        <div className="builder-right-pane no-print">
          <div className="right-panel-tabs">
            <button
              className={`rp-tab ${rightPanelTab === "ai" ? "active" : ""}`}
              onClick={() => setRightPanelTab("ai")}
            >
              🤖 AI Assistant & Diffs
            </button>
            <button
              className={`rp-tab ${rightPanelTab === "form" ? "active" : ""}`}
              onClick={() => setRightPanelTab("form")}
            >
              ✍️ Edit Raw Content
            </button>
          </div>

          <div className="right-panel-body">
            {rightPanelTab === "ai" ? (
              <SuggestionPanel
                resumeData={resumeData}
                pendingSuggestions={resumeData.pendingSuggestions}
                missingKeywords={missingKeywords}
                targetRoleMatchScore={targetRoleMatchScore}
                onGenerateSuggestions={handleGenerateSuggestions}
                onAcceptSuggestion={handleAcceptSuggestion}
                onRejectSuggestion={handleRejectSuggestion}
                onAcceptAll={handleAcceptAll}
                onAddKeyword={handleAddKeyword}
                loading={aiLoading}
              />
            ) : (
              <FormEditor resumeData={resumeData} onChange={handleDataChange} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
