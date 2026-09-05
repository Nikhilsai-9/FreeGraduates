import React, { useEffect, useMemo, useState } from "react";
import "./CoachView.css";
import { coachApi, resumeApi } from "../api/api";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft, MessageCircle, RefreshCw, Trash2, Send, Loader, Sparkles,
  CheckCircle2, ChevronRight, ChevronLeft, Lightbulb, Plus
} from "lucide-react";

/**
 * CoachView - Interview question generator with answer tracking.
 *
 * Flow:
 *   1. User lists past sessions, or clicks "New session".
 *   2. New-session form takes JD + optional resume/role/company/count.
 *   3. Session opens as a Q&A panel:
 *       - each question has a textarea; saved on blur via coachApi.saveAnswer.
 *       - progress bar updates as answers come in.
 *       - model answer / tip shown on demand.
 *   4. Regenerate rebuilds the question set, clearing answers.
 *   5. Delete removes the session.
 */
export default function CoachView() {
  const { currentUser } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [active, setActive] = useState(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingSession, setLoadingSession] = useState(false);
  const [creating, setCreating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");

  // New-session form state
  const [form, setForm] = useState({
    resumeId: "",
    jobDescription: "",
    targetRole: "",
    targetCompany: "",
    questionCount: 8,
  });

  // Answer-text drafts keyed by questionId, so we can debounce per question.
  const [drafts, setDrafts] = useState({});
  const [revealed, setRevealed] = useState({});

  const sortedSessions = useMemo(() => {
    return [...sessions].sort((a, b) => {
      const ta = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
  }, [sessions]);

  useEffect(() => {
    if (!currentUser) return;
    refresh();
    resumeApi
      .list()
      .then((r) => setResumes(Array.isArray(r) ? r : []))
      .catch(() => setResumes([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  async function refresh() {
    setLoadingList(true);
    setError("");
    try {
      const list = await coachApi.list();
      setSessions(Array.isArray(list) ? list : []);
    } catch (err) {
      setError("Failed to load coach sessions: " + (err.message || err));
    } finally {
      setLoadingList(false);
    }
  }

  async function openSession(id) {
    setActiveId(id);
    setLoadingSession(true);
    setError("");
    setShowNewForm(false);
    try {
      const rec = await coachApi.get(id);
      setActive(rec);
      const initialDrafts = {};
      (rec.answers || []).forEach((a) => {
        initialDrafts[a.questionId] = a.answer || "";
      });
      setDrafts(initialDrafts);
      setRevealed({});
    } catch (err) {
      setError("Failed to load session: " + (err.message || err));
    } finally {
      setLoadingSession(false);
    }
  }

  function goBack() {
    setActiveId(null);
    setActive(null);
    setDrafts({});
    setRevealed({});
  }

  async function createSession(e) {
    e.preventDefault();
    setError("");
    if (form.jobDescription.trim().length < 10) {
      setError("Job description must be at least 10 characters.");
      return;
    }
    setCreating(true);
    try {
      const rec = await coachApi.create({
        resumeId: form.resumeId || null,
        jobDescription: form.jobDescription.trim(),
        targetRole: form.targetRole.trim(),
        targetCompany: form.targetCompany.trim(),
        questionCount: Number(form.questionCount) || 8,
      });
      await refresh();
      await openSession(rec.id);
      setShowNewForm(false);
      setForm({
        resumeId: "",
        jobDescription: "",
        targetRole: "",
        targetCompany: "",
        questionCount: 8,
      });
      setToast("Interview session created");
    } catch (err) {
      setError("Failed to create session: " + (err.message || err));
    } finally {
      setCreating(false);
    }
  }

  async function regenerate() {
    if (!active) return;
    setRegenerating(true);
    setError("");
    try {
      const rec = await coachApi.regenerate(active.id);
      setActive(rec);
      setDrafts({});
      setRevealed({});
      await refresh();
      setToast("Questions regenerated");
    } catch (err) {
      setError("Failed to regenerate: " + (err.message || err));
    } finally {
      setRegenerating(false);
    }
  }

  async function saveAnswer(questionId, value) {
    setSavingId(questionId);
    try {
      const rec = await coachApi.saveAnswer(active.id, questionId, value);
      setActive(rec);
    } catch (err) {
      setError("Failed to save answer: " + (err.message || err));
    } finally {
      setSavingId(null);
    }
  }

  async function deleteSession() {
    if (!active) return;
    if (!window.confirm("Delete this interview session?")) return;
    try {
      await coachApi.remove(active.id);
      setToast("Session deleted");
      goBack();
      await refresh();
    } catch (err) {
      setError("Failed to delete: " + (err.message || err));
    }
  }

  function onAnswerChange(qid, val) {
    setDrafts((prev) => ({ ...prev, [qid]: val }));
  }

  function onAnswerBlur(qid) {
    if (!active) return;
    const val = drafts[qid] || "";
    const existing = (active.answers || []).find((a) => a.questionId === qid);
    if (existing && (existing.answer || "") === val) return;
    if (!existing && !val.trim()) return;
    saveAnswer(qid, val);
  }

  const answeredCount = active
    ? (active.answers || []).filter((a) => (a.answer || "").trim()).length
    : 0;
  const totalCount = active ? (active.questions || []).length : 0;
  const progress = totalCount > 0 ? (answeredCount / totalCount) * 100 : 0;

  return (
    <div className="coach-view">
      <div className="coach-header">
        <div className="coach-header-left">
          {activeId ? (
            <button className="coach-back-btn" onClick={goBack} title="Back to sessions">
              <ChevronLeft size={18} /> Sessions
            </button>
          ) : null}
          <h2>
            <MessageCircle size={22} /> Interview Coach
          </h2>
          <span className="coach-tag">Beta</span>
        </div>
        {!activeId && (
          <button
            className="coach-primary-btn"
            onClick={() => setShowNewForm((v) => !v)}
          >
            <Plus size={16} /> {showNewForm ? "Cancel" : "New session"}
          </button>
        )}
      </div>

      {error ? <div className="coach-error">{error}</div> : null}
      {toast ? <div className="coach-toast">{toast}</div> : null}

      {/* NEW-SESSION FORM */}
      {!activeId && showNewForm && (
        <form className="coach-new-form" onSubmit={createSession}>
          <div className="coach-row">
            <label>
              Base resume (optional)
              <select
                value={form.resumeId}
                onChange={(e) => setForm({ ...form, resumeId: e.target.value })}
              >
                <option value="">- none -</option>
                {resumes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.versionName || r.id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Question count
              <input
                type="number"
                min="3"
                max="15"
                value={form.questionCount}
                onChange={(e) => setForm({ ...form, questionCount: e.target.value })}
              />
            </label>
          </div>
          <label>
            Job description *
            <textarea
              required
              minLength={10}
              rows={5}
              placeholder="Paste the full JD here..."
              value={form.jobDescription}
              onChange={(e) => setForm({ ...form, jobDescription: e.target.value })}
            />
          </label>
          <div className="coach-row">
            <label>
              Target role
              <input
                type="text"
                value={form.targetRole}
                onChange={(e) => setForm({ ...form, targetRole: e.target.value })}
                placeholder="e.g. Senior Software Engineer"
              />
            </label>
            <label>
              Target company
              <input
                type="text"
                value={form.targetCompany}
                onChange={(e) => setForm({ ...form, targetCompany: e.target.value })}
                placeholder="e.g. Acme"
              />
            </label>
          </div>
          <div className="coach-form-actions">
            <button type="submit" className="coach-primary-btn" disabled={creating}>
              {creating ? <><Loader size={14} className="spin" /> Generating...</> : <><Sparkles size={14} /> Generate questions</>}
            </button>
          </div>
        </form>
      )}

      {/* LIST VIEW */}
      {!activeId && !showNewForm && (
        <div className="coach-list">
          {loadingList ? (
            <div className="coach-empty"><Loader size={16} className="spin" /> Loading sessions...</div>
          ) : sortedSessions.length === 0 ? (
            <div className="coach-empty">
              No interview sessions yet. Click <b>New session</b> to generate one.
            </div>
          ) : (
            sortedSessions.map((s) => {
              const qcount = (s.questions || []).length;
              const acount = (s.answers || []).filter((a) => (a.answer || "").trim()).length;
              return (
                <button
                  key={s.id}
                  className="coach-session-card"
                  onClick={() => openSession(s.id)}
                >
                  <div className="coach-session-card-top">
                    <span className="coach-session-title">
                      {s.targetRole ? s.targetRole : "Interview session"}
                      {s.targetCompany ? <span className="coach-session-at"> @ {s.targetCompany}</span> : null}
                    </span>
                    <span className={`coach-status-pill coach-status-${s.status}`}>
                      {s.status}
                    </span>
                  </div>
                  <div className="coach-session-meta">
                    <span>{qcount} questions</span>
                    <span>{acount} answered</span>
                    <span className="coach-session-by">via {s.generatedBy}</span>
                  </div>
                  <ChevronRight size={18} className="coach-chev" />
                </button>
              );
            })
          )}
        </div>
      )}

      {/* ACTIVE SESSION */}
      {activeId && (
        <div className="coach-session">
          {loadingSession || !active ? (
            <div className="coach-empty"><Loader size={16} className="spin" /> Loading...</div>
          ) : (
            <>
              <div className="coach-session-header">
                <div>
                  <div className="coach-session-title">
                    {active.targetRole || "Interview session"}
                    {active.targetCompany ? <span className="coach-session-at"> @ {active.targetCompany}</span> : null}
                  </div>
                  <div className="coach-session-meta">
                    <span>via {active.generatedBy}</span>
                    <span className={`coach-status-pill coach-status-${active.status}`}>{active.status}</span>
                  </div>
                </div>
                <div className="coach-session-actions">
                  <button className="coach-secondary-btn" onClick={regenerate} disabled={regenerating}>
                    <RefreshCw size={14} className={regenerating ? "spin" : ""} /> Regenerate
                  </button>
                  <button className="coach-danger-btn" onClick={deleteSession}>
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>

              <div className="coach-progress">
                <div className="coach-progress-bar">
                  <div className="coach-progress-fill" style={{ width: progress + "%" }} />
                </div>
                <span>{answeredCount} / {totalCount} answered</span>
              </div>

              {(active.questions || []).map((q, idx) => {
                const saved = (active.answers || []).find((a) => a.questionId === q.id);
                const text = drafts[q.id] !== undefined ? drafts[q.id] : (saved ? saved.answer : "");
                const isAnswered = !!(text && text.trim());
                const isRevealed = !!revealed[q.id];
                return (
                  <div key={q.id} className={"coach-question" + (isAnswered ? " coach-question-done" : "")}>
                    <div className="coach-question-head">
                      <span className="coach-question-num">Q{idx + 1}</span>
                      <span className={"coach-type-badge coach-type-" + q.type}>{q.type}</span>
                      <span className={"coach-diff-badge coach-diff-" + q.difficulty}>{q.difficulty}</span>
                      {q.category ? <span className="coach-cat-badge">{q.category}</span> : null}
                      {isAnswered ? <span className="coach-done-badge"><CheckCircle2 size={12} /> answered</span> : null}
                    </div>
                    <div className="coach-question-prompt">{q.prompt}</div>
                    <textarea
                      className="coach-answer"
                      rows={5}
                      placeholder="Type your answer here... (auto-saves on blur)"
                      value={text}
                      onChange={(e) => onAnswerChange(q.id, e.target.value)}
                      onBlur={() => onAnswerBlur(q.id)}
                    />
                    <div className="coach-question-foot">
                      <span className="coach-saving-hint">
                        {savingId === q.id ? <><Loader size={12} className="spin" /> saving...</> : "auto-saves on blur"}
                      </span>
                      <button
                        type="button"
                        className="coach-reveal-btn"
                        onClick={() => setRevealed((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                      >
                        <Lightbulb size={13} /> {isRevealed ? "Hide hint" : (q.modelAnswer ? "Show model answer" : (q.tip ? "Show tip" : "No hint"))}
                      </button>
                    </div>
                    {isRevealed ? (
                      <div className="coach-reveal-box">
                        {q.tip ? <div className="coach-tip"><b>Tip:</b> {q.tip}</div> : null}
                        {q.modelAnswer ? (
                          <div className="coach-model">
                            <b>Sample answer:</b>
                            <div>{q.modelAnswer}</div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {progress >= 100 ? (
                <div className="coach-complete">
                  <CheckCircle2 size={20} /> All questions answered. Great prep!
                </div>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
