// =====================================================================
// FreeGraduates AI Resume Builder
// Professional 3-column workspace: step nav | editor | live preview
// =====================================================================

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { resumeApi, ExtractError } from "../api/api";
import {
  FileText, Upload, PenTool, Layout, ChevronRight, ChevronLeft,
  Check, X, AlertCircle, RefreshCw, Download, Save, Eye, ZoomIn, ZoomOut,
  History
} from "lucide-react";

// ---------- Candidate shape (matches backend) ----------
const newCandidate = () => ({
  personal_info: {
    fullName: "", title: "", email: "", phone: "",
    location: "", linkedin: "", github: "", portfolio: "",
  },
  summary: "",
  work_experience: [],
  education: [],
  skills: [],
  projects: [],
  certifications: [],
  awards: [],
  languages: [],
});

const newExperience = () => ({
  id: `exp-${Date.now()}`, role: "", company: "",
  location: "", startDate: "", endDate: "", description: "",
});

const newEducation = () => ({
  id: `edu-${Date.now()}`, school: "", degree: "", field: "",
  startDate: "", endDate: "", gpa: "", location: "",
});

const newProject = () => ({
  id: `proj-${Date.now()}`, name: "", techStack: "",
  description: "", link: "",
});

// A4 sheet at 96dpi: 210mm x 297mm
const A4_W = 794;
const A4_H = 1123;

// ---------- Step definitions ----------
const STEPS = [
  { id: "start",      label: "Start",        icon: PenTool },
  { id: "personal",   label: "Personal Info", icon: FileText },
  { id: "experience", label: "Experience",    icon: FileText },
  { id: "education",  label: "Education",     icon: FileText },
  { id: "skills",     label: "Skills",        icon: FileText },
  { id: "projects",   label: "Projects",      icon: FileText },
  { id: "target",     label: "Target Job",    icon: FileText },
  { id: "generate",   label: "Generate",      icon: FileText },
  { id: "review",     label: "Review",        icon: FileText },
];

const STEP_ORDER = STEPS.map((s) => s.id);

function getStepIndex(id) {
  return STEP_ORDER.indexOf(id);
}

// ---------- Main Component ----------
export default function ResumeBuilderView({ initialOptions }) {
  const [candidate, setCandidate] = useState(newCandidate());
  const [job, setJob] = useState({ role: "", company: "", description: "" });
  const [step, setStep] = useState("start");
  const [creationPath, setCreationPath] = useState(initialOptions?.creationPath || "scratch");
  const [templateId, setTemplateId] = useState(initialOptions?.templateStyle || "classic");
  const [templates, setTemplates] = useState([]);
  const [savedId, setSavedId] = useState(initialOptions?.resumeId || null);
  const [versionName, setVersionName] = useState("My Resume");

  const [extracting, setExtracting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState("idle"); // idle | uploading | extracting | success | error
  const [extractError, setExtractError] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState([]);
  const [generated, setGenerated] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [toast, setToast] = useState(null);
  const [savedIds, setSavedIds] = useState([]);

  // Preview zoom: "fit" fits the A4 sheet to the preview viewport, or an explicit scale.
  const [zoom, setZoom] = useState("fit");
  const ZOOM_STEP = 0.15;
  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 2;
  const isZoomNumber = typeof zoom === "number";
  const changeZoom = (delta) => {
    const base = isZoomNumber ? zoom : 1;
    setZoom(Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((base + delta) * 100) / 100)));
  };
  const resetZoom = () => setZoom("fit");
  const zoomCanOut = isZoomNumber && zoom <= MIN_ZOOM;
  const zoomCanIn = isZoomNumber && zoom >= MAX_ZOOM;

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    resumeApi.templates().then((res) => setTemplates(res.templates || [])).catch(() => {});
    resumeApi.list().then((list) => setSavedIds(list || [])).catch(() => {});
    if (initialOptions?.resumeId) {
      resumeApi.get(initialOptions.resumeId).then((rec) => {
        if (rec.candidate) setCandidate({ ...newCandidate(), ...rec.candidate });
        if (rec.job) setJob({ ...job, ...(rec.job || {}) });
        if (rec.versionName) setVersionName(rec.versionName);
        if (rec.templateStyle) setTemplateId(rec.templateStyle);
        if (rec.generated) setGenerated(rec.generated);
        setStep("review");
      }).catch((err) => showToast("Could not load saved resume: " + err.message, "error"));
      return;
    }
    // No saved resume requested — honour the ?path= URL param by skipping
    // the start screen for the supported direct-entry pathways.
    const path = (initialOptions?.creationPath || "").toLowerCase();
    if (path === "form" || path === "scratch") {
      setCreationPath(path === "form" ? "form" : "scratch");
      setStep("personal");
    } else if (path === "template") {
      setCreationPath("template");
      setStep("personal");
    }
  }, [initialOptions?.resumeId, initialOptions?.creationPath]);

  // ---------- Mutations ----------
  const setPersonal = (k, v) =>
    setCandidate({ ...candidate, personal_info: { ...candidate.personal_info, [k]: v } });

  const addExperience = () =>
    setCandidate({ ...candidate, work_experience: [...candidate.work_experience, newExperience()] });

  const updateExperience = (id, k, v) =>
    setCandidate({
      ...candidate,
      work_experience: candidate.work_experience.map((e) => (e.id === id ? { ...e, [k]: v } : e)),
    });

  const removeExperience = (id) =>
    setCandidate({
      ...candidate,
      work_experience: candidate.work_experience.filter((e) => e.id !== id),
    });

  const addEducation = () =>
    setCandidate({ ...candidate, education: [...candidate.education, newEducation()] });

  const updateEducation = (id, k, v) =>
    setCandidate({
      ...candidate,
      education: candidate.education.map((e) => (e.id === id ? { ...e, [k]: v } : e)),
    });

  const removeEducation = (id) =>
    setCandidate({ ...candidate, education: candidate.education.filter((e) => e.id !== id) });

  const addProject = () =>
    setCandidate({ ...candidate, projects: [...candidate.projects, newProject()] });

  const updateProject = (id, k, v) =>
    setCandidate({
      ...candidate,
      projects: candidate.projects.map((p) => (p.id === id ? { ...p, [k]: v } : p)),
    });

  const removeProject = (id) =>
    setCandidate({ ...candidate, projects: candidate.projects.filter((p) => p.id !== id) });

  const setSkillsText = (text) => {
    const items = text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
    setCandidate({ ...candidate, skills: items });
  };

  // ---------- Step navigation ----------
  const gotoNext = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx >= 0 && idx < STEP_ORDER.length - 1) setStep(STEP_ORDER[idx + 1]);
  };
  const gotoPrev = () => {
    const idx = STEP_ORDER.indexOf(step);
    if (idx > 0) setStep(STEP_ORDER[idx - 1]);
  };
  const gotoStep = (id) => {
    if (STEP_ORDER.includes(id)) setStep(id);
  };

  // ---------- Resume extraction (PDF upload) ----------
  const fileInput = useRef(null);

  const onFileSelected = async (file) => {
    if (!file) return;

    if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
      setUploadPhase("error");
      setExtractError(new ExtractError("File must be a PDF.", 0, "client-validation"));
      return;
    }

    if (file.size > 16 * 1024 * 1024) {
      setUploadPhase("error");
      setExtractError(new ExtractError("PDF exceeds the supported file size (16 MB max).", 0, "client-validation"));
      return;
    }

    setExtractError(null);
    setUploadPhase("uploading");
    setUploadProgress(0);
    setCreationPath("upload");

    const progressTimer = setTimeout(() => {
      setUploadPhase("extracting");
    }, 1500);

    try {
      const res = await resumeApi.extract(file, (pct) => {
        setUploadProgress(pct);
      });
      clearTimeout(progressTimer);

      if (res?.parsed) {
        setCandidate(mergeCandidate(newCandidate(), res.parsed));
        setUploadPhase("success");
        setExtractError(null);
        setTimeout(() => {
          setStep("personal");
          setUploadPhase("idle");
        }, 1200);
      } else {
        setUploadPhase("error");
        setExtractError(new ExtractError(
          "Extraction returned no data. Please try another PDF.",
          422, "empty-response"
        ));
      }
    } catch (err) {
      clearTimeout(progressTimer);
      setUploadPhase("error");
      if (err instanceof ExtractError) {
        setExtractError(err);
      } else {
        setExtractError(new ExtractError(
          "Unable to process this file. Please try another PDF.",
          0, "unknown"
        ));
      }
    } finally {
      setExtracting(false);
    }
  };

  const resetUpload = () => {
    setUploadPhase("idle");
    setExtractError(null);
    setUploadProgress(0);
    if (fileInput.current) fileInput.current.value = "";
  };

  // ---------- Generate ----------
  const handleGenerate = async () => {
    setGenerating(true);
    setGenerationSteps(["loading_rules", "analyzing_inputs", "matching_keywords", "writing_resume", "qa_validation"]);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      if (i < 5) {
        setGenerationSteps((s) => s.slice(1));
      } else {
        clearInterval(interval);
      }
    }, 1500);

    try {
      const result = await resumeApi.generate({ candidate, job, templateId });
      setGenerated(result?.data?.resume || null);
      setWarnings(result?.data?.warnings || []);
      setStep("review");
      showToast("Resume generated successfully.", "success");
    } catch (err) {
      showToast("We couldn't generate your resume right now. Please try again.", "error");
    } finally {
      clearInterval(interval);
      setGenerating(false);
      setGenerationSteps([]);
    }
  };

  // ---------- Save / load ----------
  const handleSave = async () => {
    try {
      const rec = await resumeApi.save({
        id: savedId, versionName, templateStyle: templateId, candidate, job, generated,
      });
      setSavedId(rec.id);
      showToast("Resume saved successfully.", "success");
      resumeApi.list().then((list) => setSavedIds(list || [])).catch(() => {});
    } catch (err) {
      showToast("Could not save resume: " + err.message, "error");
    }
  };

  const loadSavedResume = async (id) => {
    try {
      const rec = await resumeApi.get(id);
      if (rec.candidate) setCandidate({ ...newCandidate(), ...rec.candidate });
      if (rec.job) setJob({ ...job, ...(rec.job || {}) });
      if (rec.versionName) setVersionName(rec.versionName);
      if (rec.templateStyle) setTemplateId(rec.templateStyle);
      if (rec.generated) setGenerated(rec.generated);
      setSavedId(id);
      setStep("review");
      showToast("Resume loaded.", "success");
    } catch (err) {
      showToast("Could not load resume.", "error");
    }
  };

  const handleExport = async (format) => {
    if (!savedId) {
      showToast("Please save the resume before exporting.", "error");
      return;
    }
    try {
      await resumeApi.export(savedId, format);
    } catch (err) {
      showToast("Export failed. Please try again.", "error");
    }
  };

  const startNewResume = (path) => {
    setCandidate(newCandidate());
    setJob({ role: "", company: "", description: "" });
    setGenerated(null);
    setSavedId(null);
    setCreationPath(path);
    setVersionName("My Resume");
    setStep("personal");
  };

  // ---------- Render ----------
  const currentStepIdx = STEP_ORDER.indexOf(step);
  const isOnStart = step === "start";

  return (
    <div className="fg-rb">
      {toast && (
        <div className={`fg-rb__toast fg-rb__toast--${toast.type}`}>
          <span>{toast.msg}</span>
          <button className="fg-rb__toast-close" onClick={() => setToast(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="fg-rb__body">
        {/* Left: Step rail */}
        {!isOnStart && (
          <nav className="fg-rb__rail" aria-label="Builder steps">
            <div className="fg-rb__rail-inner">
              {STEPS.map((s, idx) => {
                const isActive = step === s.id;
                const isCompleted = idx < currentStepIdx;
                const Icon = s.icon;
                return (
                  <button
                    key={s.id}
                    className={`fg-rb__step ${isActive ? "is-active" : ""} ${isCompleted ? "is-done" : ""}`}
                    onClick={() => gotoStep(s.id)}
                    aria-current={isActive ? "step" : undefined}
                  >
                    <span className="fg-rb__step-num">
                      {isCompleted ? <Check size={12} /> : idx + 1}
                    </span>
                    <span className="fg-rb__step-label">{s.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {/* Center: Main workspace */}
        <main className={`fg-rb__main ${isOnStart ? "fg-rb__main--full" : ""}`}>
          <div className="fg-rb__editor">
            {step === "start" && (
              <StartStep
                creationPath={creationPath}
                setCreationPath={setCreationPath}
                templates={templates}
                templateId={templateId}
                setTemplateId={setTemplateId}
                savedIds={savedIds}
                uploadPhase={uploadPhase}
                uploadProgress={uploadProgress}
                extractError={extractError}
                fileInput={fileInput}
                onScratch={() => startNewResume("scratch")}
                onUseTemplate={() => startNewResume("template")}
                onFile={onFileSelected}
                onResetUpload={resetUpload}
                onLoadResume={loadSavedResume}
              />
            )}
            {step === "personal" && (
              <PersonalStep candidate={candidate} setPersonal={setPersonal} setCandidate={setCandidate} />
            )}
            {step === "experience" && (
              <ExperienceStep candidate={candidate} addExperience={addExperience}
                updateExperience={updateExperience} removeExperience={removeExperience} />
            )}
            {step === "education" && (
              <EducationStep candidate={candidate} addEducation={addEducation}
                updateEducation={updateEducation} removeEducation={removeEducation} />
            )}
            {step === "skills" && (
              <SkillsStep candidate={candidate} setSkillsText={setSkillsText} />
            )}
            {step === "projects" && (
              <ProjectsStep candidate={candidate} addProject={addProject}
                updateProject={updateProject} removeProject={removeProject} />
            )}
            {step === "target" && (
              <TargetStep job={job} setJob={setJob} />
            )}
            {step === "generate" && (
              <GenerateStep generating={generating} generationSteps={generationSteps}
                onGenerate={handleGenerate} onBack={gotoPrev} />
            )}
            {step === "review" && (
              <ReviewStep generated={generated} warnings={warnings} versionName={versionName}
                setVersionName={setVersionName} templateId={templateId} setTemplateId={setTemplateId}
                templates={templates} savedId={savedId} onSave={handleSave}
                onExport={handleExport} onReEdit={() => setStep("personal")} />
            )}

            {!isOnStart && step !== "review" && (
              <div className="fg-rb__nav">
                <button className="fg-btn fg-btn--ghost" onClick={gotoPrev}>
                  <ChevronLeft size={14} /> Back
                </button>
                <button className="fg-btn fg-btn--primary" onClick={gotoNext}>
                  {step === "generate" ? "Skip to Preview" : "Continue"}
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Right: Live preview */}
        {!isOnStart && (
          <aside className="fg-rb__preview">
            <div className="fg-rb__preview-head">
              <span className="fg-rb__preview-title">
                <Eye size={14} />
                Live Preview
              </span>
              <div className="fg-rb__preview-actions">
                {savedId && (
                  <span className="fg-rb__saved-pill"><Check size={12} /> Saved</span>
                )}
                <div className="fg-rb__zoom" role="group" aria-label="Preview zoom">
                  <button type="button" className="fg-zoom-btn" onClick={() => changeZoom(-ZOOM_STEP)}
                    disabled={zoomCanOut} aria-label="Zoom out" title="Zoom out">
                    <ZoomOut size={14} />
                  </button>
                  <button type="button" className="fg-zoom-value" onClick={resetZoom}
                    title="Reset to fit preview">
                    {isZoomNumber ? `${Math.round(zoom * 100)}%` : "Fit"}
                  </button>
                  <button type="button" className="fg-zoom-btn" onClick={() => changeZoom(ZOOM_STEP)}
                    disabled={zoomCanIn} aria-label="Zoom in" title="Zoom in">
                    <ZoomIn size={14} />
                  </button>
                </div>
                <button type="button" className="fg-btn fg-btn--primary fg-btn--sm"
                  onClick={handleSave} disabled={!candidate.personal_info.fullName}>
                  <Save size={14} />
                  {savedId ? "Update" : "Save"}
                </button>
              </div>
            </div>
            <div className="fg-rb__preview-scroll">
              <div className="fg-rb__preview-stage">
                <LivePreview candidate={candidate} job={job} templateId={templateId}
                  generated={generated} zoom={zoom} />
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}


// ---------- Start Step ----------
function StartStep({
  creationPath, setCreationPath, templates, templateId, setTemplateId,
  savedIds, uploadPhase, uploadProgress, extractError,
  fileInput, onScratch, onUseTemplate, onFile, onResetUpload, onLoadResume
}) {
  const isUploading = uploadPhase === "uploading" || uploadPhase === "extracting";
  const isSuccess = uploadPhase === "success";
  const isError = uploadPhase === "error";

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fg-step">
      <div className="fg-step__header">
        <h2 className="fg-step__title">How would you like to start?</h2>
        <p className="fg-step__subtitle">Choose a path to build your resume. You can change your mind at any time.</p>
      </div>

      <div className="fg-start-cards">
        {/* Start from Scratch */}
        <button className={`fg-start-card ${creationPath === "scratch" ? "is-active" : ""}`}
          onClick={onScratch}>
          <div className="fg-start-card__icon-wrap fg-start-card__icon-wrap--blue">
            <PenTool size={22} />
          </div>
          <div className="fg-start-card__content">
            <h4>Start from Scratch</h4>
            <p>Walk through every section and build your resume step by step with full control.</p>
          </div>
          <ChevronRight size={16} className="fg-start-card__arrow" />
        </button>

        {/* Upload Existing Resume */}
        <div className={`fg-start-card ${creationPath === "upload" ? "is-active" : ""}`}>
          <div className="fg-start-card__icon-wrap fg-start-card__icon-wrap--emerald">
            <Upload size={22} />
          </div>
          <div className="fg-start-card__content">
            <h4>Upload Existing Resume</h4>
            <p>Import your existing PDF and we'll extract your information so you can review and improve it.</p>
          </div>

          <input ref={fileInput} type="file" accept=".pdf,application/pdf"
            style={{ display: "none" }}
            onChange={(e) => onFile(e.target.files?.[0])} />

          {/* Upload states */}
          {uploadPhase === "idle" && (
            <button className="fg-btn fg-btn--primary fg-btn--block"
              onClick={() => fileInput.current?.click()}>
              <Upload size={14} /> Upload PDF
            </button>
          )}

          {isUploading && (
            <div className="fg-upload-progress">
              <div className="fg-upload-progress__bar">
                <div className="fg-upload-progress__fill"
                  style={{ width: `${uploadPhase === "extracting" ? 75 : uploadProgress}%` }} />
              </div>
              <span className="fg-upload-progress__text">
                {uploadPhase === "uploading" ? "Uploading resume..." : "Extracting your resume..."}
              </span>
            </div>
          )}

          {isSuccess && (
            <div className="fg-upload-result fg-upload-result--success">
              <Check size={16} />
              <span>Resume imported successfully</span>
            </div>
          )}

          {isError && (
            <div className="fg-upload-result fg-upload-result--error">
              <AlertCircle size={16} />
              <span>{extractError?.message || "Extraction failed"}</span>
              <button className="fg-btn fg-btn--ghost fg-btn--sm" onClick={onResetUpload}>
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          )}
        </div>

        {/* Use a Template */}
        <div className={`fg-start-card ${creationPath === "template" ? "is-active" : ""}`}>
          <div className="fg-start-card__icon-wrap fg-start-card__icon-wrap--iris">
            <Layout size={22} />
          </div>
          <div className="fg-start-card__content">
            <h4>Use a Template</h4>
            <p>Pick a professionally designed template — ATS-friendly by default.</p>
          </div>
          <select className="fg-input fg-input--select"
            value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {(templates.length ? templates : [
              { id: "classic", label: "Classic" },
              { id: "professional", label: "Professional" },
              { id: "modern", label: "Modern" },
              { id: "minimal", label: "Minimal" },
              { id: "student", label: "Graduate" },
              { id: "software-engineer", label: "Software Engineer" },
            ]).map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
          </select>
          <button className="fg-btn fg-btn--ghost fg-btn--block" onClick={onUseTemplate}>
            Start with Template
          </button>
        </div>
      </div>

      {savedIds.length > 0 && (
        <div className="fg-saved-section">
          <div className="fg-saved-section__head">
            <h4 className="fg-saved-section__title">Your saved resumes</h4>
            <Link to="/history" className="fg-btn fg-btn--link fg-btn--sm">
              View all →
            </Link>
          </div>
          <div className="fg-saved-list">
            {savedIds.slice(0, 4).map((r) => (
              <div key={r.id} className="fg-saved-item">
                <FileText size={16} />
                <div className="fg-saved-item__info">
                  <span className="fg-saved-item__name">{r.versionName}</span>
                  <span className="fg-saved-item__date">
                    {new Date(r.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </span>
                </div>
                <button className="fg-btn fg-btn--ghost fg-btn--sm" onClick={() => onLoadResume(r.id)}>
                  Open
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Always show a single "See all resumes" link so users can find
          the History workspace even when they have 0 saved items. */}
      {savedIds.length === 0 && (
        <div className="fg-saved-section fg-saved-section--empty">
          <Link to="/history" className="fg-btn fg-btn--ghost fg-btn--block">
            <History size={14} /> See all saved resumes
          </Link>
        </div>
      )}
    </div>
  );
}


// ---------- Personal Step ----------
function PersonalStep({ candidate, setPersonal, setCandidate }) {
  const pi = candidate.personal_info;
  return (
    <div className="fg-step">
      <div className="fg-step__header">
        <h2 className="fg-step__title">Personal Information</h2>
        <p className="fg-step__subtitle">Your contact information and professional summary.</p>
      </div>

      <div className="fg-field-grid">
        <Field label="Full Name" required>
          <input className="fg-input" value={pi.fullName}
            onChange={(e) => setPersonal("fullName", e.target.value)}
            placeholder="e.g. Jane Smith" />
        </Field>
        <Field label="Professional Title">
          <input className="fg-input" value={pi.title}
            onChange={(e) => setPersonal("title", e.target.value)}
            placeholder="e.g. Software Engineer" />
        </Field>
        <Field label="Email" required>
          <input className="fg-input" type="email" value={pi.email}
            onChange={(e) => setPersonal("email", e.target.value)}
            placeholder="jane@example.com" />
        </Field>
        <Field label="Phone">
          <input className="fg-input" value={pi.phone}
            onChange={(e) => setPersonal("phone", e.target.value)}
            placeholder="+1 (555) 123-4567" />
        </Field>
        <Field label="Location">
          <input className="fg-input" value={pi.location}
            onChange={(e) => setPersonal("location", e.target.value)}
            placeholder="City, Country" />
        </Field>
        <Field label="LinkedIn">
          <input className="fg-input" value={pi.linkedin}
            onChange={(e) => setPersonal("linkedin", e.target.value)}
            placeholder="linkedin.com/in/you" />
        </Field>
        <Field label="GitHub">
          <input className="fg-input" value={pi.github}
            onChange={(e) => setPersonal("github", e.target.value)}
            placeholder="github.com/you" />
        </Field>
        <Field label="Portfolio / Website">
          <input className="fg-input" value={pi.portfolio}
            onChange={(e) => setPersonal("portfolio", e.target.value)}
            placeholder="yoursite.com" />
        </Field>
      </div>

      <Field label="Professional Summary" hint="2-3 sentences about your focus, strengths, and goals.">
        <textarea className="fg-input fg-input--textarea" rows={4} value={candidate.summary}
          onChange={(e) => setCandidate({ ...candidate, summary: e.target.value })}
          placeholder="Software engineer with 3+ years of experience in..." />
      </Field>
    </div>
  );
}


// ---------- Experience Step ----------
function ExperienceStep({ candidate, addExperience, updateExperience, removeExperience }) {
  return (
    <div className="fg-step">
      <div className="fg-step__header">
        <h2 className="fg-step__title">Experience</h2>
        <p className="fg-step__subtitle">Add internships, jobs, or research roles. Leave blank what doesn't apply.</p>
      </div>

      {candidate.work_experience.length === 0 && (
        <div className="fg-empty-state">
          <p>No experience added yet. Add internships, academic research, hackathons, or volunteering.</p>
        </div>
      )}

      {candidate.work_experience.map((exp, idx) => (
        <div className="fg-card-editor" key={exp.id}>
          <div className="fg-card-editor__head">
            <span className="fg-badge">{idx + 1}</span>
            <input className="fg-input fg-input--ghost" placeholder="Role / Title"
              value={exp.role} onChange={(e) => updateExperience(exp.id, "role", e.target.value)} />
            <button className="fg-btn-icon" onClick={() => removeExperience(exp.id)} title="Remove">
              <X size={16} />
            </button>
          </div>
          <div className="fg-field-grid">
            <Field label="Company">
              <input className="fg-input" value={exp.company}
                onChange={(e) => updateExperience(exp.id, "company", e.target.value)} />
            </Field>
            <Field label="Location">
              <input className="fg-input" value={exp.location}
                onChange={(e) => updateExperience(exp.id, "location", e.target.value)} />
            </Field>
            <Field label="Start date">
              <input className="fg-input" placeholder="Jun 2024" value={exp.startDate}
                onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)} />
            </Field>
            <Field label="End date">
              <input className="fg-input" placeholder="Aug 2024 or Present" value={exp.endDate}
                onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)} />
            </Field>
          </div>
          <Field label="Key contributions" hint="Use action verbs. The AI will refine these but won't invent facts.">
            <textarea className="fg-input fg-input--textarea" rows={4} value={exp.description}
              onChange={(e) => updateExperience(exp.id, "description", e.target.value)}
              placeholder="e.g. Built a feature flag system in Go that reduced deploy downtime by 30%." />
          </Field>
        </div>
      ))}

      <button className="fg-btn fg-btn--ghost fg-btn--block" onClick={addExperience}>
        + Add Experience
      </button>
    </div>
  );
}


// ---------- Education Step ----------
function EducationStep({ candidate, addEducation, updateEducation, removeEducation }) {
  return (
    <div className="fg-step">
      <div className="fg-step__header">
        <h2 className="fg-step__title">Education</h2>
        <p className="fg-step__subtitle">Schools, degrees, and dates. GPA is optional.</p>
      </div>

      {candidate.education.length === 0 && (
        <div className="fg-empty-state">
          <p>No education added yet. Add your degrees and certifications.</p>
        </div>
      )}

      {candidate.education.map((ed, idx) => (
        <div className="fg-card-editor" key={ed.id}>
          <div className="fg-card-editor__head">
            <span className="fg-badge">{idx + 1}</span>
            <input className="fg-input fg-input--ghost" placeholder="School / University"
              value={ed.school} onChange={(e) => updateEducation(ed.id, "school", e.target.value)} />
            <button className="fg-btn-icon" onClick={() => removeEducation(ed.id)} title="Remove">
              <X size={16} />
            </button>
          </div>
          <div className="fg-field-grid">
            <Field label="Degree">
              <input className="fg-input" value={ed.degree} placeholder="Bachelor of Technology"
                onChange={(e) => updateEducation(ed.id, "degree", e.target.value)} />
            </Field>
            <Field label="Field of study">
              <input className="fg-input" value={ed.field} placeholder="Computer Science"
                onChange={(e) => updateEducation(ed.id, "field", e.target.value)} />
            </Field>
            <Field label="Start year">
              <input className="fg-input" value={ed.startDate} placeholder="2022"
                onChange={(e) => updateEducation(ed.id, "startDate", e.target.value)} />
            </Field>
            <Field label="End year">
              <input className="fg-input" value={ed.endDate} placeholder="2026"
                onChange={(e) => updateEducation(ed.id, "endDate", e.target.value)} />
            </Field>
            <Field label="GPA (optional)">
              <input className="fg-input" value={ed.gpa} placeholder="3.8 / 4.0"
                onChange={(e) => updateEducation(ed.id, "gpa", e.target.value)} />
            </Field>
            <Field label="Location">
              <input className="fg-input" value={ed.location}
                onChange={(e) => updateEducation(ed.id, "location", e.target.value)} />
            </Field>
          </div>
        </div>
      ))}

      <button className="fg-btn fg-btn--ghost fg-btn--block" onClick={addEducation}>
        + Add Education
      </button>
    </div>
  );
}


// ---------- Skills Step ----------
function SkillsStep({ candidate, setSkillsText }) {
  const text = Array.isArray(candidate.skills) ? candidate.skills.join(", ") : "";
  return (
    <div className="fg-step">
      <div className="fg-step__header">
        <h2 className="fg-step__title">Skills</h2>
        <p className="fg-step__subtitle">List your skills separated by commas. The AI will group them later.</p>
      </div>

      <Field label="Your skills" hint="e.g. JavaScript, React, Python, Figma, Leadership">
        <textarea className="fg-input fg-input--textarea" rows={5} value={text}
          onChange={(e) => setSkillsText(e.target.value)}
          placeholder="TypeScript, React, Node.js, Python, PostgreSQL, Docker" />
      </Field>

      {Array.isArray(candidate.skills) && candidate.skills.length > 0 && (
        <div className="fg-chip-row">
          {candidate.skills.map((s, i) => (
            <span key={i} className="fg-chip">{s}</span>
          ))}
        </div>
      )}
    </div>
  );
}


// ---------- Projects Step ----------
function ProjectsStep({ candidate, addProject, updateProject, removeProject }) {
  return (
    <div className="fg-step">
      <div className="fg-step__header">
        <h2 className="fg-step__title">Projects</h2>
        <p className="fg-step__subtitle">Academic, personal, hackathon, or open-source projects.</p>
      </div>

      {candidate.projects.length === 0 && (
        <div className="fg-empty-state">
          <p>Add 2-3 projects from coursework, internships, or your own builds.</p>
        </div>
      )}

      {candidate.projects.map((p, idx) => (
        <div className="fg-card-editor" key={p.id}>
          <div className="fg-card-editor__head">
            <span className="fg-badge">{idx + 1}</span>
            <input className="fg-input fg-input--ghost" placeholder="Project name"
              value={p.name} onChange={(e) => updateProject(p.id, "name", e.target.value)} />
            <button className="fg-btn-icon" onClick={() => removeProject(p.id)} title="Remove">
              <X size={16} />
            </button>
          </div>
          <div className="fg-field-grid">
            <Field label="Technologies used">
              <input className="fg-input" value={p.techStack}
                onChange={(e) => updateProject(p.id, "techStack", e.target.value)}
                placeholder="React, Node.js, Docker" />
            </Field>
            <Field label="Project link">
              <input className="fg-input" value={p.link}
                onChange={(e) => updateProject(p.id, "link", e.target.value)}
                placeholder="github.com/you/project" />
            </Field>
          </div>
          <Field label="Description" hint="1-3 sentences. What problem did it solve?">
            <textarea className="fg-input fg-input--textarea" rows={3} value={p.description}
              onChange={(e) => updateProject(p.id, "description", e.target.value)} />
          </Field>
        </div>
      ))}

      <button className="fg-btn fg-btn--ghost fg-btn--block" onClick={addProject}>
        + Add Project
      </button>
    </div>
  );
}


// ---------- Target Step ----------
function TargetStep({ job, setJob }) {
  return (
    <div className="fg-step">
      <div className="fg-step__header">
        <h2 className="fg-step__title">Target Role</h2>
        <p className="fg-step__subtitle">Optional but powerful — let the AI tailor your resume to a specific role.</p>
      </div>

      <div className="fg-field-grid">
        <Field label="Job Role">
          <input className="fg-input" value={job.role}
            onChange={(e) => setJob({ ...job, role: e.target.value })}
            placeholder="Software Engineer" />
        </Field>
        <Field label="Company (optional)">
          <input className="fg-input" value={job.company}
            onChange={(e) => setJob({ ...job, company: e.target.value })}
            placeholder="Google" />
        </Field>
      </div>

      <Field label="Job Description" hint="Paste the full posting. The AI will extract keywords and weave them in naturally.">
        <textarea className="fg-input fg-input--textarea" rows={10} value={job.description}
          onChange={(e) => setJob({ ...job, description: e.target.value })}
          placeholder="Paste the job description here..." />
      </Field>
    </div>
  );
}


// ---------- Generate Step ----------
function GenerateStep({ generating, generationSteps, onGenerate }) {
  const labels = {
    loading_rules: "Loading rule layers",
    analyzing_inputs: "Analyzing the role",
    matching_keywords: "Matching your experience",
    writing_resume: "Writing your resume",
    qa_validation: "Running quality checks",
  };

  return (
    <div className="fg-step fg-step--centered">
      <div className="fg-step__header">
        <h2 className="fg-step__title">Generate your resume</h2>
        <p className="fg-step__subtitle">
          The AI will draft a tailored resume using the data you entered. Nothing is fabricated — gaps stay gaps.
        </p>
      </div>

      {!generating && (
        <button className="fg-btn fg-btn--primary fg-btn--lg" onClick={onGenerate}>
          Generate My Resume
        </button>
      )}

      {generating && (
        <div className="fg-generating">
          <div className="fg-generating__spinner" />
          <div className="fg-generating__steps">
            {Object.keys(labels).map((key) => {
              const isDone = generationSteps.indexOf(key) === -1;
              const isActive = !isDone && generationSteps[0] === key;
              return (
                <div key={key}
                  className={`fg-generating__step ${isDone ? "is-done" : ""} ${isActive ? "is-active" : ""}`}>
                  <span className="fg-generating__bullet">
                    {isDone ? <Check size={10} /> : <span />}
                  </span>
                  <span>{labels[key]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


// ---------- Review Step ----------
function ReviewStep({ generated, warnings, versionName, setVersionName, templateId, setTemplateId,
                     templates, savedId, onSave, onExport, onReEdit }) {
  const [exportFormat, setExportFormat] = useState("docx");
  return (
    <div className="fg-step">
      <div className="fg-step__header">
        <h2 className="fg-step__title">Review &amp; Export</h2>
        <p className="fg-step__subtitle">The live preview reflects your final, ATS-friendly output.</p>
      </div>

      <div className="fg-field-grid">
        <Field label="Version name">
          <input className="fg-input" value={versionName}
            onChange={(e) => setVersionName(e.target.value)} />
        </Field>
        <Field label="Template">
          <select className="fg-input" value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}>
            {(templates.length ? templates : [
              { id: "classic", label: "Classic" },
              { id: "professional", label: "Professional" },
              { id: "modern", label: "Modern" },
              { id: "minimal", label: "Minimal" },
              { id: "student", label: "Graduate" },
              { id: "software-engineer", label: "Software Engineer" },
            ]).map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
          </select>
        </Field>
      </div>

      {warnings && warnings.length > 0 && (
        <div className="fg-warning-box">
          <AlertCircle size={14} />
          <div>
            <strong>Heads up:</strong>
            <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        </div>
      )}

      {!generated && (
        <div className="fg-empty-state">
          <p>You haven't generated a resume yet. Go back to
            <button className="fg-link" onClick={onReEdit}> personal info </button>
            or run generation from the previous step.
          </p>
        </div>
      )}

      <div className="fg-review-actions">
        <button className="fg-btn fg-btn--ghost" onClick={onSave}>
          <Save size={14} /> {savedId ? "Update" : "Save"}
        </button>
        <div className="fg-export-group">
          <select className="fg-input fg-input--inline" value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value)}>
            <option value="docx">DOCX</option>
            <option value="pdf">PDF</option>
            <option value="md">Markdown</option>
            <option value="json">JSON</option>
          </select>
          <button className="fg-btn fg-btn--primary" disabled={!savedId}
            onClick={() => onExport(exportFormat)}>
            <Download size={14} /> Export {exportFormat.toUpperCase()}
          </button>
        </div>
      </div>
    </div>
  );
}


// ---------- Live Preview ----------
function LivePreview({ candidate, job, templateId, generated, zoom }) {
  const stageRef = useRef(null);
  const sheetRef = useRef(null);
  const [scale, setScale] = useState(1);

  const view = useMemo(() => {
    if (generated?.header) return generated;
    return candidateToPreview(candidate, job, templateId);
  }, [generated, candidate, job, templateId]);

  const pi = (candidate.personal_info || {});
  const hasContent = pi.fullName || pi.email
    || (candidate.work_experience || []).length || (candidate.education || []).length
    || (candidate.skills || []).length || (candidate.projects || []).length;

  useLayoutEffect(() => {
    if (typeof zoom === "number") {
      setScale(zoom);
      return;
    }
    const compute = () => {
      const stage = stageRef.current;
      const sheet = sheetRef.current;
      if (!stage || !sheet) return;
      const rect = stage.getBoundingClientRect();
      const contentH = sheet.scrollHeight || A4_H;
      const availW = Math.max(140, rect.width - 32);
      const availH = Math.max(200, rect.height - 32);
      const s = Math.min(availW / A4_W, availH / Math.max(contentH, A4_H));
      setScale(Math.min(1.25, Math.max(0.32, s)));
    };
    compute();
    const ro = new ResizeObserver(compute);
    if (stageRef.current) ro.observe(stageRef.current);
    return () => ro.disconnect();
  }, [zoom, view]);

  const sheetH = sheetRef.current?.scrollHeight || A4_H;

  if (!hasContent && !generated) {
    return (
      <div className="fg-preview-empty">
        <div className="fg-preview-empty__sheet">
          <FileText size={30} />
        </div>
        <p className="fg-preview-empty__title">Your live preview will appear here</p>
        <p className="fg-preview-empty__sub">
          Fill in a section and the resume document renders instantly, like a real A4 page.
        </p>
      </div>
    );
  }

  return (
    <div className="fg-rb__sheet-wrap" style={{ width: A4_W * scale, height: sheetH * scale }}>
      <article
        ref={sheetRef}
        className={`fg-resume fg-resume--${templateId}`}
        style={{ width: A4_W, transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        <header className="fg-resume__head">
          <h1>{view?.header?.full_name || candidate.personal_info.fullName || "Untitled Resume"}</h1>
          {view?.header?.title && <div className="fg-resume__title">{view.header.title}</div>}
          {(view?.header?.contacts || []).length > 0 && (
            <div className="fg-resume__contacts">
              {(view.header.contacts || []).filter(Boolean).join("  \u00B7  ")}
            </div>
          )}
        </header>

        {(view?.summary?.summary_text || candidate.summary) && (
          <section className="fg-resume__section">
            <h2>Summary</h2>
            <p>{view?.summary?.summary_text || candidate.summary}</p>
          </section>
        )}

        {(view?.skills?.groups || []).length > 0 && (
          <section className="fg-resume__section">
            <h2>Skills</h2>
            {view.skills.groups.map((g, i) => (
              <div key={i} className="fg-resume__skill-line">
                <strong>{g.group_name}:</strong>
                <span>{(g.items || []).filter(Boolean).join("  \u00B7  ")}</span>
              </div>
            ))}
          </section>
        )}

        {(view?.experience || []).length > 0 && (
          <section className="fg-resume__section">
            <h2>Experience</h2>
            {view.experience.map((exp, i) => (
              <div key={i} className="fg-resume__entry">
                <div className="fg-resume__row">
                  <strong>{exp.role}</strong>
                  {(exp.start_date || exp.end_date) && (
                    <span className="fg-resume__dates">{exp.start_date} \u2013 {exp.end_date}</span>
                  )}
                </div>
                {(exp.company || exp.location) && (
                  <div className="fg-resume__org">
                    {[exp.company, exp.location].filter(Boolean).join("  \u00B7  ")}
                  </div>
                )}
                {(exp.highlights || []).length > 0 && (
                  <ul className="fg-resume__bullets">
                    {(exp.highlights || []).map((h, idx) => <li key={idx}>{h}</li>)}
                  </ul>
                )}
              </div>
            ))}
          </section>
        )}

        {(view?.education || []).length > 0 && (
          <section className="fg-resume__section">
            <h2>Education</h2>
            {view.education.map((e, i) => (
              <div key={i} className="fg-resume__entry">
                <div className="fg-resume__row">
                  <strong>{e.institution}</strong>
                  {(e.start_date || e.end_date) && (
                    <span className="fg-resume__dates">{e.start_date} \u2013 {e.end_date}</span>
                  )}
                </div>
                {(e.degree || e.field) && (
                  <div className="fg-resume__org">
                    {[e.degree, e.field, e.gpa, e.location].filter(Boolean).join("  \u00B7  ")}
                  </div>
                )}
              </div>
            ))}
          </section>
        )}

        {(view?.optional_sections || []).map((s, i) => (
          <section key={i} className="fg-resume__section">
            <h2>{s.title}</h2>
            <ul className="fg-resume__bullets">
              {(s.items || []).map((it, j) => <li key={j}>{it}</li>)}
            </ul>
          </section>
        ))}
      </article>
    </div>
  );
}

function candidateToPreview(candidate, job, templateId) {
  const safe = candidate && typeof candidate === "object" ? candidate : {};
  const pi = safe.personal_info && typeof safe.personal_info === "object" ? safe.personal_info : {};
  const contacts = [pi.email, pi.phone, pi.location, pi.linkedin, pi.github, pi.portfolio]
    .filter((v) => v && String(v).trim()).map((v) => String(v).trim());
  const skillsGroups = [];
  if (Array.isArray(safe.skills) && safe.skills.length) {
    skillsGroups.push({ group_name: "Skills", items: safe.skills.map((s) => String(s)).filter(Boolean) });
  }
  return {
    header: { full_name: pi.fullName || "", title: pi.title || job?.role || "", contacts },
    summary: { summary_text: safe.summary || "" },
    skills: { groups: skillsGroups },
    experience: (safe.work_experience || []).map((e) => ({
      role: e && e.role ? String(e.role) : "",
      company: e && e.company ? String(e.company) : "",
      location: e && e.location ? String(e.location) : "",
      start_date: e && e.startDate ? String(e.startDate) : "",
      end_date: e && e.endDate ? String(e.endDate) : "",
      highlights: String((e && e.description) || "").split(/\n+/).map((s) => s.trim()).filter(Boolean),
    })),
    education: (safe.education || []).map((e) => ({
      institution: e && e.school ? String(e.school) : "",
      degree: e && e.degree ? String(e.degree) : "",
      field: e && e.field ? String(e.field) : "",
      start_date: e && e.startDate ? String(e.startDate) : "",
      end_date: e && e.endDate ? String(e.endDate) : "",
      gpa: e && e.gpa ? String(e.gpa) : "",
      location: e && e.location ? String(e.location) : "",
    })),
    optional_sections: (safe.projects || []).length
      ? [{ title: "Projects", items: safe.projects.map((p) => `${p && p.name ? p.name : ""} ${p && p.techStack ? "— " + p.techStack : ""}${p && p.description ? ": " + p.description : ""}`.trim()) }]
      : [],
  };
}


// ---------- Shared UI ----------
function Field({ label, required, hint, children }) {
  return (
    <label className="fg-field">
      <span className="fg-field__label">{label}{required && <em className="fg-required">*</em>}</span>
      {children}
      {hint && <span className="fg-field__hint">{hint}</span>}
    </label>
  );
}

function mergeCandidate(base, payload) {
  if (!payload || typeof payload !== "object") return base;
  const c = { ...base, ...payload };
  c.personal_info = { ...(base.personal_info || {}), ...(payload.personal_info || {}) };
  ["work_experience", "education", "projects", "certifications", "awards", "languages"].forEach((k) => {
    if (!Array.isArray(c[k])) c[k] = [];
  });
  if (!Array.isArray(c.skills)) {
    if (c.skills && typeof c.skills === "object" && Array.isArray(c.skills.technical)) {
      c.skills = c.skills.technical;
    } else if (typeof c.skills === "string") {
      c.skills = c.skills.split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      c.skills = [];
    }
  }
  c.summary = typeof c.summary === "string" ? c.summary : c.summary ? String(c.summary) : "";
  return c;
}
