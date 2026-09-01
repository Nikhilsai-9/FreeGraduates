import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FileUpload from "../components/FileUpload";
import JDInput from "../components/JDInput";
import Loader from "../components/Loader";
import Toast from "../components/Toast";
import { resumeApi } from "../api/api";
import "./Home.css";

// JD Matching Simulation Presets
const JD_PRESETS = {
  sde: {
    title: "Target JD: Software Engineer (Backend)",
    match: "88%",
    found: ["Java", "Spring Boot", "PostgreSQL", "REST APIs", "Git"],
    missing: ["Docker", "Kubernetes", "Redis Caching"]
  },
  ai: {
    title: "Target JD: Junior AI / ML Engineer",
    match: "92%",
    found: ["Python", "PyTorch", "NLP", "Pandas", "Scikit-Learn"],
    missing: ["MLflow", "Vector DBs", "FastAPI"]
  },
  frontend: {
    title: "Target JD: Frontend Developer (React)",
    match: "85%",
    found: ["JavaScript", "React", "HTML/CSS", "TypeScript", "Tailwind"],
    missing: ["Next.js", "Jest Testing", "GraphQL"]
  }
};

// AI Coach Predefined Responses
const COACH_RESPONSES = {
  introduce: {
    user: "I don't know how to introduce myself in a campus interview.",
    ai: "Let's build your elevator pitch using the **Present-Past-Future** formula: Start with your current degree and key technical focus, mention 1-2 impactful projects with measurable results, and conclude with why you're eager for this specific role."
  },
  star: {
    user: "How do I explain a difficult team conflict in STAR format?",
    ai: "Frame it positively:\n• **Situation:** Differing team opinions on API architecture.\n• **Task:** Deliver backend endpoints within sprint timeline.\n• **Action:** Built a benchmark comparison matrix to test latency.\n• **Result:** Unified team on standard and shipped 2 days early."
  },
  salary: {
    user: "How should a fresh graduate answer salary expectations?",
    ai: "Keep the focus on contribution & benchmarks:\n'I am primarily focused on finding the right engineering team where I can grow and deliver value. Based on industry standards for entry-level roles, I'm open to a competitive package aligned with company guidelines.'"
  }
};

// Templates List
const TEMPLATES_LIST = [
  {
    id: "student",
    category: "student",
    name: "Campus Standard",
    badge: "Most Popular",
    target: "Target: College Placements & Internships",
    templateKey: "campus"
  },
  {
    id: "swe",
    category: "swe",
    name: "SDE Minimalist",
    badge: "ATS 99%",
    target: "Target: Backend, Fullstack, DevOps",
    templateKey: "minimal"
  },
  {
    id: "ai",
    category: "ai",
    name: "Data & ML Specialist",
    badge: "Technical",
    target: "Target: AI/ML, Data Analyst, Research",
    templateKey: "modern"
  }
];

export default function Home() {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // ATS Scanner Real State
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("error");

  // Template Filter State
  const [activeFilter, setActiveFilter] = useState("all");

  // JD Preset State
  const [selectedJdPreset, setSelectedJdPreset] = useState("sde");

  // AI Coach Chat State
  const [coachChat, setCoachChat] = useState([
    {
      role: "user",
      text: "I don't know how to introduce myself in an interview."
    },
    {
      role: "ai",
      text: "Coach: Let's build your introduction step by step using the Present-Past-Future formula:\n\n1. Present: Your current status and primary focus.\n2. Past: 1-2 major projects where you delivered measurable results.\n3. Future: Why you are enthusiastic about this specific engineering role."
    }
  ]);
  const [coachInputText, setCoachInputText] = useState("");

  // ATS Simulation Dial State
  const [atsSimScore, setAtsSimScore] = useState(82);
  const [atsSimStatusText, setAtsSimStatusText] = useState("Run Sample Resume Check");
  const [isSimulating, setIsSimulating] = useState(false);

  // Handle Real ATS Form Submission
  const handleATSCheck = async (e) => {
    e.preventDefault();
    if (!file) {
      setToastType("error");
      setToastMessage("Please upload a resume file (PDF or DOCX) to analyze.");
      return;
    }

    try {
      setLoading(true);
      setToastMessage("");

      const formData = new FormData();
      formData.append("resume", file);
      if (jobDescription.trim()) {
        formData.append("jobDescription", jobDescription.trim());
      }

      const uploadRes = await resumeApi.fullAnalyze(formData);
      if (uploadRes && uploadRes.data && uploadRes.data.analysisId) {
        navigate(`/results/${uploadRes.data.analysisId}`);
      } else {
        throw new Error(uploadRes.message || "Failed to process analysis.");
      }
    } catch (err) {
      console.error("Analysis Error:", err);
      const errMsg = err.response?.data?.message || err.message || "An unexpected error occurred during resume analysis.";
      setToastType("error");
      setToastMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Handle Coach Chip Click
  const handleCoachChip = (topic) => {
    const item = COACH_RESPONSES[topic];
    if (item) {
      setCoachChat((prev) => [
        ...prev,
        { role: "user", text: item.user },
        { role: "ai", text: `Coach: ${item.ai}` }
      ]);
    }
  };

  // Handle Coach Custom Send
  const handleCoachSend = (e) => {
    e.preventDefault();
    if (!coachInputText.trim()) return;

    const userMsg = coachInputText.trim();
    setCoachInputText("");

    setCoachChat((prev) => [
      ...prev,
      { role: "user", text: userMsg },
      {
        role: "ai",
        text: `Coach: Great question! In tech interviews, keep your response concise, structured around tangible impact, and aligned with the company's tech stack.`
      }
    ]);
  };

  // Handle ATS Simulator Button
  const handleSimulateATS = () => {
    setIsSimulating(true);
    setAtsSimStatusText("Analyzing structure & keywords...");
    setTimeout(() => {
      setAtsSimScore(94);
      setAtsSimStatusText("✓ Sample Analysis Complete (Score: 94/100)");
      setIsSimulating(false);
    }, 700);
  };

  // Filter templates
  const filteredTemplates = TEMPLATES_LIST.filter(
    (t) => activeFilter === "all" || t.category === activeFilter
  );

  return (
    <div className="landing-page-root">
      <Loader active={loading} />
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage("")} />

      <main role="main">
        {/* ==========================================================
             2. HERO SECTION
             ========================================================== */}
        <section className="hero-section">
          <div className="container hero-content-grid">
            {/* Left Hero Copy */}
            <div className="hero-copy">
              <div className="hero-badge-pill">
                <span className="hero-badge-dot"></span>
                <span>YOUR FREE CAREER TOOLKIT &bull; 100% OPEN SOURCE</span>
              </div>

              <h1 className="hero-title">
                Prepare. Practice. <span className="highlight-blue">Get Hired.</span>
              </h1>

              <p className="hero-description">
                Everything you need to build a stronger resume, improve your ATS score, practice interviews, strengthen your communication, build your portfolio, and discover opportunities — all in one free platform.
              </p>

              <div className="hero-cta-group">
                <Link
                  to={currentUser ? "/builder/new" : "/signup"}
                  className="btn btn-primary btn-lg"
                  id="heroGetStartedBtn"
                >
                  Get Started Free
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <a href="#journey" className="btn btn-secondary btn-lg">
                  Explore FreeGraduates
                </a>
              </div>

              <div className="hero-trust-badges">
                <div className="trust-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>100% Free Forever</span>
                </div>
                <div className="trust-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>ATS-Friendly Verification</span>
                </div>
                <div className="trust-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>Community Open Source</span>
                </div>
              </div>
            </div>

            {/* Right Hero Product Visual Showcase */}
            <div className="hero-visual-card">
              <div className="visual-top-bar">
                <div className="visual-tabs">
                  <span className="visual-tab-dot dot-red"></span>
                  <span className="visual-tab-dot dot-yellow"></span>
                  <span className="visual-tab-dot dot-green"></span>
                </div>
                <div className="visual-app-title">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 3v18" />
                  </svg>
                  FreeGraduates Workspace
                </div>
                <span className="visual-badge">Live Preview</span>
              </div>

              <div className="hero-dashboard-preview">
                {/* Left Pane: Resume Snapshot */}
                <div className="preview-resume-pane">
                  <div className="mock-resume-header">
                    <div className="mock-applicant-name">Alex Morgan</div>
                    <div className="mock-applicant-title">Aspiring Software Engineer &bull; B.Tech CS</div>
                  </div>
                  <div className="mock-resume-row">
                    <div className="mock-row-title">Core Skills</div>
                    <div className="mock-tags">
                      <span className="mock-tag tag-match">Java</span>
                      <span className="mock-tag tag-match">Spring Boot</span>
                      <span className="mock-tag tag-match">PostgreSQL</span>
                      <span className="mock-tag">Docker</span>
                      <span className="mock-tag">Data Structures</span>
                    </div>
                  </div>
                  <div className="mock-resume-row">
                    <div className="mock-row-title">Featured Project</div>
                    <p style={{ fontSize: "11px", color: "var(--color-ink)", fontWeight: 600 }}>
                      Distributed Cache Engine
                    </p>
                    <p style={{ fontSize: "11px", color: "var(--color-pencil)" }}>
                      Reduced API query latency by 42% using LRU eviction.
                    </p>
                  </div>
                </div>

                {/* Right Pane: Live Insights */}
                <div className="preview-analytics-pane">
                  {/* Score Card */}
                  <div className="preview-score-card">
                    <div className="score-dial">
                      <div className="score-dial-inner">88</div>
                    </div>
                    <div>
                      <div className="score-info-title">ATS Ready Score</div>
                      <div className="score-info-desc">Top 10% keyword density</div>
                    </div>
                  </div>

                  {/* AI Coach Card */}
                  <div className="preview-ai-coach-card">
                    <div className="coach-card-header">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 16v-4M12 8h.01" />
                      </svg>
                      AI Coach Feedback
                    </div>
                    <p className="coach-snippet-text">
                      "Your project bullet is strong! Quantify the scale: mention how many requests per second it handled."
                    </p>
                  </div>

                  {/* Interview Status Card */}
                  <div className="preview-interview-card">
                    <div className="interview-card-label">Interview Readiness</div>
                    <div className="interview-card-status">84% Technical &bull; 91% Communication</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================================
             3. SOCIAL PROOF & STUDENT REACH BAR
             ========================================================== */}
        <section className="social-proof-bar">
          <div className="container social-proof-wrapper">
            <span className="social-proof-label">Designed for students & graduates aiming for</span>
            <div className="social-proof-logos">
              <span className="college-logo-item">Tech Giants</span>
              <span className="college-logo-item">High-Growth Startups</span>
              <span className="college-logo-item">Product Companies</span>
              <span className="college-logo-item">Open-Source Ecosystems</span>
              <span className="college-logo-item">Campus Placements</span>
            </div>
          </div>
        </section>

        {/* ==========================================================
             4. PRIMARY VALUE PROPOSITION (ONE PLATFORM)
             ========================================================== */}
        <section className="section section-mist" id="value-prop">
          <div className="container">
            <div className="section-header">
              <div className="eyebrow">All-In-One Ecosystem</div>
              <h2 className="section-title">One platform for your entire career journey.</h2>
              <p className="section-desc">
                Stop juggling six different paid tools. FreeGraduates unites the complete workflow from writing your first bullet point to cracking the final round.
              </p>
            </div>

            <div className="value-grid-6">
              {/* 1. BUILD */}
              <Link to="/builder/new" className="value-pillar-card">
                <div className="pillar-icon-box pillar-icon-blue">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" />
                    <line x1="16" y1="17" x2="8" y2="17" />
                  </svg>
                </div>
                <div className="pillar-step-num">01 &bull; Build</div>
                <h3 className="pillar-title">Resume Builder</h3>
                <p className="pillar-desc">
                  Create a clean, ATS-compliant resume with guided templates for students, fresh graduates, and career switchers.
                </p>
                <span className="pillar-tag">Explore Builder &rarr;</span>
              </Link>

              {/* 2. CHECK */}
              <a href="#ats" className="value-pillar-card">
                <div className="pillar-icon-box pillar-icon-mint">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                </div>
                <div className="pillar-step-num">02 &bull; Check</div>
                <h3 className="pillar-title">ATS Score & Match</h3>
                <p className="pillar-desc">
                  Audit your resume formatting, keyword density, section hierarchy, and match percentage against target job descriptions.
                </p>
                <span className="pillar-tag">Audit Resume &rarr;</span>
              </a>

              {/* 3. IMPROVE */}
              <a href="#coach" className="value-pillar-card">
                <div className="pillar-icon-box pillar-icon-iris">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </div>
                <div className="pillar-step-num">03 &bull; Improve</div>
                <h3 className="pillar-title">AI Career Coach</h3>
                <p className="pillar-desc">
                  Practice self-introductions, structure answers using the STAR method, and elevate your professional vocabulary.
                </p>
                <span className="pillar-tag">Meet Coach &rarr;</span>
              </a>

              {/* 4. PRACTICE */}
              <a href="#interview" className="value-pillar-card">
                <div className="pillar-icon-box pillar-icon-blush">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                </div>
                <div className="pillar-step-num">04 &bull; Practice</div>
                <h3 className="pillar-title">AI Mock Interview</h3>
                <p className="pillar-desc">
                  Simulate technical and behavioral rounds tailored to specific job roles with detailed scorecards and feedback.
                </p>
                <span className="pillar-tag">Start Mock &rarr;</span>
              </a>

              {/* 5. SHOWCASE */}
              <a href="#portfolio" className="value-pillar-card">
                <div className="pillar-icon-box pillar-icon-rose">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </div>
                <div className="pillar-step-num">05 &bull; Showcase</div>
                <h3 className="pillar-title">Portfolio Builder</h3>
                <p className="pillar-desc">
                  Turn your GitHub repositories and coursework into a sleek, professional web portfolio ready to share with recruiters.
                </p>
                <span className="pillar-tag">Create Site &rarr;</span>
              </a>

              {/* 6. DISCOVER */}
              <a href="#jobs" className="value-pillar-card">
                <div className="pillar-icon-box pillar-icon-dark">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </div>
                <div className="pillar-step-num">06 &bull; Discover</div>
                <h3 className="pillar-title">Jobs & Internships</h3>
                <p className="pillar-desc">
                  Browse curated entry-level opportunities, engineering roles, and internships with zero clutter or sponsored spam.
                </p>
                <span className="pillar-tag">Browse Roles &rarr;</span>
              </a>
            </div>
          </div>
        </section>

        {/* ==========================================================
             5. RESUME BUILDER SECTION
             ========================================================== */}
        <section className="section" id="resume">
          <div className="container feature-split-layout">
            {/* Left: Explanatory Copy */}
            <div className="feature-text-side">
              <div className="eyebrow">Professional Resume Builder</div>
              <h2 className="section-title">Build a resume you're proud of.</h2>
              <p className="section-desc">
                Start from a professional template, add your experience, skills and projects, and create a resume designed for the role you want — without needing prior design knowledge.
              </p>

              <ul className="feature-bullet-list">
                <li className="feature-bullet-item">
                  <div className="feature-bullet-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <strong>Beginner-Friendly Flow:</strong> Step-by-step guidance for education, projects, skills, and certifications.
                  </div>
                </li>
                <li className="feature-bullet-item">
                  <div className="feature-bullet-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <strong>Impact Bullet Suggestions:</strong> Turn basic task descriptions into quantified achievements.
                  </div>
                </li>
                <li className="feature-bullet-item">
                  <div className="feature-bullet-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <div>
                    <strong>1-Click Export:</strong> Download PDF versions formatted strictly for modern ATS parsers.
                  </div>
                </li>
              </ul>

              <Link to="/builder/new" className="btn btn-primary">
                Build My Resume
              </Link>
            </div>

            {/* Right: Resume Mockup UI Sheet */}
            <div className="feature-visual-side">
              <div className="ui-sheet-card">
                <div className="resume-mock-paper">
                  <div className="resume-header-row">
                    <div className="resume-name-block">
                      <h4>Rahul Sharma</h4>
                      <div className="resume-role-sub">Computer Science & Engineering &bull; Final Year</div>
                      <div style={{ fontSize: "11px", color: "var(--color-fog)", marginTop: "4px" }}>
                        rahul.sharma@example.edu &bull; github.com/rahul-dev &bull; linkedin.com/in/rahulsharma
                      </div>
                    </div>
                    <div className="resume-ats-stamp">ATS Score: 92/100</div>
                  </div>

                  <div className="resume-section-title">Education</div>
                  <div className="resume-item-row">
                    <span>B.Tech in Computer Science & Engineering</span>
                    <span style={{ fontSize: "12px", color: "var(--color-fog)" }}>2022 – 2026</span>
                  </div>
                  <div className="resume-item-desc">
                    CGPA: 8.8 / 10.0 &bull; Relevant Coursework: Data Structures, OS, Database Systems, Computer Networks.
                  </div>

                  <div className="resume-section-title">Technical Projects</div>
                  <div className="resume-item-row">
                    <span>Real-Time Collaborative Code Editor</span>
                    <span style={{ fontSize: "12px", color: "var(--color-fog)" }}>Node.js, WebSockets, React</span>
                  </div>
                  <div className="resume-item-desc">
                    &bull; Built operational transformation sync enabling 50+ concurrent users with &lt; 30ms latency.<br />
                    &bull; Integrated automated Dockerized code execution sandbox supporting Python and C++.
                  </div>

                  <div className="resume-section-title">Skills & Competencies</div>
                  <div style={{ fontSize: "12px", color: "var(--color-ink)", marginTop: "4px" }}>
                    <strong>Languages:</strong> C++, Java, JavaScript, Python, SQL<br />
                    <strong>Frameworks:</strong> React, Express, Spring Boot, TailwindCSS<br />
                    <strong>Tools:</strong> Git, Docker, Postman, Linux, GitHub Actions
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================================
             6. RESUME TEMPLATES GALLERY
             ========================================================== */}
        <section className="section section-mist" id="templates">
          <div className="container">
            <div className="section-header">
              <div className="eyebrow">Curated Templates</div>
              <h2 className="section-title">Start with a template. Make it yours.</h2>
              <p className="section-desc">
                Clean, single-column and dual-column layouts designed for maximum readability, zero parsing errors, and instant recruiter scanning.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="template-filters" role="tablist">
              {[
                { id: "all", label: "All Templates" },
                { id: "student", label: "Students & Fresh Grads" },
                { id: "swe", label: "Software Engineering" },
                { id: "ai", label: "AI / ML & Data" },
                { id: "business", label: "Business & Product" }
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`filter-pill ${activeFilter === tab.id ? "active" : ""}`}
                  onClick={() => setActiveFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Template Cards Grid */}
            <div className="templates-gallery-grid">
              {filteredTemplates.map((tmpl) => (
                <div key={tmpl.id} className="template-card">
                  <div className="template-preview-frame">
                    <span className="template-badge">{tmpl.badge}</span>
                    <div className="template-mini-wireframe">
                      <div className="wire-bar wire-bar-title"></div>
                      <div className="wire-bar wire-bar-blue"></div>
                      <div style={{ height: "1px", background: "var(--color-ash)", marginBlock: "4px" }}></div>
                      <div className="wire-bar wire-bar-full"></div>
                      <div className="wire-bar wire-bar-80"></div>
                      <div className="wire-bar wire-bar-60"></div>
                      <div style={{ height: "6px" }}></div>
                      <div className="wire-bar wire-bar-title" style={{ width: "35%" }}></div>
                      <div className="wire-bar wire-bar-full"></div>
                    </div>
                  </div>
                  <div className="template-footer-info">
                    <div>
                      <div className="template-name">{tmpl.name}</div>
                      <div className="template-role-tag">{tmpl.target}</div>
                    </div>
                    <Link
                      to={`/builder/new?template=${tmpl.templateKey}`}
                      className="btn btn-secondary btn-sm"
                    >
                      Use Template
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==========================================================
             7. RESUME + JOB DESCRIPTION MATCHING
             ========================================================== */}
        <section className="section" id="matching">
          <div className="container feature-split-layout reversed">
            {/* Right: Interactive Match Demo */}
            <div className="feature-visual-side">
              <div className="matching-interactive-card">
                {/* Preset Switchers */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
                  <button
                    className={`filter-pill jd-preset-btn ${selectedJdPreset === "sde" ? "active" : ""}`}
                    onClick={() => setSelectedJdPreset("sde")}
                  >
                    Backend Role
                  </button>
                  <button
                    className={`filter-pill jd-preset-btn ${selectedJdPreset === "ai" ? "active" : ""}`}
                    onClick={() => setSelectedJdPreset("ai")}
                  >
                    AI / ML Engineer
                  </button>
                  <button
                    className={`filter-pill jd-preset-btn ${selectedJdPreset === "frontend" ? "active" : ""}`}
                    onClick={() => setSelectedJdPreset("frontend")}
                  >
                    Frontend Role
                  </button>
                </div>

                <div className="matching-cols">
                  <div className="matching-box">
                    <div className="matching-box-header">
                      <span>Your Current Resume</span>
                      <span style={{ color: "var(--color-mint-text)", fontSize: "11px" }}>✓ Parsed</span>
                    </div>
                    <p className="matching-text-sample">
                      Skills: Java, Python, REST APIs, SQL, Git, React, Unit Testing.<br />
                      Experience: 1 internship + 3 open source projects.
                    </p>
                  </div>

                  <div className="matching-box">
                    <div className="matching-box-header">
                      <span>{JD_PRESETS[selectedJdPreset].title}</span>
                      <span style={{ color: "var(--color-signal-blue)", fontSize: "11px" }}>Analyzed</span>
                    </div>
                    <p className="matching-text-sample">
                      Requirements: Strong background in scalable backend APIs, containerization, and distributed database optimization.
                    </p>
                  </div>
                </div>

                <div className="matching-result-bar">
                  <div className="match-score-badge">
                    <span className="match-number">{JD_PRESETS[selectedJdPreset].match}</span>
                    <div>
                      <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-carbon)" }}>
                        Match Compatibility
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--color-pencil)" }}>
                        High probability for initial screening
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-fog)" }}>
                      KEYWORD ALIGNMENT:
                    </div>
                    <div className="match-keywords-list">
                      {JD_PRESETS[selectedJdPreset].found.map((kw) => (
                        <span key={kw} className="kw-pill kw-found">✓ {kw}</span>
                      ))}
                    </div>
                    <div className="match-keywords-list" style={{ marginTop: "4px" }}>
                      {JD_PRESETS[selectedJdPreset].missing.map((kw) => (
                        <span key={kw} className="kw-pill kw-missing">+ {kw}</span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Left: Copy */}
            <div className="feature-text-side">
              <div className="eyebrow">Intelligent Optimization</div>
              <h2 className="section-title">Make your resume match the opportunity.</h2>
              <p className="section-desc">
                Upload your resume alongside any job description. FreeGraduates instantly maps keyword overlap, identifies missing technical competencies, and suggests actionable phrasing adjustments.
              </p>

              <ul className="feature-bullet-list">
                <li className="feature-bullet-item">
                  <div className="feature-bullet-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div><strong>Missing Keyword Detection:</strong> Never miss essential tools or industry terminology mentioned in the JD.</div>
                </li>
                <li className="feature-bullet-item">
                  <div className="feature-bullet-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div><strong>Contextual Alignment:</strong> Pinpoints whether your project bullets reflect the seniority and scope requested.</div>
                </li>
                <li className="feature-bullet-item">
                  <div className="feature-bullet-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div><strong>Honest Insights:</strong> Designed to help you represent your genuine skills clearly, not fabricate buzzwords.</div>
                </li>
              </ul>

              <a href="#ats" className="btn btn-secondary">
                Analyze My Match
              </a>
            </div>
          </div>
        </section>

        {/* ==========================================================
             8. AI CAREER COACH SECTION
             ========================================================== */}
        <section className="section section-mist" id="coach">
          <div className="container feature-split-layout">
            {/* Left Copy */}
            <div className="feature-text-side">
              <div className="eyebrow">Communication & Guidance</div>
              <h2 className="section-title">Improve more than your resume. Meet your AI Career Coach.</h2>
              <p className="section-desc">
                Great careers require confident communication. Practice introducing yourself, structuring complex thoughts, speaking clearly in English, and mastering professional workplace interactions.
              </p>

              <ul className="feature-bullet-list">
                <li className="feature-bullet-item">
                  <div className="feature-bullet-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div><strong>Self-Introduction Mastery:</strong> Craft a concise 60-second elevator pitch that hooks interviewers.</div>
                </li>
                <li className="feature-bullet-item">
                  <div className="feature-bullet-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div><strong>STAR Framework Coaching:</strong> Break down behavioral questions into Situation, Task, Action, and Result.</div>
                </li>
                <li className="feature-bullet-item">
                  <div className="feature-bullet-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div><strong>Professional Vocabulary:</strong> Transform casual phrases into articulate, executive-ready language.</div>
                </li>
              </ul>

              <a href="#coach" className="btn btn-primary" onClick={() => handleCoachChip("introduce")}>
                Practice with AI
              </a>
            </div>

            {/* Right: AI Chat UI Simulation */}
            <div className="feature-visual-side">
              <div className="ai-coach-card-mock">
                <div className="coach-header-bar">
                  <div className="coach-avatar-group">
                    <div className="coach-avatar-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2a8 8 0 0 0-8 8c0 3.3 2 6.2 5 7.4V20a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2.6c3-1.2 5-4.1 5-7.4a8 8 0 0 0-8-8z" />
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-carbon)" }}>
                        FreeGraduates AI Coach
                      </div>
                      <div className="coach-status-online">&bull; Ready to practice</div>
                    </div>
                  </div>
                  <span className="visual-badge">Interactive</span>
                </div>

                <div className="coach-chat-stream">
                  {coachChat.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`chat-bubble ${msg.role === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}
                    >
                      {msg.text}
                    </div>
                  ))}

                  {/* Suggestion Chips */}
                  <div className="chat-suggestion-chips">
                    <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-fog)", width: "100%" }}>
                      TRY ASKING THE COACH:
                    </span>
                    <button className="chip-btn" onClick={() => handleCoachChip("introduce")}>
                      Self-Intro Template
                    </button>
                    <button className="chip-btn" onClick={() => handleCoachChip("star")}>
                      Explain Conflict (STAR)
                    </button>
                    <button className="chip-btn" onClick={() => handleCoachChip("salary")}>
                      Salary Question Tip
                    </button>
                  </div>
                </div>

                {/* Input Field */}
                <form className="coach-input-box" onSubmit={handleCoachSend}>
                  <input
                    type="text"
                    className="coach-input-field"
                    placeholder="Ask the coach anything about interviews..."
                    value={coachInputText}
                    onChange={(e) => setCoachInputText(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary btn-sm">
                    Send
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================================
             9. AI INTERVIEW PREPARATION SECTION
             ========================================================== */}
        <section className="section" id="interview">
          <div className="container">
            <div className="section-header">
              <div className="eyebrow">Realistic Simulations</div>
              <h2 className="section-title">Practice the interview before the real interview.</h2>
              <p className="section-desc">
                Simulate realistic technical and behavioral interview sessions configured specifically for your target role and experience level.
              </p>
            </div>

            {/* 5-Step Pipeline Flow */}
            <div className="interview-pipeline">
              <div className="pipe-step-card">
                <div className="pipe-step-num">1</div>
                <div className="pipe-step-title">Select Role</div>
                <div className="pipe-step-desc">Frontend, Backend, AI/ML, Data, or General CS.</div>
              </div>
              <div className="pipe-step-card">
                <div className="pipe-step-num">2</div>
                <div className="pipe-step-title">Add Context</div>
                <div className="pipe-step-desc">Paste target job description and your resume.</div>
              </div>
              <div className="pipe-step-card">
                <div className="pipe-step-num">3</div>
                <div className="pipe-step-title">AI Interview</div>
                <div className="pipe-step-desc">Dynamic follow-up questions based on your replies.</div>
              </div>
              <div className="pipe-step-card">
                <div className="pipe-step-num">4</div>
                <div className="pipe-step-title">Your Answers</div>
                <div className="pipe-step-desc">Voice or text responses with natural pacing.</div>
              </div>
              <div className="pipe-step-card">
                <div className="pipe-step-num">5</div>
                <div className="pipe-step-title">Full Scorecard</div>
                <div className="pipe-step-desc">Instant score breakdown and model answers.</div>
              </div>
            </div>

            {/* Example Scorecard Matrix */}
            <div className="interview-feedback-grid">
              <div className="feedback-meter-card">
                <div className="meter-header">
                  <span>Technical Accuracy</span>
                  <span className="highlight-blue">88%</span>
                </div>
                <div className="meter-track">
                  <div className="meter-fill fill-blue" style={{ width: "88%" }}></div>
                </div>
                <div className="meter-note">Accurate explanation of database indexing tradeoffs.</div>
              </div>

              <div className="feedback-meter-card">
                <div className="meter-header">
                  <span>Communication Clarity</span>
                  <span style={{ color: "var(--color-mint-text)" }}>92%</span>
                </div>
                <div className="meter-track">
                  <div className="meter-fill fill-green" style={{ width: "92%" }}></div>
                </div>
                <div className="meter-note">Clear progression from problem statement to solution.</div>
              </div>

              <div className="feedback-meter-card">
                <div className="meter-header">
                  <span>Answer Structure (STAR)</span>
                  <span style={{ color: "var(--color-iris)" }}>85%</span>
                </div>
                <div className="meter-track">
                  <div className="meter-fill fill-iris" style={{ width: "85%" }}></div>
                </div>
                <div className="meter-note">Quantified impact clearly in the Result step.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================================
             10. ATS CHECKER SECTION (SIMULATION + REAL LIVE SCANNER)
             ========================================================== */}
        <section className="section section-mist" id="ats">
          <div className="container">
            <div className="ats-breakdown-wrapper">
              {/* Left: Score Dial & Sim Button */}
              <div className="ats-score-hero-box">
                <div
                  className="ats-big-dial"
                  style={{
                    background: `conic-gradient(var(--color-signal-blue) 0% ${atsSimScore}%, var(--color-ash) ${atsSimScore}% 100%)`
                  }}
                >
                  <div className="ats-big-dial-inner">
                    <span className="ats-big-score">{atsSimScore}</span>
                    <span className="ats-big-max">/ 100</span>
                  </div>
                </div>
                <h3 style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-carbon)", marginBottom: "6px" }}>
                  ATS Readiness Grade
                </h3>
                <p style={{ fontSize: "13px", color: "var(--color-pencil)", marginBottom: "20px" }}>
                  Analyzed for font compatibility, section tags, table nesting, and standard headings.
                </p>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={handleSimulateATS}
                  disabled={isSimulating}
                >
                  {atsSimStatusText}
                </button>
              </div>

              {/* Right: Category List */}
              <div>
                <div className="eyebrow eyebrow-mint">Automated Screening Audit</div>
                <h2 className="section-title">Check your ATS score.</h2>
                <p className="section-desc" style={{ marginBottom: "24px" }}>
                  Upload your resume and understand how ready it is for automated applicant screening systems before applying.
                </p>

                <div className="ats-category-list">
                  <div className="ats-cat-row">
                    <div>
                      <div className="ats-cat-title">Layout & Structure Formatting</div>
                      <div style={{ fontSize: "12px", color: "var(--color-pencil)" }}>
                        Standard headings used; no unreadable graphics or columns.
                      </div>
                    </div>
                    <span className="ats-cat-status status-pass">Pass (100%)</span>
                  </div>

                  <div className="ats-cat-row">
                    <div>
                      <div className="ats-cat-title">Essential Contact Details</div>
                      <div style={{ fontSize: "12px", color: "var(--color-pencil)" }}>
                        Email, GitHub, LinkedIn, and location properly placed.
                      </div>
                    </div>
                    <span className="ats-cat-status status-pass">Pass (100%)</span>
                  </div>

                  <div className="ats-cat-row">
                    <div>
                      <div className="ats-cat-title">Role-Specific Keyword Density</div>
                      <div style={{ fontSize: "12px", color: "var(--color-pencil)" }}>
                        Add 2 more technical tooling keywords to optimize match.
                      </div>
                    </div>
                    <span className="ats-cat-status status-warning">Needs 2 Keywords</span>
                  </div>

                  <div className="ats-cat-row">
                    <div>
                      <div className="ats-cat-title">Typography & Bullet Readability</div>
                      <div style={{ fontSize: "12px", color: "var(--color-pencil)" }}>
                        Clean font hierarchy and bullet structure verified.
                      </div>
                    </div>
                    <span className="ats-cat-status status-pass">Pass (100%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Real ATS Upload Scanner Form */}
            <div className="ats-real-upload-card" id="ats-scanner">
              <h3 className="ats-upload-title">Scan Your Actual Resume Now</h3>
              <p className="ats-upload-sub">
                Upload your file (PDF or DOCX) and paste an optional job description to get a full sub-second ATS audit report.
              </p>
              <form onSubmit={handleATSCheck}>
                <FileUpload
                  file={file}
                  onFileSelect={(selectedFile) => setFile(selectedFile)}
                  onFileRemove={() => setFile(null)}
                />

                <JDInput
                  value={jobDescription}
                  onChange={(text) => setJobDescription(text)}
                />

                <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={!file || loading}
                    style={{ minWidth: "260px" }}
                  >
                    {loading ? "Analyzing Resume..." : "Run Free ATS Audit &rarr;"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </section>

        {/* ==========================================================
             11. PORTFOLIO BUILDER SECTION
             ========================================================== */}
        <section className="section" id="portfolio">
          <div className="container feature-split-layout">
            {/* Left Copy */}
            <div className="feature-text-side">
              <div className="eyebrow">Showcase Your Work</div>
              <h2 className="section-title">Turn your work into your portfolio.</h2>
              <p className="section-desc">
                Students and fresh graduates often build fantastic projects during coursework or hackathons but don't know how to present them. FreeGraduates turns your repositories into an impressive, shareable personal website.
              </p>

              <ul className="feature-bullet-list">
                <li className="feature-bullet-item">
                  <div className="feature-bullet-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div><strong>One-Click Project Import:</strong> Connect your GitHub profile to showcase live demos, stars, and codebases.</div>
                </li>
                <li className="feature-bullet-item">
                  <div className="feature-bullet-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div><strong>Custom Subdomain:</strong> Get a fast, hosted link `freegraduates.com/p/yourname` or bring your own domain.</div>
                </li>
                <li className="feature-bullet-item">
                  <div className="feature-bullet-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <div><strong>Mobile Responsive Out of the Box:</strong> Perfectly formatted for recruiter viewing on phones or desktops.</div>
                </li>
              </ul>

              <Link to="/builder/new" className="btn btn-primary">
                Build My Portfolio
              </Link>
            </div>

            {/* Right: Portfolio Browser Mockup */}
            <div className="feature-visual-side">
              <div className="portfolio-mock-browser">
                <div className="browser-nav-bar">
                  <div className="visual-tabs">
                    <span className="visual-tab-dot dot-red"></span>
                    <span className="visual-tab-dot dot-yellow"></span>
                    <span className="visual-tab-dot dot-green"></span>
                  </div>
                  <div className="browser-url-pill">freegraduates.com/p/ananya-sharma</div>
                </div>

                <div className="portfolio-body-mock">
                  <div className="portfolio-hero-mock">
                    <div className="port-avatar">AS</div>
                    <div>
                      <div className="port-name">Ananya Sharma</div>
                      <div className="port-role">Fullstack Developer &bull; Open Source Contributor</div>
                      <div style={{ fontSize: "11px", color: "var(--color-fog)", marginTop: "2px" }}>
                        Bengaluru, India &bull; Available for 2026 Roles
                      </div>
                    </div>
                  </div>

                  <div className="port-projects-grid">
                    <div className="port-project-card">
                      <div className="port-proj-title">DevPulse API Gateway</div>
                      <p className="port-proj-desc">High-throughput microservices gateway built with Go and Redis.</p>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-signal-blue)" }}>
                        View Code &bull; Live Demo
                      </div>
                    </div>

                    <div className="port-project-card">
                      <div className="port-proj-title">NeuralSearch Engine</div>
                      <p className="port-proj-desc">Semantic document search engine using FastAPI and vector embeddings.</p>
                      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-signal-blue)" }}>
                        View Code &bull; Live Demo
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================================
             12. JOBS & INTERNSHIPS DISCOVERY PREVIEW
             ========================================================== */}
        <section className="section section-mist" id="jobs">
          <div className="container">
            <div className="section-header">
              <div className="eyebrow">Opportunity Hub</div>
              <h2 className="section-title">Find opportunities that move you forward.</h2>
              <p className="section-desc">
                Discover verified entry-level roles, graduate engineering programs, and high-impact internships matched directly with your skills.
              </p>
            </div>

            <div className="jobs-preview-grid">
              {/* Job 1 */}
              <div className="job-card">
                <div>
                  <div className="job-card-top">
                    <div>
                      <div className="job-role-title">Associate Software Engineer</div>
                      <div className="job-company">CloudScale Technologies</div>
                    </div>
                    <span className="job-type-pill">Full-Time</span>
                  </div>
                  <div className="job-tags-row">
                    <span className="mock-tag">Java</span>
                    <span className="mock-tag">Spring Boot</span>
                    <span className="mock-tag">PostgreSQL</span>
                  </div>
                </div>
                <div className="job-meta-row">
                  <span>📍 Bengaluru / Hybrid</span>
                  <span>Fresh Graduates 2026</span>
                </div>
              </div>

              {/* Job 2 */}
              <div className="job-card">
                <div>
                  <div className="job-card-top">
                    <div>
                      <div className="job-role-title">Junior AI/ML Engineer</div>
                      <div className="job-company">Nexus Intelligence</div>
                    </div>
                    <span className="job-type-pill">Full-Time</span>
                  </div>
                  <div className="job-tags-row">
                    <span className="mock-tag">Python</span>
                    <span className="mock-tag">PyTorch</span>
                    <span className="mock-tag">FastAPI</span>
                  </div>
                </div>
                <div className="job-meta-row">
                  <span>📍 Remote</span>
                  <span>0-1 yrs exp</span>
                </div>
              </div>

              {/* Job 3 */}
              <div className="job-card">
                <div>
                  <div className="job-card-top">
                    <div>
                      <div className="job-role-title">Frontend Engineering Intern</div>
                      <div className="job-company">Starlight Studio</div>
                    </div>
                    <span className="job-type-pill">Internship</span>
                  </div>
                  <div className="job-tags-row">
                    <span className="mock-tag">React</span>
                    <span className="mock-tag">TypeScript</span>
                    <span className="mock-tag">Tailwind</span>
                  </div>
                </div>
                <div className="job-meta-row">
                  <span>📍 Hyderabad / On-site</span>
                  <span>Final Year Students</span>
                </div>
              </div>
            </div>

            <p className="job-preview-disclaimer">
              * Job discovery preview. The community-powered aggregator will launch soon with direct verification.
            </p>
          </div>
        </section>

        {/* ==========================================================
             13. AUDIENCE FIT: BUILT FOR EVERY STAGE
             ========================================================== */}
        <section className="section" id="audience">
          <div className="container">
            <div className="section-header">
              <div className="eyebrow">Who We Serve</div>
              <h2 className="section-title">Built for every stage of your career journey.</h2>
              <p className="section-desc">
                Whether you are preparing for your very first campus drive or accelerating into your next professional chapter, FreeGraduates meets you where you are.
              </p>
            </div>

            <div className="audience-grid-4">
              <div className="audience-card">
                <div className="aud-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                    <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                  </svg>
                </div>
                <h3 className="aud-title">Students</h3>
                <p className="aud-desc">Create your first resume, organize academic projects, and prepare for campus placement season.</p>
              </div>

              <div className="audience-card">
                <div className="aud-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                </div>
                <h3 className="aud-title">Fresh Graduates</h3>
                <p className="aud-desc">Refine entry-level job applications, target key skills, and build confidence through AI interview practice.</p>
              </div>

              <div className="audience-card">
                <div className="aud-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </div>
                <h3 className="aud-title">Job Seekers</h3>
                <p className="aud-desc">Optimize your resume against actual job descriptions, diagnose ATS bottlenecks, and discover active roles.</p>
              </div>

              <div className="audience-card">
                <div className="aud-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </div>
                <h3 className="aud-title">Professionals</h3>
                <p className="aud-desc">Elevate your executive communication, sharpen behavioral interview techniques, and level up your career.</p>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================================
             14. PLACEMENT PREPARATION SECTION
             ========================================================== */}
        <section className="section section-mist" id="placements">
          <div className="container">
            <div className="placement-prep-box">
              <div className="section-header-left">
                <div className="eyebrow eyebrow-mint">Campus & Engineering Drives</div>
                <h2 className="section-title">Prepare for placements with confidence.</h2>
                <p className="section-desc">
                  Campus placement drives require systematic preparation across aptitude, technical coding, and HR rounds. FreeGraduates provides a structured checklist for engineering and university candidates.
                </p>
              </div>

              <div className="placement-checklist-grid">
                <div className="place-check-item">
                  <div className="check-badge">✓</div>
                  <div className="place-check-content">
                    <h4>ATS-Clean Resume</h4>
                    <p>Pass initial university shortlisting without formatting penalties.</p>
                  </div>
                </div>

                <div className="place-check-item">
                  <div className="check-badge">✓</div>
                  <div className="place-check-content">
                    <h4>Technical Deep-Dives</h4>
                    <p>Prepare project explanations, database indexing, and core CS fundamentals.</p>
                  </div>
                </div>

                <div className="place-check-item">
                  <div className="check-badge">✓</div>
                  <div className="place-check-content">
                    <h4>HR & Behavioral Rounds</h4>
                    <p>Practice situational answers with structured STAR frameworks.</p>
                  </div>
                </div>

                <div className="place-check-item">
                  <div className="check-badge">✓</div>
                  <div className="place-check-content">
                    <h4>Live Project Portfolios</h4>
                    <p>Showcase real code, live deployment links, and GitHub contributions.</p>
                  </div>
                </div>

                <div className="place-check-item">
                  <div className="check-badge">✓</div>
                  <div className="place-check-content">
                    <h4>Communication Polish</h4>
                    <p>Overcome hesitation and articulate your thoughts clearly in English.</p>
                  </div>
                </div>

                <div className="place-check-item">
                  <div className="check-badge">✓</div>
                  <div className="place-check-content">
                    <h4>Job & Internship Alignment</h4>
                    <p>Tailor your applications to on-campus and off-campus opportunities.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================================
             15. FREE + OPEN SOURCE CORE VALUES
             ========================================================== */}
        <section className="section" id="opensource">
          <div className="container">
            <div className="open-source-banner">
              <div className="eyebrow">Open Source Philosophy</div>
              <h2 className="section-title">Career preparation should be accessible to everyone.</h2>
              <p className="section-desc" style={{ maxWidth: "720px", marginInline: "auto" }}>
                FreeGraduates is built as a free and open-source platform to make practical career tools accessible to students, graduates, and job seekers worldwide — with zero paywalls on essential preparation.
              </p>

              <div className="os-pillars">
                <div className="os-pillar-item">
                  <div className="os-pillar-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    100% Free Core
                  </div>
                  <p className="os-pillar-desc">
                    Essential resume generation, ATS checking, and career guidance shouldn't be locked behind a subscription fee.
                  </p>
                </div>

                <div className="os-pillar-item">
                  <div className="os-pillar-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
                    </svg>
                    Open Source Code
                  </div>
                  <p className="os-pillar-desc">
                    Built transparently in the open. Contributions, feedback, and community template contributions are warmly welcomed.
                  </p>
                </div>

                <div className="os-pillar-item">
                  <div className="os-pillar-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                    </svg>
                    Community Powered
                  </div>
                  <p className="os-pillar-desc">
                    Designed with students, educators, and hiring engineers to solve real hiring challenges fairly.
                  </p>
                </div>
              </div>

              <a
                href="https://github.com/freegraduates"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
              >
                <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Explore FreeGraduates on GitHub
              </a>
            </div>
          </div>
        </section>

        {/* ==========================================================
             16. CAREER JOURNEY TIMELINE
             ========================================================== */}
        <section className="section section-mist" id="journey">
          <div className="container">
            <div className="section-header">
              <div className="eyebrow">Your Step-by-Step Pathway</div>
              <h2 className="section-title">The Complete Career Journey</h2>
              <p className="section-desc">
                A clear, structured 7-step path to move from initial preparation to receiving your offer letter.
              </p>
            </div>

            <div className="journey-timeline-wrapper">
              <div className="journey-step-node">
                <span className="step-num-pill">01 &bull; BUILD</span>
                <div className="step-node-title">Create Resume</div>
                <div className="step-node-desc">Draft clean sections with guided templates.</div>
              </div>

              <div className="journey-step-node">
                <span className="step-num-pill">02 &bull; CHECK</span>
                <div className="step-node-title">ATS Audit</div>
                <div className="step-node-desc">Verify readability & formatting compliance.</div>
              </div>

              <div className="journey-step-node">
                <span className="step-num-pill">03 &bull; IMPROVE</span>
                <div className="step-node-title">Match JD</div>
                <div className="step-node-desc">Align keywords to specific role requirements.</div>
              </div>

              <div className="journey-step-node">
                <span className="step-num-pill">04 &bull; PRACTICE</span>
                <div className="step-node-title">AI Coaching</div>
                <div className="step-node-desc">Strengthen vocabulary & elevator pitches.</div>
              </div>

              <div className="journey-step-node">
                <span className="step-num-pill">05 &bull; INTERVIEW</span>
                <div className="step-node-title">Mock Rounds</div>
                <div className="step-node-desc">Simulate realistic tech and HR scenarios.</div>
              </div>

              <div className="journey-step-node">
                <span className="step-num-pill">06 &bull; SHOWCASE</span>
                <div className="step-node-title">Build Portfolio</div>
                <div className="step-node-desc">Publish your projects on a custom site.</div>
              </div>

              <div className="journey-step-node">
                <span className="step-num-pill">07 &bull; DISCOVER</span>
                <div className="step-node-title">Land Offers</div>
                <div className="step-node-desc">Apply confidently to vetted opportunities.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ==========================================================
             17. FINAL CALL TO ACTION
             ========================================================== */}
        <section className="final-cta-section">
          <div className="container">
            <div className="final-cta-box">
              <h2 className="final-cta-title">Your next opportunity starts with preparation.</h2>
              <p className="final-cta-desc">
                Build better. Practice smarter. Apply with confidence.
              </p>
              <div className="final-btn-group">
                <Link
                  to={currentUser ? "/builder/new" : "/signup"}
                  className="btn btn-primary btn-lg"
                >
                  Get Started Free
                  <svg className="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </Link>
                <a href="#journey" className="btn btn-secondary btn-lg">
                  Explore FreeGraduates
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ==========================================================
           18. FOOTER
           ========================================================== */}
      <footer className="site-footer" role="contentinfo">
        <div className="container">
          <div className="footer-top-grid">
            {/* Brand Info */}
            <div className="footer-brand-col">
              <Link to="/" className="brand-logo-group">
                <div className="brand-logo-mark">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 20V4h14" />
                    <path d="M5 12h10" />
                    <path d="M12 4l7 7" />
                  </svg>
                </div>
                <span className="brand-logo-name">Free<span>Graduates</span></span>
              </Link>
              <p className="footer-tagline">
                Prepare. Practice. Get Hired.<br />
                The 100% free and open-source career platform for students, graduates, and job seekers.
              </p>
            </div>

            {/* Product Navigation */}
            <div>
              <div className="footer-col-title">Product</div>
              <ul className="footer-link-list">
                <li><Link to="/builder/new">Resume Builder</Link></li>
                <li><a href="#templates">Resume Templates</a></li>
                <li><a href="#matching">JD Matching</a></li>
                <li><a href="#ats">ATS Checker</a></li>
                <li><a href="#coach">AI Career Coach</a></li>
                <li><a href="#interview">AI Interview</a></li>
                <li><a href="#portfolio">Portfolio Builder</a></li>
                <li><a href="#jobs">Job Discovery</a></li>
              </ul>
            </div>

            {/* Community & Open Source */}
            <div>
              <div className="footer-col-title">Community</div>
              <ul className="footer-link-list">
                <li><a href="https://github.com/freegraduates" target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
                <li><a href="#opensource">Open Source Mission</a></li>
                <li><a href="#audience">Campus Ambassadors</a></li>
                <li><a href="#placements">Placement Cell Resources</a></li>
                <li><Link to="/dashboard">User Dashboard</Link></li>
              </ul>
            </div>

            {/* Legal & Contact */}
            <div>
              <div className="footer-col-title">Platform</div>
              <ul className="footer-link-list">
                <li><Link to="/login">Sign In</Link></li>
                <li><Link to="/signup">Create Account</Link></li>
                <li><a href="#opensource">Open Source License (MIT)</a></li>
                <li><a href="https://freegraduates.com">freegraduates.com</a></li>
              </ul>
            </div>
          </div>

          {/* Bottom Row */}
          <div className="footer-bottom-bar">
            <div>&copy; {new Date().getFullYear()} FreeGraduates (freegraduates.com). Released under the open-source MIT License.</div>
            <div style={{ display: "flex", gap: "20px" }}>
              <a href="https://freegraduates.com" style={{ color: "var(--color-fog)" }}>freegraduates.com</a>
              <a href="#opensource" style={{ color: "var(--color-fog)" }}>Open Source</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
