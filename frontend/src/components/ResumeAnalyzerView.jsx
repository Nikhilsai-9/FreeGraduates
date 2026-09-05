// =====================================================================
// FreeGraduates — AI Resume Analyzer (diagnostic dashboard)
//
// WHAT THIS VIEW IS
//   Pure diagnose → explain → recommend. NO diff approval UI lives here.
//   The diff/approval screen is the OPTIMIZER's job (see OptimizerView).
//
// DATA SOURCE
//   Loads the most-recent saved resume from the backend. If there is none
//   the user sees a real empty state — we never fake a candidate.
//
//   `POST /api/resume/analyze` → returns
//     { score, verdict, matchedKeywords, missingKeywords,
//       matchedCount, missingCount, breakdown, diffs }
//
//   `diffs` are kept as recommendations only (no Apply buttons).
// =====================================================================

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { resumeApi } from "../api/api";
import Toast from "./Toast";
import Loader from "./Loader";
import {
  ArrowLeft,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Sparkles,
  Wand2,
  Target,
  Crosshair,
  Lightbulb,
  ListChecks,
} from "lucide-react";
import "./ResumeAnalyzerView.css";

const TABS = [
  { id: "overview",  label: "Overview" },
  { id: "keywords",  label: "Keywords" },
  { id: "sections",  label: "Sections" },
  { id: "actions",   label: "Recommendations" },
];

function verdictCopy(verdict) {
  switch (verdict) {
    case "excellent": return { label: "Excellent", tone: "excellent" };
    case "good":      return { label: "Strong",    tone: "good"      };
    case "fair":      return { label: "Developing",tone: "fair"      };
    default:          return { label: "Needs Work",tone: "poor"      };
  }
}

function scoreTone(score) {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

export default function ResumeAnalyzerView() {
  const navigate = useNavigate();

  const [resumeId, setResumeId]           = useState(null);
  const [versionName, setVersionName]     = useState("");
  const [jobText, setJobText]             = useState("");
  const [analysis, setAnalysis]           = useState(null);
  const [running, setRunning]             = useState(false);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState("");
  const [analyzedAt, setAnalyzedAt]       = useState(null);
  const [tab, setTab]                     = useState("overview");
  const [savedResumes, setSavedResumes]   = useState([]);

  // ---------- Load most-recent saved resume ----------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await resumeApi.list();
        if (cancelled) return;
        const arr = Array.isArray(list) ? list : [];
        setSavedResumes(arr);
        if (arr.length === 0) { setLoading(false); return; }
        const latest = arr[0];
        setResumeId(latest.id);
        setVersionName(latest.versionName || "Latest resume");
        if (latest.job?.description) {
          const parts = [];
          if (latest.job.role) parts.push(`Role: ${latest.job.role}`);
          if (latest.job.company) parts.push(`Company: ${latest.job.company}`);
          if (latest.job.description) parts.push(latest.job.description);
          setJobText(parts.join("\n\n"));
        }
      } catch (err) {
        if (!cancelled) setError("Could not load saved resumes: " + (err.message || err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---------- Run analysis ----------
  const runAnalysis = async () => {
    if (!resumeId) return;
    try {
      setRunning(true);
      setError("");
      const rec = await resumeApi.get(resumeId);
      if (!rec || !rec.candidate) {
        setError("This resume has no content to analyze yet.");
        return;
      }
      const result = await resumeApi.analyze({
        candidate: rec.candidate,
        job: { role: "", company: "", description: jobText },
      });
      setAnalysis(result || null);
      setAnalyzedAt(new Date());
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Analyzer service is unavailable.");
    } finally {
      setRunning(false);
    }
  };

  // Auto-run once a resume is loaded.
  useEffect(() => {
    if (resumeId && !analysis && !running) runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  const score = analysis?.score ?? 0;
  const verdict = analysis?.verdict || "needs-work";
  const breakdown = analysis?.breakdown || {};
  const matched = analysis?.matchedKeywords || [];
  const missing = analysis?.missingKeywords || [];
  const diffs   = analysis?.diffs || [];

  const strengths  = useMemo(() => buildStrengths(breakdown, diffs),  [breakdown, diffs]);
  const weaknesses = useMemo(() => buildWeaknesses(breakdown, diffs), [breakdown, diffs]);
  const sections   = useMemo(() => buildSections(breakdown, diffs),   [breakdown, diffs]);
  const priorities = useMemo(() => buildPriorities(diffs, breakdown), [diffs, breakdown]);

  if (loading) return <Loader message="Loading analyzer…" />;

  if (savedResumes.length === 0) {
    return (
      <div className="az-page az-empty">
        <FileText size={36} className="az-empty__icon" />
        <h2>No resume yet</h2>
        <p>Build your first resume, then come back here for an in-depth analysis.</p>
        <button type="button" className="az-btn az-btn--primary" onClick={() => navigate("/builder/new")}>
          <Sparkles size={14} /> Create your first resume
        </button>
      </div>
    );
  }

  return (
    <div className="az-page">
      <Toast message={error} type="error" onClose={() => setError("")} />

      <header className="az-header">
        <div className="az-header__left">
          <button type="button" className="az-btn az-btn--ghost az-btn--sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft size={14} /> Dashboard
          </button>
          <div>
            <div className="az-eyebrow">AI Resume Analyzer</div>
            <h1 className="az-title">{versionName || "Latest resume"}</h1>
            {analyzedAt && (
              <div className="az-subtitle">Last analyzed {analyzedAt.toLocaleString()}</div>
            )}
          </div>
        </div>
        <div className="az-header__right">
          {savedResumes.length > 1 && (
            <select
              className="az-select"
              value={resumeId || ""}
              onChange={(e) => { setResumeId(e.target.value); setAnalysis(null); }}
            >
              {savedResumes.map((r) => (
                <option key={r.id} value={r.id}>{r.versionName || r.id}</option>
              ))}
            </select>
          )}
          <button type="button" className="az-btn az-btn--primary" onClick={runAnalysis} disabled={running}>
            <RefreshCw size={14} className={running ? "az-spin" : ""} />
            {running ? "Analyzing…" : "Re-analyze"}
          </button>
          <Link to="/optimizer" className="az-btn az-btn--ghost">
            <Wand2 size={14} /> Open Optimizer
          </Link>
        </div>
      </header>

      <section className="az-jd">
        <label className="az-jd__label">
          <Target size={14} /> Optional — paste a target job description for a sharper match score.
        </label>
        <textarea
          className="az-jd__input"
          rows={3}
          placeholder="Paste the JD here. Leave blank to analyze the resume against general best practices."
          value={jobText}
          onChange={(e) => setJobText(e.target.value)}
        />
      </section>

      {running && <Loader message="Analyzing your resume…" />}


      {!running && analysis && (
        <>
          <section className="az-hero">
            <div className={`az-score az-score--${scoreTone(score)}`}>
              <div className="az-score__ring">
                <svg viewBox="0 0 120 120" aria-hidden="true">
                  <circle cx="60" cy="60" r="54" className="az-score__track" />
                  <circle
                    cx="60" cy="60" r="54"
                    className="az-score__fill"
                    style={{ strokeDasharray: `${(score / 100) * 339.3} 339.3` }}
                  />
                </svg>
                <div className="az-score__num">
                  <strong>{Math.round(score)}</strong><span>/100</span>
                </div>
              </div>
              <div className={`az-score__pill az-pill az-pill--${verdictCopy(verdict).tone}`}>
                {verdictCopy(verdict).label}
              </div>
              <div className="az-score__caption">Resume Score</div>
            </div>

            <div className="az-hero__metrics">
              {[
                { k: "keywordMatch", label: "Keyword Match",       Icon: Crosshair     },
                { k: "actionVerbs",  label: "Action Verbs",        Icon: TrendingUp    },
                { k: "metrics",      label: "Measurable Outcomes", Icon: ListChecks    },
                { k: "completeness", label: "Completeness",        Icon: CheckCircle2  },
                { k: "summary",      label: "Summary",             Icon: Lightbulb     },
              ].map(({ k, label, Icon }) => (
                <div key={k} className="az-metric">
                  <div className="az-metric__label"><Icon size={12} /> {label}</div>
                  <div className="az-metric__bar">
                    <div style={{ width: `${Math.round(breakdown[k] ?? 0)}%` }} />
                  </div>
                  <div className="az-metric__value">{Math.round(breakdown[k] ?? 0)}%</div>
                </div>
              ))}
            </div>
          </section>

          <nav className="az-tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`az-tab ${tab === t.id ? "is-active" : ""}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {tab === "overview" && (
            <section className="az-grid az-grid--2">
              <article className="az-card az-card--good">
                <h3 className="az-card__title"><CheckCircle2 size={16} /> Strengths</h3>
                <ul className="az-list">
                  {strengths.length === 0
                    ? <li className="az-muted">No standout strengths yet — see Recommendations.</li>
                    : strengths.map((s, i) => <li key={i}>{s}</li>)}
                </ul>
              </article>
              <article className="az-card az-card--warn">
                <h3 className="az-card__title"><AlertTriangle size={16} /> Issues to fix</h3>
                <ul className="az-list">
                  {weaknesses.length === 0
                    ? <li className="az-muted">No major issues detected.</li>
                    : weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </article>
            </section>
          )}

          {tab === "keywords" && (
            <section className="az-card">
              <h3 className="az-card__title">Keyword match</h3>
              <p className="az-muted az-card__sub">
                {matched.length} matched · {missing.length} missing
                {jobText.trim() ? "" : " · add a JD above to refine these lists"}
              </p>
              <div className="az-keyword-block">
                <h4>Matched</h4>
                {matched.length === 0
                  ? <div className="az-muted">No matched keywords yet.</div>
                  : <div className="az-chip-row">
                      {matched.map((k) => <span key={k} className="az-chip az-chip--good">{k}</span>)}
                    </div>}
              </div>
              <div className="az-keyword-block">
                <h4>Missing</h4>
                {missing.length === 0
                  ? <div className="az-muted">No missing keywords detected.</div>
                  : <div className="az-chip-row">
                      {missing.map((k) => <span key={k} className="az-chip az-chip--bad">{k}</span>)}
                    </div>}
              </div>
            </section>
          )}

          {tab === "sections" && (
            <section className="az-card">
              <h3 className="az-card__title">Section analysis</h3>
              <p className="az-muted az-card__sub">How each part of your resume is performing.</p>
              <table className="az-section-table">
                <thead>
                  <tr><th>Section</th><th>Status</th><th>Detail</th></tr>
                </thead>
                <tbody>
                  {sections.map((s) => (
                    <tr key={s.name}>
                      <td className="az-section-name">{s.name}</td>
                      <td><span className={`az-pill az-pill--${s.tone}`}>{s.label}</span></td>
                      <td className="az-muted">{s.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {tab === "actions" && (
            <section className="az-grid">
              {priorities.length === 0 ? (
                <article className="az-card"><div className="az-muted">No recommendations.</div></article>
              ) : priorities.map((p) => (
                <article key={p.id} className={`az-card az-reco az-reco--${p.tone}`}>
                  <div className="az-reco__head">
                    <span className={`az-pill az-pill--${p.tone}`}>{p.priority}</span>
                    <span className="az-reco__section">{p.section}</span>
                  </div>
                  <h4 className="az-reco__title">{p.title}</h4>
                  <div className="az-reco__body">
                    <div className="az-reco__row"><strong>Problem.</strong> <span>{p.problem}</span></div>
                    <div className="az-reco__row"><strong>Why it matters.</strong> <span>{p.why}</span></div>
                    <div className="az-reco__row"><strong>Suggested action.</strong> <span>{p.action}</span></div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}

// ---------- Derived helpers ----------


function buildStrengths(breakdown = {}, diffs = []) {
  const items = [];
  if ((breakdown.keywordMatch ?? 0) >= 70) items.push("Strong keyword alignment with the target role.");
  if ((breakdown.actionVerbs  ?? 0) >= 70) items.push("Bullets start with strong action verbs.");
  if ((breakdown.metrics      ?? 0) >= 70) items.push("Most bullets include measurable outcomes.");
  if ((breakdown.completeness ?? 0) >= 80) items.push("All standard sections are present.");
  if ((breakdown.summary      ?? 0) >= 70) items.push("Professional summary is well-aligned with the role.");
  if (diffs.length === 0) items.push("No rule-based gaps were detected.");
  return items;
}

function buildWeaknesses(breakdown = {}, diffs = []) {
  const items = [];
  if ((breakdown.keywordMatch ?? 0) < 60) items.push("Low keyword overlap with the target job description.");
  if ((breakdown.actionVerbs  ?? 0) < 60) items.push("Many bullets start with weak or passive verbs.");
  if ((breakdown.metrics      ?? 0) < 60) items.push("Bullets lack measurable outcomes (%, $, scale, time).");
  if ((breakdown.completeness ?? 0) < 70) items.push("Standard sections are incomplete.");
  if ((breakdown.summary      ?? 0) < 60) items.push("Professional summary is missing or off-target.");
  diffs.forEach((d) => items.push(`${d.title} — ${d.explanation}`));
  return Array.from(new Set(items));
}

function buildSections(breakdown = {}, diffs = []) {
  const tone = (v) => v >= 70 ? "good" : v >= 50 ? "fair" : "poor";
  const labelFor = (t) => ({ good: "Good", fair: "Needs improvement", poor: "Missing / weak" }[t]);

  return [
    { name: "Personal information", tone: tone(breakdown.completeness ?? 0),
      detail: "Contact details and identity." },
    { name: "Professional summary", tone: tone(breakdown.summary ?? 0),
      detail: "Value proposition aligned to the role." },
    { name: "Experience", tone: tone(breakdown.actionVerbs ?? 0),
      detail: "Action-verb-led bullets with measurable outcomes." },
    { name: "Skills", tone: tone(breakdown.keywordMatch ?? 0),
      detail: "Match against target role keywords." },
    { name: "Education", tone: diffs.some((d) => d.section === "education") ? "poor" : "good",
      detail: "Degree and institution records." },
  ].map((s) => ({ ...s, label: labelFor(s.tone) }));
}

function buildPriorities(diffs = [], breakdown = {}) {
  const p0 = diffs.filter((d) => (breakdown.keywordMatch ?? 0) < 50 || d.section === "education");
  const p1 = diffs.filter((d) => d.section === "experience" && (breakdown.actionVerbs ?? 0) < 70);
  const p2 = diffs.filter((d) => d.section === "skills" || d.section === "summary");

  const items = [];
  p0.forEach((d) => items.push({
    id: d.id, priority: "P0 — Fix immediately", tone: "bad",
    section: d.section || "general", title: d.title,
    problem: d.explanation,
    why: "Recruiters and ATS both penalise missing fundamentals.",
    action: d.recommendedText ? `Add: ${d.recommendedText}` : "Open the builder and fill this section.",
  }));
  p1.forEach((d) => items.push({
    id: d.id, priority: "P1 — Improve next", tone: "warn",
    section: d.section || "general", title: d.title,
    problem: d.explanation,
    why: "Strong bullets dramatically raise screen-through rates.",
    action: "Rewrite the bullet in the Builder with action verb + metric.",
  }));
  p2.forEach((d) => items.push({
    id: d.id, priority: "P2 — Optional polish", tone: "fair",
    section: d.section || "general", title: d.title,
    problem: d.explanation,
    why: "Higher-impact changes are above; revisit when iterating.",
    action: "Consider tightening the wording or moving terms higher in the resume.",
  }));
  if (items.length === 0) {
    items.push({
      id: "ok", priority: "All clear", tone: "good", section: "—",
      title: "No rule-based issues",
      problem: "The analyzer did not detect rule-based gaps.",
      why: "Score reflects a healthy baseline.",
      action: "Open the Optimizer for AI-driven tailoring to a specific JD.",
    });
  }
  return items;
}


