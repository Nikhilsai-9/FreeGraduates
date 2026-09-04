// =====================================================================
// FreeGraduates AI Resume Builder
// Step-by-step guided experience for students, fresh graduates, and
// early-career professionals. Connects to the Python FastAPI backend.
// =====================================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resumeApi } from "../api/api";

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

// ---------- Step definitions ----------
const STEPS = [
  { id: "start",      label: "1. Start",         short: "Start"      },
  { id: "personal",   label: "2. Personal Info", short: "Info"       },
  { id: "experience", label: "3. Experience",    short: "Experience" },
  { id: "education",  label: "4. Education",     short: "Education"  },
  { id: "skills",     label: "5. Skills",        short: "Skills"     },
  { id: "projects",   label: "6. Projects",      short: "Projects"   },
  { id: "target",     label: "7. Target Job",    short: "Target"     },
  { id: "generate",   label: "8. Generate",      short: "Generate"   },
  { id: "review",     label: "9. Review",        short: "Review"     },
];

export default function ResumeBuilderView({ onBackToDashboard, initialOptions }) {
  const [candidate, setCandidate] = useState(newCandidate());
  const [job, setJob] = useState({ role: "", company: "", description: "" });
  const [step, setStep] = useState("start");
  const [creationPath, setCreationPath] = useState(initialOptions?.creationPath || "scratch");
  const [templateId, setTemplateId] = useState(initialOptions?.templateStyle || "classic");
  const [templates, setTemplates] = useState([]);
  const [savedId, setSavedId] = useState(initialOptions?.resumeId || null);
  const [versionName, setVersionName] = useState("My Resume");

  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationSteps, setGenerationSteps] = useState([]);
  const [generated, setGenerated] = useState(null);
  const [warnings, setWarnings] = useState([]);
  const [toast, setToast] = useState(null);
  const [savedIds, setSavedIds] = useState([]);

  const showToast = (msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
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
    }
  }, [initialOptions?.resumeId]);



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
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx >= 0 && idx < STEPS.length - 1) setStep(STEPS[idx + 1].id);
  };
  const gotoPrev = () => {
    const idx = STEPS.findIndex((s) => s.id === step);
    if (idx > 0) setStep(STEPS[idx - 1].id);
  };
  const gotoStep = (id) => {
    if (STEPS.find((s) => s.id === id)) setStep(id);
  };

  // ---------- Resume extraction (PDF upload) ----------
  const fileInput = useRef(null);
  const onFileSelected = async (file) => {
    if (!file) return;
    setExtracting(true);
    setCreationPath("upload");
    try {
      const res = await resumeApi.extract(file);
      if (res?.parsed) {
        setCandidate(mergeCandidate(newCandidate(), res.parsed));
        showToast("Resume extracted - review and continue.", "success");
        setStep("personal");
      } else {
        showToast("Extraction returned no data. Please try another PDF.", "error");
      }
    } catch (err) {
      showToast("We couldn't read this file. Please try another PDF.", "error");
    } finally {
      setExtracting(false);
    }
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
  return (
    <div className="fg-rb">
      {toast && (
        <div className={`fg-rb__toast fg-rb__toast--${toast.type}`}>{toast.msg}</div>
      )}

      <header className="fg-rb__topbar">
        <button className="fg-rb__back" onClick={onBackToDashboard}>← Dashboard</button>
        <div className="fg-rb__topbar-title">
          <span className="fg-rb__eyebrow">FREEGRADUATES</span>
          <h1>AI Resume Builder</h1>
        </div>
        <div className="fg-rb__topbar-actions">
          {savedId && step !== "start" && (
            <span className="fg-rb__saved-pill">✓ Saved</span>
          )}
          <button
            className="fg-btn fg-btn--ghost"
            onClick={handleSave}
            disabled={!candidate.personal_info.fullName}
          >
            {savedId ? "Update" : "Save"}
          </button>
        </div>
      </header>

      <div className="fg-rb__shell">
        <nav className="fg-rb__rail" aria-label="Builder steps">
          <ol>
            {STEPS.map((s) => (
              <li key={s.id}>
                <button
                  className={`fg-rb__step-btn ${step === s.id ? "is-active" : ""}`}
                  onClick={() => gotoStep(s.id)}
                  aria-current={step === s.id ? "step" : undefined}
                >
                  <span>{s.label}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <section className="fg-rb__main">
          <div className="fg-rb__editor">
            {step === "start" && (
              <StartStep
                candidate={candidate}
                creationPath={creationPath}
                setCreationPath={setCreationPath}
                templates={templates}
                templateId={templateId}
                setTemplateId={setTemplateId}
                savedIds={savedIds}
                loadingTemplates={templates.length === 0}
                extracting={extracting}
                fileInput={fileInput}
                onScratch={() => startNewResume("scratch")}
                onUseTemplate={() => startNewResume("template")}
                onFile={onFileSelected}
                onLoadResume={loadSavedResume}
              />
            )}
            {step === "personal" && (
              <PersonalStep
                candidate={candidate}
                setPersonal={setPersonal}
                setCandidate={setCandidate}
              />
            )}
            {step === "experience" && (
              <ExperienceStep
                candidate={candidate}
                addExperience={addExperience}
                updateExperience={updateExperience}
                removeExperience={removeExperience}
              />
            )}
            {step === "education" && (
              <EducationStep
                candidate={candidate}
                addEducation={addEducation}
                updateEducation={updateEducation}
                removeEducation={removeEducation}
              />
            )}
            {step === "skills" && (
              <SkillsStep candidate={candidate} setSkillsText={setSkillsText} />
            )}
            {step === "projects" && (
              <ProjectsStep
                candidate={candidate}
                addProject={addProject}
                updateProject={updateProject}
                removeProject={removeProject}
              />
            )}
            {step === "target" && (
              <TargetStep job={job} setJob={setJob} />
            )}
            {step === "generate" && (
              <GenerateStep
                candidate={candidate}
                generating={generating}
                generationSteps={generationSteps}
                onGenerate={handleGenerate}
                onBack={gotoPrev}
              />
            )}
            {step === "review" && (
              <ReviewStep
                generated={generated}
                warnings={warnings}
                versionName={versionName}
                setVersionName={setVersionName}
                templateId={templateId}
                setTemplateId={setTemplateId}
                templates={templates}
                savedId={savedId}
                onSave={handleSave}
                onExport={handleExport}
                onReEdit={() => setStep("personal")}
              />
            )}

            {step !== "start" && (
              <div className="fg-rb__nav">
                <button className="fg-btn fg-btn--ghost" onClick={gotoPrev}>← Back</button>
                {step !== "review" && (
                  <button className="fg-btn fg-btn--primary" onClick={gotoNext}>
                    {step === "generate" ? "Skip - show preview" : "Continue →"}
                  </button>
                )}
              </div>
            )}
          </div>

          <aside className="fg-rb__preview">
            <div className="fg-rb__preview-header">
              <span className="fg-rb__eyebrow">LIVE PREVIEW</span>
              <h3>Your resume, updated as you type</h3>
            </div>
            <div className="fg-rb__preview-paper">
              <LivePreview candidate={candidate} job={job} templateId={templateId} generated={generated} />
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}



// ---------- Step Components ----------

function StartStep({ creationPath, setCreationPath, templates, templateId, setTemplateId,
                    savedIds, extracting, fileInput,
                    onScratch, onUseTemplate, onFile, onLoadResume }) {
  return (
    <div className="fg-step">
      <span className="fg-step__eyebrow">STEP 1</span>
      <h2 className="fg-step__title">How would you like to start?</h2>
      <p className="fg-step__subtitle">Choose how you want to build your resume. You can change your mind at any time.</p>

      <div className="fg-cards-3">
        <button className={`fg-choice ${creationPath === "scratch" ? "is-active" : ""}`} onClick={onScratch}>
          <div className="fg-choice__icon">＋</div>
          <h4>Start from Scratch</h4>
          <p>Walk through every section and build your resume step by step.</p>
        </button>

        <div className={`fg-choice ${creationPath === "upload" ? "is-active" : ""}`}>
          <div className="fg-choice__icon">↑</div>
          <h4>Upload Existing Resume</h4>
          <p>Drop a PDF and we will extract your details. You review before continuing.</p>
          <input ref={fileInput} type="file" accept="application/pdf" style={{ display: "none" }} onChange={(e) => onFile(e.target.files?.[0])} />
          <button className="fg-btn fg-btn--primary fg-btn--block" disabled={extracting} onClick={() => fileInput.current?.click()}>
            {extracting ? "Extracting…" : "Choose PDF"}
          </button>
        </div>

        <div className={`fg-choice ${creationPath === "template" ? "is-active" : ""}`}>
          <div className="fg-choice__icon">❘</div>
          <h4>Use a Template</h4>
          <p>Pick a template first - ATS-friendly by default.</p>
          <select className="fg-input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
            {(templates.length ? templates : [
              { id: "classic", label: "Classic" },
              { id: "professional", label: "Professional" },
              { id: "modern", label: "Modern" },
              { id: "minimal", label: "Minimal" },
              { id: "student", label: "Graduate" },
              { id: "software-engineer", label: "Software Engineer" },
            ]).map((t) => (<option key={t.id} value={t.id}>{t.label}</option>))}
          </select>
          <button className="fg-btn fg-btn--ghost fg-btn--block" onClick={onUseTemplate}>Start with Template</button>
        </div>
      </div>

      {savedIds.length > 0 && (
        <div className="fg-section-block" style={{ marginTop: "32px" }}>
          <h4 className="fg-step__h">Your saved resumes</h4>
          <ul className="fg-saved-list">
            {savedIds.map((r) => (
              <li key={r.id}>
                <span>{r.versionName}</span>
                <small>Updated {new Date(r.updatedAt).toLocaleString()}</small>
                <button className="fg-btn fg-btn--ghost" onClick={() => onLoadResume(r.id)}>Open</button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PersonalStep({ candidate, setPersonal, setCandidate }) {
  const pi = candidate.personal_info;
  return (
    <div className="fg-step">
      <span className="fg-step__eyebrow">STEP 2</span>
      <h2 className="fg-step__title">Tell us about you</h2>
      <p className="fg-step__subtitle">Your contact information and a short summary.</p>

      <div className="fg-grid-2">
        <Field label="Full Name" required><input className="fg-input" value={pi.fullName} onChange={(e) => setPersonal("fullName", e.target.value)} /></Field>
        <Field label="Professional Title"><input className="fg-input" value={pi.title} placeholder="e.g. Software Engineer" onChange={(e) => setPersonal("title", e.target.value)} /></Field>
        <Field label="Email" required><input className="fg-input" type="email" value={pi.email} onChange={(e) => setPersonal("email", e.target.value)} /></Field>
        <Field label="Phone"><input className="fg-input" value={pi.phone} onChange={(e) => setPersonal("phone", e.target.value)} /></Field>
        <Field label="Location"><input className="fg-input" value={pi.location} placeholder="City, Country" onChange={(e) => setPersonal("location", e.target.value)} /></Field>
        <Field label="LinkedIn"><input className="fg-input" value={pi.linkedin} placeholder="linkedin.com/in/you" onChange={(e) => setPersonal("linkedin", e.target.value)} /></Field>
        <Field label="GitHub"><input className="fg-input" value={pi.github} placeholder="github.com/you" onChange={(e) => setPersonal("github", e.target.value)} /></Field>
        <Field label="Portfolio / Website"><input className="fg-input" value={pi.portfolio} onChange={(e) => setPersonal("portfolio", e.target.value)} /></Field>
      </div>

      <Field label="Professional Summary" hint="2-3 sentences. Highlight your focus, strengths, and what you are looking for.">
        <textarea className="fg-input fg-input--textarea" rows={4} value={candidate.summary} onChange={(e) => setCandidate({ ...candidate, summary: e.target.value })} />
      </Field>
    </div>
  );
}



function ExperienceStep({ candidate, addExperience, updateExperience, removeExperience }) {
  return (
    <div className="fg-step">
      <span className="fg-step__eyebrow">STEP 3</span>
      <h2 className="fg-step__title">Experience</h2>
      <p className="fg-step__subtitle">Add internships, jobs, or research roles. Leave anything blank that does not apply.</p>

      {candidate.work_experience.length === 0 && (
        <EmptyHelp title="No experience?" text="Add internships, academic research, hackathons, leadership roles or volunteering experience." />
      )}

      {candidate.work_experience.map((exp, idx) => (
        <div className="fg-card-editor" key={exp.id}>
          <div className="fg-card-editor__head">
            <span className="fg-badge">#{idx + 1}</span>
            <input className="fg-input fg-input--ghost" placeholder="Role / Title" value={exp.role} onChange={(e) => updateExperience(exp.id, "role", e.target.value)} />
            <button className="fg-btn-icon" onClick={() => removeExperience(exp.id)} title="Remove">×</button>
          </div>
          <div className="fg-grid-2">
            <Field label="Company / Organisation"><input className="fg-input" value={exp.company} onChange={(e) => updateExperience(exp.id, "company", e.target.value)} /></Field>
            <Field label="Location"><input className="fg-input" value={exp.location} onChange={(e) => updateExperience(exp.id, "location", e.target.value)} /></Field>
            <Field label="Start date"><input className="fg-input" placeholder="Jun 2024" value={exp.startDate} onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)} /></Field>
            <Field label="End date"><input className="fg-input" placeholder="Aug 2024 or Present" value={exp.endDate} onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)} /></Field>
          </div>
          <Field label="Key contributions" hint="Use action verbs. The AI will refine these but never invent metrics or facts.">
            <textarea className="fg-input fg-input--textarea" rows={4} value={exp.description} onChange={(e) => updateExperience(exp.id, "description", e.target.value)} placeholder="e.g. Built a feature flag system in Go that reduced deploy downtime by 30%." />
          </Field>
        </div>
      ))}

      <button className="fg-btn fg-btn--ghost fg-btn--block" onClick={addExperience}>+ Add Experience</button>
    </div>
  );
}

function EducationStep({ candidate, addEducation, updateEducation, removeEducation }) {
  return (
    <div className="fg-step">
      <span className="fg-step__eyebrow">STEP 4</span>
      <h2 className="fg-step__title">Education</h2>
      <p className="fg-step__subtitle">Schools, degrees, dates - GPA is optional.</p>

      {candidate.education.map((ed, idx) => (
        <div className="fg-card-editor" key={ed.id}>
          <div className="fg-card-editor__head">
            <span className="fg-badge">#{idx + 1}</span>
            <input className="fg-input fg-input--ghost" placeholder="School / University" value={ed.school} onChange={(e) => updateEducation(ed.id, "school", e.target.value)} />
            <button className="fg-btn-icon" onClick={() => removeEducation(ed.id)} title="Remove">×</button>
          </div>
          <div className="fg-grid-2">
            <Field label="Degree"><input className="fg-input" value={ed.degree} onChange={(e) => updateEducation(ed.id, "degree", e.target.value)} placeholder="e.g. Bachelor of Technology" /></Field>
            <Field label="Field of study"><input className="fg-input" value={ed.field} onChange={(e) => updateEducation(ed.id, "field", e.target.value)} placeholder="Computer Science" /></Field>
            <Field label="Start year"><input className="fg-input" value={ed.startDate} placeholder="2022" onChange={(e) => updateEducation(ed.id, "startDate", e.target.value)} /></Field>
            <Field label="End year"><input className="fg-input" value={ed.endDate} placeholder="2026" onChange={(e) => updateEducation(ed.id, "endDate", e.target.value)} /></Field>
            <Field label="GPA / CGPA (optional)"><input className="fg-input" value={ed.gpa} placeholder="3.8 / 4.0" onChange={(e) => updateEducation(ed.id, "gpa", e.target.value)} /></Field>
            <Field label="Location"><input className="fg-input" value={ed.location} onChange={(e) => updateEducation(ed.id, "location", e.target.value)} /></Field>
          </div>
        </div>
      ))}

      <button className="fg-btn fg-btn--ghost fg-btn--block" onClick={addEducation}>+ Add Education</button>
    </div>
  );
}

function SkillsStep({ candidate, setSkillsText }) {
  const text = Array.isArray(candidate.skills) ? candidate.skills.join(", ") : "";
  return (
    <div className="fg-step">
      <span className="fg-step__eyebrow">STEP 5</span>
      <h2 className="fg-step__title">Skills</h2>
      <p className="fg-step__subtitle">Type any skills you have. Separate them with commas - the AI will group them later.</p>
      <Field label="Your skills" hint="e.g. JavaScript, React, Python, Figma, Leadership">
        <textarea className="fg-input fg-input--textarea" rows={5} value={text} onChange={(e) => setSkillsText(e.target.value)} placeholder="TypeScript, React, Node.js, Python, PostgreSQL, Docker" />
      </Field>
      {Array.isArray(candidate.skills) && candidate.skills.length > 0 && (
        <div className="fg-chip-row">
          {candidate.skills.map((s, i) => (<span key={i} className="fg-chip">{s}</span>))}
        </div>
      )}
    </div>
  );
}



function ProjectsStep({ candidate, addProject, updateProject, removeProject }) {
  return (
    <div className="fg-step">
      <span className="fg-step__eyebrow">STEP 6</span>
      <h2 className="fg-step__title">Projects</h2>
      <p className="fg-step__subtitle">Academic, personal, hackathon or open-source projects. Tools used matter.</p>

      {candidate.projects.length === 0 && (
        <EmptyHelp title="First-time resume?" text="Add 2-3 projects from coursework, internships or your own builds. The AI will not invent anything you did not write." />
      )}

      {candidate.projects.map((p, idx) => (
        <div className="fg-card-editor" key={p.id}>
          <div className="fg-card-editor__head">
            <span className="fg-badge">#{idx + 1}</span>
            <input className="fg-input fg-input--ghost" placeholder="Project name" value={p.name} onChange={(e) => updateProject(p.id, "name", e.target.value)} />
            <button className="fg-btn-icon" onClick={() => removeProject(p.id)} title="Remove">×</button>
          </div>
          <div className="fg-grid-2">
            <Field label="Technologies used"><input className="fg-input" value={p.techStack} onChange={(e) => updateProject(p.id, "techStack", e.target.value)} placeholder="React, Node.js, Docker" /></Field>
            <Field label="Project link"><input className="fg-input" value={p.link} onChange={(e) => updateProject(p.id, "link", e.target.value)} placeholder="github.com/you/project" /></Field>
          </div>
          <Field label="What it does" hint="1-3 sentences. What problem did it solve? What did you build?">
            <textarea className="fg-input fg-input--textarea" rows={3} value={p.description} onChange={(e) => updateProject(p.id, "description", e.target.value)} />
          </Field>
        </div>
      ))}

      <button className="fg-btn fg-btn--ghost fg-btn--block" onClick={addProject}>+ Add Project</button>
    </div>
  );
}

function TargetStep({ job, setJob }) {
  return (
    <div className="fg-step">
      <span className="fg-step__eyebrow">STEP 7</span>
      <h2 className="fg-step__title">Target Role</h2>
      <p className="fg-step__subtitle">Optional but powerful - let the AI tailor your resume to a specific role.</p>

      <div className="fg-grid-2">
        <Field label="Job Role"><input className="fg-input" value={job.role} onChange={(e) => setJob({ ...job, role: e.target.value })} placeholder="Software Engineer" /></Field>
        <Field label="Company (optional)"><input className="fg-input" value={job.company} onChange={(e) => setJob({ ...job, company: e.target.value })} /></Field>
      </div>

      <Field label="Job Description" hint="Paste the full posting. The AI will extract keywords and weave them in naturally - never stuffing.">
        <textarea className="fg-input fg-input--textarea" rows={10} value={job.description} onChange={(e) => setJob({ ...job, description: e.target.value })} placeholder="Paste the job description here..." />
      </Field>
    </div>
  );
}



function GenerateStep({ generating, generationSteps, onGenerate, onBack }) {
  const labels = {
    loading_rules: "Loading rule layers",
    analyzing_inputs: "Analyzing the role",
    matching_keywords: "Matching your experience",
    writing_resume: "Writing your resume",
    qa_validation: "Running quality checks",
  };

  return (
    <div className="fg-step fg-step--centered">
      <span className="fg-step__eyebrow">STEP 8</span>
      <h2 className="fg-step__title">Generate your resume</h2>
      <p className="fg-step__subtitle">The AI will draft a tailored resume using the data you entered. Nothing is fabricated - gaps stay gaps.</p>

      {!generating && (
        <button className="fg-btn fg-btn--primary fg-btn--large" onClick={onGenerate}>⚡ Generate My Resume</button>
      )}

      {generating && (
        <div className="fg-progress">
          <div className="fg-progress__spinner" />
          <ol className="fg-progress__steps">
            {Object.keys(labels).map((key) => {
              const reached = generationSteps.indexOf(key) === -1;
              return (
                <li key={key} className={reached ? "is-done" : "is-active"}>
                  <span className="fg-progress__bullet">{reached ? "✓" : "●"}</span>
                  {labels[key]}
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

function ReviewStep({ generated, warnings, versionName, setVersionName, templateId, setTemplateId, templates, savedId, onSave, onExport, onReEdit }) {
  const [exportFormat, setExportFormat] = useState("docx");
  return (
    <div className="fg-step">
      <span className="fg-step__eyebrow">STEP 9</span>
      <h2 className="fg-step__title">Review &amp; Export</h2>
      <p className="fg-step__subtitle">The live preview on the right reflects the final, ATS-friendly output.</p>

      <div className="fg-grid-2">
        <Field label="Version name"><input className="fg-input" value={versionName} onChange={(e) => setVersionName(e.target.value)} /></Field>
        <Field label="Template">
          <select className="fg-input" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
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
        <div className="fg-warning-list">
          <strong>Heads up:</strong>
          <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      {!generated && (
        <div className="fg-empty-info">
          You have not generated a resume yet. Go back to <button className="fg-link" onClick={onReEdit}>personal info</button> or run generation from the previous step.
        </div>
      )}

      <div className="fg-action-row">
        <button className="fg-btn fg-btn--ghost" onClick={onSave}>{savedId ? "Update" : "Save"}</button>
        <select className="fg-input fg-input--inline" value={exportFormat} onChange={(e) => setExportFormat(e.target.value)}>
          <option value="docx">DOCX</option>
          <option value="pdf">PDF</option>
          <option value="md">Markdown</option>
          <option value="json">JSON</option>
        </select>
        <button className="fg-btn fg-btn--primary" disabled={!savedId} onClick={() => onExport(exportFormat)}>Export {exportFormat.toUpperCase()}</button>
      </div>
    </div>
  );
}



// ---------- Live Preview ----------
function LivePreview({ candidate, job, templateId, generated }) {
  const ref = useRef(null);
  const view = useMemo(() => {
    if (generated?.header) return generated;
    return candidateToPreview(candidate, job, templateId);
  }, [generated, candidate, job, templateId]);

  return (
    <article ref={ref} className={`fg-resume fg-resume--${templateId}`}>
      <header className="fg-resume__head">
        <h1>{view?.header?.full_name || candidate.personal_info.fullName || "Your Name"}</h1>
        {view?.header?.title && <div className="fg-resume__title">{view.header.title}</div>}
        {(view?.header?.contacts || []).length > 0 && (
          <div className="fg-resume__contacts">{(view.header.contacts || []).filter(Boolean).join(" · ")}</div>
        )}
      </header>

      {(view?.summary?.summary_text || candidate.summary) && (
        <section>
          <h2>Summary</h2>
          <p>{view?.summary?.summary_text || candidate.summary}</p>
        </section>
      )}

      {(view?.skills?.groups || []).length > 0 && (
        <section>
          <h2>Skills</h2>
          {view.skills.groups.map((g, i) => (
            <p key={i}><strong>{g.group_name}:</strong> {(g.items || []).join(", ")}</p>
          ))}
        </section>
      )}

      {(view?.experience || []).length > 0 && (
        <section>
          <h2>Experience</h2>
          {view.experience.map((exp, i) => (
            <div key={i} className="fg-resume__entry">
              <div className="fg-resume__entry-head">
                <strong>{exp.role}</strong>
                <span>{exp.company}</span>
              </div>
              <div className="fg-resume__entry-meta">{exp.start_date} – {exp.end_date}</div>
              {(exp.highlights || []).length > 0 && (
                <ul>{(exp.highlights || []).map((h, idx) => <li key={idx}>{h}</li>)}</ul>
              )}
            </div>
          ))}
        </section>
      )}

      {(view?.education || []).length > 0 && (
        <section>
          <h2>Education</h2>
          {view.education.map((e, i) => (
            <div key={i} className="fg-resume__entry">
              <div className="fg-resume__entry-head">
                <strong>{e.institution}</strong>
                <span>{e.degree}{e.field ? `, ${e.field}` : ""}</span>
              </div>
              {(e.start_date || e.end_date) && (
                <div className="fg-resume__entry-meta">{e.start_date} – {e.end_date}</div>
              )}
            </div>
          ))}
        </section>
      )}

      {(view?.optional_sections || []).map((s, i) => (
        <section key={i}>
          <h2>{s.title}</h2>
          <ul>{(s.items || []).map((it, j) => <li key={j}>{it}</li>)}</ul>
        </section>
      ))}
    </article>
  );
}

function candidateToPreview(candidate, job, templateId) {
  const pi = candidate.personal_info;
  const contacts = [pi.email, pi.phone, pi.location, pi.linkedin, pi.github].filter(Boolean);
  const skillsGroups = [];
  if (Array.isArray(candidate.skills) && candidate.skills.length) {
    skillsGroups.push({ group_name: "Skills", items: candidate.skills });
  }
  return {
    header: { full_name: pi.fullName, title: pi.title || job?.role || "", contacts },
    summary: { summary_text: candidate.summary || "" },
    skills: { groups: skillsGroups },
    experience: (candidate.work_experience || []).map((e) => ({
      role: e.role, company: e.company,
      start_date: e.startDate, end_date: e.endDate,
      highlights: (e.description || "").split(/\n+/).map((s) => s.trim()).filter(Boolean),
    })),
    education: (candidate.education || []).map((e) => ({
      institution: e.school, degree: e.degree, field: e.field,
      start_date: e.startDate, end_date: e.endDate,
    })),
    optional_sections: (candidate.projects || []).length
      ? [{ title: "Projects", items: candidate.projects.map((p) => `${p.name} — ${p.techStack}: ${p.description}`) }]
      : [],
  };
}


// ---------- Small UI helpers ----------
function Field({ label, required, hint, children }) {
  return (
    <label className="fg-field">
      <span className="fg-field__label">{label} {required && <em className="fg-required">*</em>}</span>
      {children}
      {hint && <span className="fg-field__hint">{hint}</span>}
    </label>
  );
}

function EmptyHelp({ title, text }) {
  return (
    <div className="fg-empty-help">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function mergeCandidate(base, payload) {
  const c = { ...base, ...payload };
  if (payload.personal_info) c.personal_info = { ...base.personal_info, ...payload.personal_info };
  if (!Array.isArray(c.skills) && payload.skills) c.skills = payload.skills;
  if (!Array.isArray(c.skills)) c.skills = [];
  return c;
}
