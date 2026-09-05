import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, AlertTriangle, XCircle, RefreshCw, FileText } from "lucide-react";
import { resumeApi } from "../api/api";
import Toast from "./Toast";
import Loader from "./Loader";
import "./AtsScannerView.css";

/**
 * ATS Scanner — format & structure compliance check.
 *
 * Uses `resumeApi.atsCheck` (POST /api/resume/ats-check) to run a
 * deterministic rubric against the candidate's most-recent saved resume.
 * No LLM in the loop: same input always yields the same score.
 */
export default function AtsScannerView() {
  const navigate = useNavigate();
  const goHome = () => navigate("/dashboard");

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [resumeName, setResumeName] = useState("");

  const runCheck = useCallback(async () => {
    try {
      setLoading(true);
      setToastMessage("");
      const list = await resumeApi.list();
      if (!Array.isArray(list) || list.length === 0) {
        setResult(null);
        return;
      }
      const latest = list[0];
      const rec = await resumeApi.get(latest.id);
      if (!rec || !rec.candidate) {
        setResult(null);
        return;
      }
      setResumeName(rec.versionName || "Latest resume");
      const data = await resumeApi.atsCheck({ candidate: rec.candidate });
      setResult(data);
    } catch (err) {
      console.error("ATS check error:", err);
      setToastMessage(
        err.response?.data?.detail || err.message || "ATS check service is unavailable."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    runCheck();
  }, [runCheck]);

  const verdictBadge = (verdict) => {
    switch (verdict) {
      case "ats-ready":
        return { label: "ATS-Ready", cls: "verdict-ats-ready" };
      case "minor-fixes":
        return { label: "Minor Fixes Needed", cls: "verdict-minor-fixes" };
      default:
        return { label: "Needs Work", cls: "verdict-needs-work" };
    }
  };

  return (
    <div className="ats-scanner-container">
      <Toast message={toastMessage} type="error" onClose={() => setToastMessage("")} />

      <div className="ats-top-bar">
        <button type="button" className="btn-back-nav" onClick={goHome}>
          <ArrowLeft size={16} />
          <span>Dashboard</span>
        </button>
        <button
          type="button"
          className="btn-secondary btn-sm"
          onClick={runCheck}
          disabled={loading}
        >
          <RefreshCw size={14} /> Re-check
        </button>
      </div>

      {loading && <Loader message="Running ATS checks..." />}

      {!loading && !result && (
        <div className="ats-empty-state ui-card">
          <div className="empty-icon"><FileText size={40} /></div>
          <h2>No saved resume to scan</h2>
          <p>Build and save a resume first — the ATS scanner checks the format and structure of your most recent version.</p>
          <button type="button" className="btn btn-primary" onClick={() => navigate("/builder/new")}>
            Build a Resume
          </button>
        </div>
      )}

      {!loading && result && (
        <>
          <div className="ats-summary-card ui-card">
            <div className={`ats-score-circle ats-score-${result.verdict}`}>
              <span className="ats-score-value">{Math.round(result.score)}</span>
              <span className="ats-score-suffix">/100</span>
            </div>
            <div className="ats-summary-body">
              <div className="ats-summary-eyebrow">ATS Compliance {resumeName && `· ${resumeName}`}</div>
              <div className={`ats-verdict-pill ${verdictBadge(result.verdict).cls}`}>
                {verdictBadge(result.verdict).label}
              </div>
              <div className="ats-summary-stats">
                <span className="ats-stat pass"><CheckCircle2 size={14} /> {result.passed} passed</span>
                <span className="ats-stat warn"><AlertTriangle size={14} /> {result.warned} warnings</span>
                <span className="ats-stat fail"><XCircle size={14} /> {result.failed} failed</span>
              </div>
            </div>
          </div>

          <div className="ats-checks-grid">
            {result.checks.map((c) => (
              <div key={c.id} className={`ui-card ats-check-card ats-check-${c.status}`}>
                <div className="ats-check-head">
                  {c.status === "pass" && <CheckCircle2 size={18} className="ats-icon-pass" />}
                  {c.status === "warn" && <AlertTriangle size={18} className="ats-icon-warn" />}
                  {c.status === "fail" && <XCircle size={18} className="ats-icon-fail" />}
                  <h3 className="ats-check-label">{c.label}</h3>
                  <span className="ats-check-weight">+{c.weight}</span>
                </div>
                <p className="ats-check-detail">{c.detail}</p>
                {c.status !== "pass" && c.fix && (
                  <p className="ats-check-fix"><strong>Fix:</strong> {c.fix}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
