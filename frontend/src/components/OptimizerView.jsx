import React, { useEffect, useMemo, useState } from "react";
import "./OptimizerView.css";
import { optimizerApi, resumeApi } from "../api/api";
import { useAuth } from "../context/AuthContext";
import ScoreCircle from "./ScoreCircle";

/**
 * OptimizerView
 * --------------
 * Lists saved resume-optimizations and lets the user:
 *   1. Pick a saved resume as the base.
 *   2. Paste a JD and (optionally) a target role/company.
 *   3. Create a new optimization.
 *   4. Run "Analyze" to see the match score + gaps.
 *   5. Run "Tailor" to get a rewritten candidate + change list.
 *   6. Delete an optimization.
 */
const OptimizerView = () => {
  const { currentUser } = useAuth();
  const [optimizations, setOptimizations] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [targetCompany, setTargetCompany] = useState("");
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [creating, setCreating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [error, setError] = useState("");

  const sortedOptimizations = useMemo(() => {
    return [...optimizations].sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, [optimizations]);

  useEffect(() => {
    if (!currentUser) return;
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  async function refreshAll() {
    setLoadingList(true);
    setError("");
    try {
      const [optList, resumeList] = await Promise.all([
        optimizerApi.list().catch(() => []),
        resumeApi.list().catch(() => []),
      ]);
      setOptimizations(Array.isArray(optList) ? optList : []);
      const list = Array.isArray(resumeList) ? resumeList : [];
      setResumes(list);
      if (!selectedResumeId && list.length > 0) {
        setSelectedResumeId(list[0].id);
      }
    } catch (e) {
      console.error(e);
      setError("Could not load your saved resumes and optimizations.");
    } finally {
      setLoadingList(false);
    }
  }

  async function loadActive(id) {
    setActiveId(id);
    setActive(null);
    try {
      const rec = await optimizerApi.get(id);
      setActive(rec);
      setTargetRole(rec.targetRole || "");
      setTargetCompany(rec.targetCompany || "");
      setJobDescription(rec.jobDescription || "");
      setSelectedResumeId(rec.resumeId || selectedResumeId);
    } catch (e) {
      console.error(e);
      setError("Could not load that optimization.");
    }
  }

  async function handleCreate(e) {
    e?.preventDefault?.();
    if (!selectedResumeId || !jobDescription.trim()) {
      setError("Pick a base resume and paste a job description.");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const rec = await optimizerApi.create({
        resumeId: selectedResumeId,
        jobDescription: jobDescription.trim(),
        targetRole: targetRole.trim() || undefined,
        targetCompany: targetCompany.trim() || undefined,
      });
      await refreshAll();
      await loadActive(rec.id);
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.detail || "Could not create optimization.");
    } finally {
      setCreating(false);
    }
  }

  async function handleAnalyze() {
    if (!active) return;
    setAnalyzing(true);
    setError("");
    try {
      const res = await optimizerApi.analyze(active.id);
      const fresh = await optimizerApi.get(active.id);
      setActive(fresh);
      setAnalyzing(false);
      void res;
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.detail || "Analyze failed.");
      setAnalyzing(false);
    }
  }

  async function handleTailor() {
    if (!active) return;
    setTailoring(true);
    setError("");
    try {
      const res = await optimizerApi.tailor(active.id);
      const fresh = await optimizerApi.get(active.id);
      setActive(fresh);
      void res;
    } catch (e) {
      console.error(e);
      setError(e?.response?.data?.detail || "Tailor failed.");
    } finally {
      setTailoring(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this optimization?")) return;
    try {
      await optimizerApi.remove(id);
      if (activeId === id) {
        setActive(null);
        setActiveId(null);
      }
      await refreshAll();
    } catch (e) {
      console.error(e);
      setError("Could not delete optimization.");
    }
  }

  return (
    <div className="optimizer-view">
      <header className="optimizer-view__header">
        <h1>Resume Optimizer</h1>
        <p>
          Tune any saved resume to a specific job description. We score the
          match, find the gaps, and rewrite the candidate for you.
        </p>
      </header>

      <div className="optimizer-view__grid">
        {/* Left: list of optimizations + new-optimization form */}
        <section className="optimizer-view__left">
          <form className="opt-new" onSubmit={handleCreate}>
            <h2>New optimization</h2>
            <label className="opt-field">
              <span>Base resume</span>
              <select
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
              >
                {resumes.length === 0 && (
                  <option value="">No saved resumes yet</option>
                )}
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.versionName || r.id}
                  </option>
                ))}
              </select>
            </label>
            <label className="opt-field">
              <span>Job description</span>
              <textarea
                rows={6}
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Paste the full job description here..."
              />
            </label>
            <div className="opt-field-row">
              <label className="opt-field">
                <span>Target role (optional)</span>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Senior Software Engineer"
                />
              </label>
              <label className="opt-field">
                <span>Target company (optional)</span>
                <input
                  type="text"
                  value={targetCompany}
                  onChange={(e) => setTargetCompany(e.target.value)}
                  placeholder="Acme Corp"
                />
              </label>
            </div>
            <button
              type="submit"
              className="opt-btn opt-btn--primary"
              disabled={creating}
            >
              {creating ? "Creating..." : "Create optimization"}
            </button>
          </form>

          <div className="opt-list">
            <h2>Your optimizations</h2>
            {loadingList && <p className="opt-muted">Loading...</p>}
            {!loadingList && sortedOptimizations.length === 0 && (
              <p className="opt-muted">
                No optimizations yet. Fill in the form above to start.
              </p>
            )}
            <ul>
              {sortedOptimizations.map((o) => (
                <li
                  key={o.id}
                  className={
                    "opt-list__item" +
                    (activeId === o.id ? " opt-list__item--active" : "")
                  }
                  onClick={() => loadActive(o.id)}
                >
                  <div className="opt-list__title">
                    {o.targetRole || "Optimization"}
                  </div>
                  <div className="opt-list__meta">
                    <span className={"opt-status opt-status--" + o.status}>
                      {o.status}
                    </span>
                    <span>
                      {o.matchScore?.overall?.overall != null
                        ? Math.round(o.matchScore.overall.overall) + "%"
                        : "--"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="opt-list__del"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(o.id);
                    }}
                    aria-label="Delete optimization"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Right: detail / analyze / tailor */}
        <section className="optimizer-view__right">
          {!active && (
            <div className="opt-empty">
              <h2>Select or create an optimization</h2>
              <p>
                Pick one from the list on the left, or create a new one to
                see a detailed match analysis and a tailored candidate.
              </p>
            </div>
          )}

          {active && (
            <div className="opt-detail">
              <div className="opt-detail__head">
                <div>
                  <h2>
                    {active.targetRole || "Optimization"}
                    {active.targetCompany ? " · " + active.targetCompany : ""}
                  </h2>
                  <p className="opt-muted">
                    Based on resume:{" "}
                    <code>
                      {resumes.find((r) => r.id === active.resumeId)
                        ?.versionName || active.resumeId}
                    </code>
                  </p>
                </div>
                <span className={"opt-status opt-status--" + active.status}>
                  {active.status}
                </span>
              </div>

              <div className="opt-actions">
                <button
                  type="button"
                  className="opt-btn"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                >
                  {analyzing ? "Analyzing..." : "Analyze match"}
                </button>
                <button
                  type="button"
                  className="opt-btn opt-btn--primary"
                  onClick={handleTailor}
                  disabled={tailoring}
                >
                  {tailoring ? "Tailoring..." : "Tailor to JD"}
                </button>
              </div>

              {error && <div className="opt-error">{error}</div>}

              {active.matchScore && (
                <div className="opt-score">
                  <ScoreCircle
                    value={Math.round(active.matchScore.overall?.overall || 0)}
                    label="match"
                  />
                  <div className="opt-score__breakdown">
                    {active.matchScore.overall?.sections &&
                      Object.entries(active.matchScore.overall.sections).map(
                        ([k, v]) => (
                          <div key={k} className="opt-score__row">
                            <span>{k}</span>
                            <strong>{Math.round(v?.score || 0)}%</strong>
                          </div>
                        )
                      )}
                  </div>
                </div>
              )}

              {active.matchScore?.gaps?.length > 0 && (
                <div className="opt-card">
                  <h3>Gaps &amp; missing keywords</h3>
                  <ul className="opt-chips">
                    {active.matchScore.gaps.map((g, i) => (
                      <li key={i} className="opt-chip opt-chip--warn">
                        {g}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {active.tailoredCandidate && (
                <div className="opt-card">
                  <h3>Tailored candidate</h3>
                  <p className="opt-muted">
                    Generated by{" "}
                    <strong>{active.tailoredCandidate.generatedBy || "rules"}</strong>
                    . Diff against the original resume:
                  </p>
                  {active.tailoredCandidate.changesApplied?.length > 0 && (
                    <ul className="opt-changes">
                      {active.tailoredCandidate.changesApplied.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  )}
                  <details>
                    <summary>View tailored candidate JSON</summary>
                    <pre>
                      {JSON.stringify(active.tailoredCandidate.candidate, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default OptimizerView;

