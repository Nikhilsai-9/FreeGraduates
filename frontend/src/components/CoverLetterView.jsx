import React, { useEffect, useMemo, useState } from "react";
import "./CoverLetterView.css";
import { coverLetterApi, resumeApi } from "../api/api";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  FileText,
  RefreshCw,
  Trash2,
  Copy,
  Sparkles,
  Plus,
  Check,
  Mail,
} from "lucide-react";

/**
 * CoverLetterView - JD-tailored cover letter generator + editor.
 *
 * Flow:
 *   1. List of saved letters (newest first) or "New letter" form.
 *   2. Form: pick resume, paste JD, set target role/company, tone, length.
 *   3. Generated letter opens as a 2-column editor:
 *        - Subject line
 *        - Body textarea (auto-saves on blur)
 *        - Side panel with target metadata + regenerate controls
 *   4. Regenerate: rebuild body with current tone/length or overrides.
 *   5. Delete: remove from storage.
 *   6. Copy: puts the full subject + body into the clipboard.
 */
export default function CoverLetterView() {
  const { currentUser } = useAuth();

  const [letters, setLetters] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);

  const [showNewForm, setShowNewForm] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [creating, setCreating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [savingField, setSavingField] = useState(null);

  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState({
    resumeId: "",
    jobDescription: "",
    targetRole: "",
    targetCompany: "",
    tone: "professional",
    length: "medium",
  });

  // Local editable drafts, persisted on blur.
  const [draft, setDraft] = useState({ subject: "", body: "" });

  const sorted = useMemo(() => {
    return [...letters].sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, [letters]);

  // Toast auto-clear
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    (async () => {
      setLoadingList(true);
      try {
        const [l, r] = await Promise.all([
          coverLetterApi.list().catch(() => []),
          resumeApi.list().catch(() => []),
        ]);
        if (!cancelled) {
          setLetters(Array.isArray(l) ? l : []);
          setResumes(Array.isArray(r) ? r : []);
          if (!form.resumeId && Array.isArray(r) && r.length > 0) {
            setForm((f) => ({ ...f, resumeId: r[0].id }));
          }
        }
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  async function openLetter(id) {
    setError("");
    setActiveId(id);
    setActive(null);
    setLoadingSession(true);
    try {
      const rec = await coverLetterApi.get(id);
      setActive(rec);
      setDraft({ subject: rec.subject || "", body: rec.body || "" });
    } catch (err) {
      setError("Could not load letter: " + (err?.message || err));
    } finally {
      setLoadingSession(false);
    }
  }

  function goBack() {
    setActiveId(null);
    setActive(null);
  }

  async function createLetter(e) {
    e?.preventDefault();
    if (!form.resumeId) {
      setError("Pick a resume first.");
      return;
    }
    if (form.jobDescription.trim().length < 10) {
      setError("Job description must be at least 10 characters.");
      return;
    }
    setError("");
    setCreating(true);
    try {
      const rec = await coverLetterApi.create({
        resumeId: form.resumeId,
        jobDescription: form.jobDescription.trim(),
        targetRole: form.targetRole.trim(),
        targetCompany: form.targetCompany.trim(),
        tone: form.tone,
        length: form.length,
      });
      setLetters((l) => [rec, ...l.filter((x) => x.id !== rec.id)]);
      setActiveId(rec.id);
      setActive(rec);
      setDraft({ subject: rec.subject || "", body: rec.body || "" });
      setShowNewForm(false);
      setToast("Cover letter generated");
    } catch (err) {
      setError(
        "Could not generate letter: " + (err?.response?.data?.detail || err?.message || err)
      );
    } finally {
      setCreating(false);
    }
  }

  async function saveField(field) {
    if (!active) return;
    setSavingField(field);
    try {
      const updated = await coverLetterApi.update(active.id, {
        [field]: draft[field],
      });
      setActive(updated);
      setLetters((l) => l.map((x) => (x.id === updated.id ? updated : x)));
    } catch (err) {
      setError("Save failed: " + (err?.message || err));
    } finally {
      setSavingField(null);
    }
  }

  async function regenerate(overrides = {}) {
    if (!active) return;
    setError("");
    setRegenerating(true);
    try {
      const updated = await coverLetterApi.regenerate(active.id, overrides);
      setActive(updated);
      setDraft({ subject: updated.subject || "", body: updated.body || "" });
      setLetters((l) => l.map((x) => (x.id === updated.id ? updated : x)));
      setToast("Regenerated");
    } catch (err) {
      setError("Regenerate failed: " + (err?.message || err));
    } finally {
      setRegenerating(false);
    }
  }

  async function markFinal() {
    if (!active) return;
    setSavingField("status");
    try {
      const updated = await coverLetterApi.update(active.id, { status: "final" });
      setActive(updated);
      setLetters((l) => l.map((x) => (x.id === updated.id ? updated : x)));
      setToast("Marked as final");
    } catch (err) {
      setError("Could not update status: " + (err?.message || err));
    } finally {
      setSavingField(null);
    }
  }

  async function remove(id) {
    if (!window.confirm("Delete this cover letter?")) return;
    try {
      await coverLetterApi.remove(id);
      setLetters((l) => l.filter((x) => x.id !== id));
      if (activeId === id) goBack();
      setToast("Letter deleted");
    } catch (err) {
      setError("Delete failed: " + (err?.message || err));
    }
  }

  async function copyLetter() {
    if (!active) return;
    const text = `Subject: ${active.subject || ""}\n\n${active.body || ""}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  // -------- Renders --------

  if (!currentUser) {
    return <div className="cl-empty">Sign in to use the cover-letter generator.</div>;
  }

  if (active) {
    return (
      <div className="cl-editor">
        <header className="cl-editor-header">
          <button className="cl-back" onClick={goBack}>
            <ArrowLeft size={16} /> All letters
          </button>
          <div className="cl-editor-actions">
            <button
              className="cl-btn cl-btn-ghost"
              onClick={() => regenerate({ tone: active.tone, length: active.length })}
              disabled={regenerating}
            >
              <RefreshCw size={16} className={regenerating ? "spin" : ""} />
              {regenerating ? "Regenerating..." : "Regenerate"}
            </button>
            <button className="cl-btn cl-btn-ghost" onClick={copyLetter}>
              {copied ? <Check size={16} /> : <Copy size={16} />}
              {copied ? "Copied" : "Copy"}
            </button>
            {active.status !== "final" && (
              <button className="cl-btn cl-btn-primary" onClick={markFinal}>
                <Sparkles size={16} /> Mark final
              </button>
            )}
            <button className="cl-btn cl-btn-danger" onClick={() => remove(active.id)}>
              <Trash2 size={16} />
            </button>
          </div>
        </header>

        {error && <div className="cl-error">{error}</div>}
        {toast && <div className="cl-toast">{toast}</div>}

        <div className="cl-editor-grid">
          <div className="cl-editor-main">
            <div className="cl-meta-row">
              <span className="cl-meta-chip">{active.tone}</span>
              <span className="cl-meta-chip">{active.length}</span>
              <span className={"cl-meta-chip " + (active.status === "final" ? "cl-meta-chip-success" : "")}>
                {active.status}
              </span>
              <span className="cl-meta-chip cl-meta-chip-muted">
                {active.generatedBy === "gemini" ? "AI generated" : "Rules template"}
              </span>
            </div>

            <label className="cl-field-label">Subject line</label>
            <input
              className="cl-subject-input"
              type="text"
              value={draft.subject}
              onChange={(e) => setDraft((d) => ({ ...d, subject: e.target.value }))}
              onBlur={() => saveField("subject")}
              placeholder="Application: <role> at <company>"
              disabled={savingField === "subject"}
            />

            <label className="cl-field-label">Body</label>
            <textarea
              className="cl-body-textarea"
              value={draft.body}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
              onBlur={() => saveField("body")}
              placeholder="Dear Hiring Team,..."
              disabled={savingField === "body"}
              rows={18}
            />
            <div className="cl-body-meta">
              <span>{(draft.body || "").trim().split(/\s+/).filter(Boolean).length} words</span>
              {savingField && <span className="cl-saving">Saving...</span>}
            </div>
          </div>

          <aside className="cl-editor-side">
            <h4>Target</h4>
            <dl className="cl-meta-list">
              <dt>Role</dt><dd>{active.targetRole || "-"}</dd>
              <dt>Company</dt><dd>{active.targetCompany || "-"}</dd>
              <dt>Source resume</dt><dd>{active.sourceFilename || "-"}</dd>
              <dt>Recipient</dt><dd>{active.recipientHint || "Hiring Team"}</dd>
            </dl>

            <h4>Regenerate with new tone/length</h4>
            <div className="cl-regen-controls">
              <select
                className="cl-select"
                value={active.tone}
                onChange={(e) => regenerate({ tone: e.target.value, length: active.length })}
                disabled={regenerating}
              >
                <option value="professional">Professional</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="concise">Concise</option>
              </select>
              <select
                className="cl-select"
                value={active.length}
                onChange={(e) => regenerate({ tone: active.tone, length: e.target.value })}
                disabled={regenerating}
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </div>

            <h4>Job description</h4>
            <div className="cl-jd-preview">
              {(active.jobDescription || "").slice(0, 600)}
              {(active.jobDescription || "").length > 600 && "..."}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="cl-view">
      <header className="cl-view-header">
        <div>
          <h2>
            <Mail size={20} /> Cover Letters
          </h2>
          <p className="cl-subtitle">
            JD-tailored cover letters generated from your saved resume.
          </p>
        </div>
        <button className="cl-btn cl-btn-primary" onClick={() => setShowNewForm((s) => !s)}>
          <Plus size={16} /> {showNewForm ? "Close form" : "New letter"}
        </button>
      </header>

      {error && <div className="cl-error">{error}</div>}
      {toast && <div className="cl-toast">{toast}</div>}

      {showNewForm && (
        <form className="cl-new-form" onSubmit={createLetter}>
          <label>
            Base resume
            <select
              className="cl-select"
              value={form.resumeId}
              onChange={(e) => setForm((f) => ({ ...f, resumeId: e.target.value }))}
              required
            >
              <option value="">Pick a resume...</option>
              {resumes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.versionName || r.id}
                </option>
              ))}
            </select>
          </label>

          <label>
            Target role
            <input
              className="cl-input"
              type="text"
              value={form.targetRole}
              onChange={(e) => setForm((f) => ({ ...f, targetRole: e.target.value }))}
              placeholder="e.g. Senior Software Engineer"
            />
          </label>

          <label>
            Target company
            <input
              className="cl-input"
              type="text"
              value={form.targetCompany}
              onChange={(e) => setForm((f) => ({ ...f, targetCompany: e.target.value }))}
              placeholder="e.g. Acme Corp"
            />
          </label>

          <label>
            Job description
            <textarea
              className="cl-textarea"
              rows={6}
              value={form.jobDescription}
              onChange={(e) => setForm((f) => ({ ...f, jobDescription: e.target.value }))}
              placeholder="Paste the full JD here..."
              required
            />
          </label>

          <div className="cl-form-row">
            <label>
              Tone
              <select
                className="cl-select"
                value={form.tone}
                onChange={(e) => setForm((f) => ({ ...f, tone: e.target.value }))}
              >
                <option value="professional">Professional</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="concise">Concise</option>
              </select>
            </label>
            <label>
              Length
              <select
                className="cl-select"
                value={form.length}
                onChange={(e) => setForm((f) => ({ ...f, length: e.target.value }))}
              >
                <option value="short">Short</option>
                <option value="medium">Medium</option>
                <option value="long">Long</option>
              </select>
            </label>
          </div>

          <button className="cl-btn cl-btn-primary" type="submit" disabled={creating}>
            {creating ? "Generating..." : "Generate letter"}
          </button>
        </form>
      )}

      {loadingList ? (
        <div className="cl-empty">Loading letters...</div>
      ) : sorted.length === 0 ? (
        <div className="cl-empty">
          No cover letters yet. Click <strong>New letter</strong> to generate one.
        </div>
      ) : (
        <ul className="cl-list">
          {sorted.map((l) => (
            <li key={l.id} className="cl-card">
              <button className="cl-card-main" onClick={() => openLetter(l.id)}>
                <div className="cl-card-title">
                  <FileText size={16} /> {l.subject || "(untitled)"}
                </div>
                <div className="cl-card-sub">
                  {l.targetRole || "Role"} at {l.targetCompany || "Company"}
                </div>
                <div className="cl-card-meta">
                  <span className="cl-meta-chip">{l.tone}</span>
                  <span className="cl-meta-chip">{l.length}</span>
                  <span className="cl-meta-chip cl-meta-chip-muted">
                    {l.wordCount} words
                  </span>
                  <span className={"cl-meta-chip " + (l.status === "final" ? "cl-meta-chip-success" : "")}>
                    {l.status}
                  </span>
                </div>
              </button>
              <button className="cl-btn cl-btn-danger cl-btn-icon" onClick={() => remove(l.id)}>
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
