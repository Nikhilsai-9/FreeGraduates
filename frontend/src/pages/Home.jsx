import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FileUpload from "../components/FileUpload";
import JDInput from "../components/JDInput";
import Loader from "../components/Loader";
import Toast from "../components/Toast";
import { resumeApi } from "../api/api";
import "./Home.css";

const PRESET_MATCHES = {
  sde: {
    title: "Target JD: Software Engineer (Backend)",
    score: 88,
    found: ["✓ Java", "✓ Spring Boot", "✓ PostgreSQL", "✓ REST APIs"],
    missing: ["+ Docker", "+ Redis Caching"]
  },
  ai: {
    title: "Target JD: AI / ML Engineer",
    score: 82,
    found: ["✓ Python", "✓ PyTorch", "✓ Data Structures", "✓ SQL"],
    missing: ["+ MLOps", "+ Model Quantization"]
  },
  frontend: {
    title: "Target JD: Frontend Developer",
    score: 91,
    found: ["✓ React", "✓ JavaScript", "✓ HTML/CSS", "✓ REST APIs"],
    missing: ["+ TypeScript", "+ Next.js"]
  }
};

const COACH_TOPICS = {
  introduce: "Coach: Use the Present-Past-Future formula! 1) Present degree & focus, 2) 1-2 major technical project outcomes, 3) Why this specific engineering role excites you.",
  star: "Coach: Use STAR: Situation (context), Task (goal), Action (what YOU coded/built), Result (quantified metrics, e.g. 42% latency reduction).",
  salary: "Coach: When asked about salary: 'My priority is finding the right engineering team. Based on market data for junior roles in this region, I am looking for a fair benchmark of ₹X - ₹Y.'"
};

export default function Home() {
  // ATS Audit Upload Form State
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Interactive Demos State
  const [templateFilter, setTemplateFilter] = useState("all");
  const [jdPreset, setJdPreset] = useState("sde");
  const [chatMessages, setChatMessages] = useState([
    { sender: "user", text: "I don't know how to introduce myself in an interview." },
    {
      sender: "ai",
      text: "Coach: Let's build your introduction step by step using the Present-Past-Future formula: 1) Present status & degree, 2) 1-2 major project results, 3) Why this specific engineering role."
    }
  ]);

  const navigate = useNavigate();

  const handleATSCheck = async (e) => {
    e.preventDefault();
    if (!file) {
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
      const errMsg = err.response?.data?.message || err.message || "An unexpected error occurred.";
      setToastMessage(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleCoachClick = (topicKey) => {
    const text = COACH_TOPICS[topicKey];
    if (text) {
      setChatMessages((prev) => [
        ...prev,
        { sender: "user", text: `Tell me about ${topicKey}` },
        { sender: "ai", text }
      ]);
    }
  };

  const activePreset = PRESET_MATCHES[jdPreset] || PRESET_MATCHES.sde;

  return (
    <div className="landing-page-container">
      <Loader active={loading} />
      <Toast message={toastMessage} type="error" onClose={() => setToastMessage("")} />

      {/* ==========================================================
           1. HERO SECTION
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
              <Link to="/signup" className="btn btn-primary btn-lg">
                Get Started Free &rarr;
              </Link>
              <a href="#journey" className="btn btn-secondary btn-lg">
                Explore FreeGraduates
              </a>
            </div>

            <div className="hero-trust-badges">
              <div className="trust-item">
                <span>✓ 100% Free Forever</span>
              </div>
              <div className="trust-item">
                <span>✓ ATS-Friendly Verification</span>
              </div>
              <div className="trust-item">
                <span>✓ Community Open Source</span>
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
              <div className="visual-app-title">FreeGraduates Workspace</div>
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
                  <p style={{ fontSize: "11px", color: "var(--text)", fontWeight: "600" }}>Distributed Cache Engine</p>
                  <p style={{ fontSize: "11px", color: "var(--muted)" }}>Reduced API query latency by 42% using LRU eviction.</p>
                </div>
              </div>

              {/* Right Pane: Live Insights */}
              <div className="preview-analytics-pane">
                <div className="preview-score-card">
                  <div className="score-dial">
                    <div className="score-dial-inner">88</div>
                  </div>
                  <div>
                    <div className="score-info-title">ATS Ready Score</div>
                    <div className="score-info-desc">Top 10% keyword density</div>
                  </div>
                </div>

                <div className="preview-ai-coach-card">
                  <div className="coach-card-header">💡 AI Coach Feedback</div>
                  <p className="coach-snippet-text">
                    "Your project bullet is strong! Quantify the scale: mention requests per second handled."
                  </p>
                </div>

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
           2. SOCIAL PROOF & STUDENT REACH BAR
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
           3. PRIMARY VALUE PROPOSITION (6 PILLARS)
           ========================================================== */}
      <section className="section section-mist" id="value-prop">
        <div className="container">
          <div className="section-header text-center">
            <span className="eyebrow">ALL-IN-ONE ECOSYSTEM</span>
            <h2 className="section-title">One platform for your entire career journey.</h2>
            <p className="section-desc">
              Stop juggling six different paid tools. FreeGraduates unites the complete workflow from writing your first bullet point to cracking the final round.
            </p>
          </div>

          <div className="value-grid-6">
            <div className="value-pillar-card">
              <div className="pillar-step-num">01 &bull; BUILD</div>
              <h3 className="pillar-title">Resume Builder</h3>
              <p className="pillar-desc">
                Create a clean, ATS-compliant resume with guided templates for students, fresh graduates, and career switchers.
              </p>
              <Link to="/builder/new" className="pillar-tag">Explore Builder &rarr;</Link>
            </div>

            <div className="value-pillar-card">
              <div className="pillar-step-num">02 &bull; CHECK</div>
              <h3 className="pillar-title">ATS Score & Match</h3>
              <p className="pillar-desc">
                Audit your resume formatting, keyword density, section hierarchy, and match percentage against target job descriptions.
              </p>
              <a href="#ats-scanner" className="pillar-tag">Audit Resume &rarr;</a>
            </div>

            <div className="value-pillar-card">
              <div className="pillar-step-num">03 &bull; IMPROVE</div>
              <h3 className="pillar-title">AI Career Coach</h3>
              <p className="pillar-desc">
                Practice self-introductions, structure answers using the STAR method, and elevate your professional vocabulary.
              </p>
              <a href="#coach" className="pillar-tag">Meet Coach &rarr;</a>
            </div>

            <div className="value-pillar-card">
              <div className="pillar-step-num">04 &bull; PRACTICE</div>
              <h3 className="pillar-title">AI Mock Interview</h3>
              <p className="pillar-desc">
                Simulate technical and behavioral rounds tailored to specific job roles with detailed scorecards and feedback.
              </p>
              <a href="#interview" className="pillar-tag">Start Mock &rarr;</a>
            </div>

            <div className="value-pillar-card">
              <div className="pillar-step-num">05 &bull; SHOWCASE</div>
              <h3 className="pillar-title">Portfolio Builder</h3>
              <p className="pillar-desc">
                Turn your GitHub repositories and coursework into a sleek, professional web portfolio ready to share with recruiters.
              </p>
              <a href="#portfolio" className="pillar-tag">Create Site &rarr;</a>
            </div>

            <div className="value-pillar-card">
              <div className="pillar-step-num">06 &bull; DISCOVER</div>
              <h3 className="pillar-title">Jobs & Internships</h3>
              <p className="pillar-desc">
                Browse curated entry-level opportunities, engineering roles, and internships with zero clutter or sponsored spam.
              </p>
              <a href="#jobs" className="pillar-tag">Browse Roles &rarr;</a>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
           4. RESUME BUILDER SECTION
           ========================================================== */}
      <section className="section" id="resume">
        <div className="container feature-split-layout">
          <div className="feature-text-side">
            <span className="eyebrow">PROFESSIONAL RESUME BUILDER</span>
            <h2 className="section-title">Build a resume you're proud of.</h2>
            <p className="section-desc">
              Start from a professional template, add your experience, skills and projects, and create a resume designed for the role you want — without needing prior design knowledge.
            </p>

            <ul className="feature-bullet-list">
              <li className="feature-bullet-item">
                <div><strong>Beginner-Friendly Flow:</strong> Step-by-step guidance for education, projects, skills, and certifications.</div>
              </li>
              <li className="feature-bullet-item">
                <div><strong>Impact Bullet Suggestions:</strong> Turn basic task descriptions into quantified achievements.</div>
              </li>
              <li className="feature-bullet-item">
                <div><strong>1-Click Export:</strong> Download PDF and Word versions formatted strictly for modern ATS parsers.</div>
              </li>
            </ul>

            <Link to="/builder/new" className="btn btn-primary">Build My Resume &rarr;</Link>
          </div>

          <div className="feature-visual-side">
            <div className="ui-sheet-card">
              <div className="resume-mock-paper">
                <div className="resume-header-row">
                  <div className="resume-name-block">
                    <h4>Rahul Sharma</h4>
                    <div className="resume-role-sub">Computer Science & Engineering &bull; Final Year</div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "4px" }}>
                      rahul.sharma@example.edu &bull; github.com/rahul-dev &bull; linkedin.com/in/rahulsharma
                    </div>
                  </div>
                  <div className="resume-ats-stamp">ATS Score: 92/100</div>
                </div>

                <div className="resume-section-title">Education</div>
                <div className="resume-item-row">
                  <span>B.Tech in Computer Science & Engineering</span>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>2022 – 2026</span>
                </div>
                <div className="resume-item-desc">CGPA: 8.8 / 10.0 &bull; Relevant Coursework: Data Structures, OS, Database Systems, Computer Networks.</div>

                <div className="resume-section-title">Technical Projects</div>
                <div className="resume-item-row">
                  <span>Real-Time Collaborative Code Editor</span>
                  <span style={{ fontSize: "12px", color: "var(--muted)" }}>Node.js, WebSockets, React</span>
                </div>
                <div className="resume-item-desc">
                  &bull; Built operational transformation sync enabling 50+ concurrent users with sub-30ms latency.<br />
                  &bull; Integrated automated Dockerized code execution sandbox supporting Python and C++.
                </div>

                <div className="resume-section-title">Skills & Competencies</div>
                <div style={{ fontSize: "12px", color: "var(--text)", marginTop: "4px" }}>
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
           5. RESUME TEMPLATES GALLERY
           ========================================================== */}
      <section className="section section-mist" id="templates">
        <div className="container">
          <div className="section-header text-center">
            <span className="eyebrow">CURATED TEMPLATES</span>
            <h2 className="section-title">Start with a template. Make it yours.</h2>
            <p className="section-desc">
              Clean, single-column and dual-column layouts designed for maximum readability, zero parsing errors, and instant recruiter scanning.
            </p>
          </div>

          <div className="template-filters">
            <button className={`filter-pill ${templateFilter === "all" ? "active" : ""}`} onClick={() => setTemplateFilter("all")}>All Templates</button>
            <button className={`filter-pill ${templateFilter === "student" ? "active" : ""}`} onClick={() => setTemplateFilter("student")}>Students & Fresh Grads</button>
            <button className={`filter-pill ${templateFilter === "swe" ? "active" : ""}`} onClick={() => setTemplateFilter("swe")}>Software Engineering</button>
            <button className={`filter-pill ${templateFilter === "ai" ? "active" : ""}`} onClick={() => setTemplateFilter("ai")}>AI / ML & Data</button>
          </div>

          <div className="templates-gallery-grid">
            <div className="template-card">
              <div className="template-preview-frame">
                <span className="template-badge">Most Popular</span>
                <div className="template-mini-wireframe">
                  <div className="wire-bar wire-bar-title"></div>
                  <div className="wire-bar wire-bar-blue"></div>
                  <div className="wire-bar wire-bar-full"></div>
                  <div className="wire-bar wire-bar-80"></div>
                </div>
              </div>
              <div className="template-footer-info">
                <div>
                  <div className="template-name">Campus Standard</div>
                  <div className="template-role-tag">Target: College Placements & Internships</div>
                </div>
                <Link to="/builder/new" className="btn btn-secondary btn-sm">Use Template</Link>
              </div>
            </div>

            <div className="template-card">
              <div className="template-preview-frame">
                <span className="template-badge">ATS 99%</span>
                <div className="template-mini-wireframe">
                  <div className="wire-bar wire-bar-title"></div>
                  <div className="wire-bar wire-bar-blue" style={{ width: "50%" }}></div>
                  <div className="wire-bar wire-bar-full"></div>
                  <div className="wire-bar wire-bar-80"></div>
                </div>
              </div>
              <div className="template-footer-info">
                <div>
                  <div className="template-name">SDE Minimalist</div>
                  <div className="template-role-tag">Target: Backend, Fullstack, DevOps</div>
                </div>
                <Link to="/builder/new" className="btn btn-secondary btn-sm">Use Template</Link>
              </div>
            </div>

            <div className="template-card">
              <div className="template-preview-frame">
                <span className="template-badge">Technical</span>
                <div className="template-mini-wireframe">
                  <div className="wire-bar wire-bar-title"></div>
                  <div className="wire-bar wire-bar-blue" style={{ width: "40%" }}></div>
                  <div className="wire-bar wire-bar-full"></div>
                </div>
              </div>
              <div className="template-footer-info">
                <div>
                  <div className="template-name">Data & ML Specialist</div>
                  <div className="template-role-tag">Target: AI/ML, Data Analyst</div>
                </div>
                <Link to="/builder/new" className="btn btn-secondary btn-sm">Use Template</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
           6. RESUME + JOB DESCRIPTION MATCHING
           ========================================================== */}
      <section className="section" id="matching">
        <div className="container feature-split-layout reversed">
          <div className="feature-visual-side">
            <div className="matching-interactive-card">
              <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                <button className={`filter-pill ${jdPreset === "sde" ? "active" : ""}`} onClick={() => setJdPreset("sde")}>Backend Role</button>
                <button className={`filter-pill ${jdPreset === "ai" ? "active" : ""}`} onClick={() => setJdPreset("ai")}>AI / ML Engineer</button>
                <button className={`filter-pill ${jdPreset === "frontend" ? "active" : ""}`} onClick={() => setJdPreset("frontend")}>Frontend Role</button>
              </div>

              <div className="matching-result-bar">
                <div className="match-score-badge">
                  <span className="match-number">{activePreset.score}%</span>
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "var(--text)" }}>Match Compatibility</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>{activePreset.title}</div>
                  </div>
                </div>

                <div style={{ marginTop: "12px" }}>
                  <div style={{ fontSize: "11px", fontWeight: "800", color: "var(--muted)", marginBottom: "4px" }}>MATCHED KEYWORDS:</div>
                  <div className="match-keywords-list">
                    {activePreset.found.map((kw, i) => (
                      <span key={i} className="kw-pill kw-found">{kw}</span>
                    ))}
                  </div>

                  <div style={{ fontSize: "11px", fontWeight: "800", color: "var(--muted)", marginBlock: "8px 4px" }}>MISSING KEYWORDS:</div>
                  <div className="match-keywords-list">
                    {activePreset.missing.map((kw, i) => (
                      <span key={i} className="kw-pill kw-missing">{kw}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="feature-text-side">
            <span className="eyebrow">INTELLIGENT OPTIMIZATION</span>
            <h2 className="section-title">Make your resume match the opportunity.</h2>
            <p className="section-desc">
              Upload your resume alongside any job description. FreeGraduates instantly maps keyword overlap, identifies missing technical competencies, and suggests actionable phrasing adjustments.
            </p>

            <a href="#ats-scanner" className="btn btn-secondary">Analyze My Match &rarr;</a>
          </div>
        </div>
      </section>

      {/* ==========================================================
           7. AI CAREER COACH SECTION
           ========================================================== */}
      <section className="section section-mist" id="coach">
        <div className="container feature-split-layout">
          <div className="feature-text-side">
            <span className="eyebrow">COMMUNICATION & GUIDANCE</span>
            <h2 className="section-title">Improve more than your resume. Meet your AI Career Coach.</h2>
            <p className="section-desc">
              Great careers require confident communication. Practice introducing yourself, structuring complex thoughts, speaking clearly, and mastering professional workplace interactions.
            </p>

            <Link to="/signup" className="btn btn-primary">Practice with AI Coach &rarr;</Link>
          </div>

          <div className="feature-visual-side">
            <div className="ai-coach-card-mock">
              <div className="coach-header-bar">
                <div>
                  <strong style={{ fontSize: "15px", color: "var(--text)" }}>FreeGraduates AI Coach</strong>
                  <div style={{ fontSize: "12px", color: "var(--success)", fontWeight: "600" }}>&bull; Ready to practice</div>
                </div>
                <span className="visual-badge">Interactive</span>
              </div>

              <div className="coach-chat-stream">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`chat-bubble ${msg.sender === "user" ? "chat-bubble-user" : "chat-bubble-ai"}`}>
                    {msg.text}
                  </div>
                ))}

                <div className="chat-suggestion-chips">
                  <span style={{ fontSize: "11px", fontWeight: "800", color: "var(--muted)", width: "100%" }}>TRY ASKING:</span>
                  <button className="chip-btn" onClick={() => handleCoachClick("introduce")}>Self-Intro Formula</button>
                  <button className="chip-btn" onClick={() => handleCoachClick("star")}>STAR Framework</button>
                  <button className="chip-btn" onClick={() => handleCoachClick("salary")}>Salary Negotiation</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
           8. AI INTERVIEW PREPARATION SECTION
           ========================================================== */}
      <section className="section" id="interview">
        <div className="container">
          <div className="section-header text-center">
            <span className="eyebrow">REALISTIC SIMULATIONS</span>
            <h2 className="section-title">Practice the interview before the real interview.</h2>
            <p className="section-desc">
              Simulate realistic technical and behavioral interview sessions configured specifically for your target role and experience level.
            </p>
          </div>

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
                <span style={{ color: "var(--success)" }}>92%</span>
              </div>
              <div className="meter-track">
                <div className="meter-fill fill-green" style={{ width: "92%" }}></div>
              </div>
              <div className="meter-note">Clear progression from problem statement to solution.</div>
            </div>

            <div className="feedback-meter-card">
              <div className="meter-header">
                <span>Answer Structure (STAR)</span>
                <span style={{ color: "var(--primary)" }}>85%</span>
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
           9. ATS CHECKER SECTION
           ========================================================== */}
      <section className="section section-mist" id="ats">
        <div className="container">
          <div className="ats-breakdown-wrapper">
            <div className="ats-score-hero-box">
              <div className="ats-big-dial">
                <div className="ats-big-dial-inner">
                  <span className="ats-big-score">82</span>
                  <span className="ats-big-max">/ 100</span>
                </div>
              </div>
              <h3 style={{ fontSize: "20px", fontWeight: "800", color: "var(--text)", marginBottom: "6px" }}>ATS Readiness Grade</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "20px" }}>
                Analyzed for font compatibility, section tags, table nesting, and standard headings.
              </p>
              <a href="#ats-scanner" className="btn btn-primary btn-sm">Run Sample Resume Check</a>
            </div>

            <div>
              <span className="eyebrow">AUTOMATED SCREENING AUDIT</span>
              <h2 className="section-title">Check your ATS score.</h2>
              <p className="section-desc" style={{ marginBottom: "24px" }}>
                Upload your resume and understand how ready it is for automated applicant screening systems before applying.
              </p>

              <div className="ats-category-list">
                <div className="ats-cat-row">
                  <div>
                    <div className="ats-cat-title">Layout & Structure Formatting</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>Standard headings used; no unreadable graphics or columns.</div>
                  </div>
                  <span className="ats-cat-status status-pass">Pass (100%)</span>
                </div>

                <div className="ats-cat-row">
                  <div>
                    <div className="ats-cat-title">Essential Contact Details</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>Email, GitHub, LinkedIn, and location properly placed.</div>
                  </div>
                  <span className="ats-cat-status status-pass">Pass (100%)</span>
                </div>

                <div className="ats-cat-row">
                  <div>
                    <div className="ats-cat-title">Role-Specific Keyword Density</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>Add 2 more technical tooling keywords to optimize match.</div>
                  </div>
                  <span className="ats-cat-status status-warning">Needs 2 Keywords</span>
                </div>

                <div className="ats-cat-row">
                  <div>
                    <div className="ats-cat-title">Typography & Bullet Readability</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)" }}>Clean font hierarchy and bullet structure verified.</div>
                  </div>
                  <span className="ats-cat-status status-pass">Pass (100%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
           10. PORTFOLIO BUILDER SECTION
           ========================================================== */}
      <section className="section" id="portfolio">
        <div className="container feature-split-layout reversed">
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
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>Bengaluru, India &bull; Available for 2026 Roles</div>
                  </div>
                </div>

                <div className="port-projects-grid">
                  <div className="port-project-card">
                    <div className="port-proj-title">DevPulse API Gateway</div>
                    <p className="port-proj-desc">High-throughput microservices gateway built with Go and Redis.</p>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--primary)" }}>View Code &bull; Live Demo</div>
                  </div>

                  <div className="port-project-card">
                    <div className="port-proj-title">NeuralSearch Engine</div>
                    <p className="port-proj-desc">Semantic document search engine using FastAPI and vector embeddings.</p>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: "var(--primary)" }}>View Code &bull; Live Demo</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="feature-text-side">
            <span className="eyebrow">SHOWCASE YOUR WORK</span>
            <h2 className="section-title">Turn your work into your portfolio.</h2>
            <p className="section-desc">
              Students and fresh graduates often build fantastic projects during coursework or hackathons but don't know how to present them. FreeGraduates turns your repositories into an impressive personal website.
            </p>

            <Link to="/signup" className="btn btn-primary">Build My Portfolio &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ==========================================================
           11. JOBS & INTERNSHIPS DISCOVERY PREVIEW
           ========================================================== */}
      <section className="section section-mist" id="jobs">
        <div className="container">
          <div className="section-header text-center">
            <span className="eyebrow">OPPORTUNITY HUB</span>
            <h2 className="section-title">Find opportunities that move you forward.</h2>
            <p className="section-desc">
              Discover verified entry-level roles, graduate engineering programs, and high-impact internships matched directly with your skills.
            </p>
          </div>

          <div className="jobs-preview-grid">
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
        </div>
      </section>

      {/* ==========================================================
           12. AUDIENCE FIT: BUILT FOR EVERY STAGE
           ========================================================== */}
      <section className="section" id="audience">
        <div className="container">
          <div className="section-header text-center">
            <span className="eyebrow">WHO WE SERVE</span>
            <h2 className="section-title">Built for every stage of your career journey.</h2>
            <p className="section-desc">
              Whether you are preparing for your very first campus drive or accelerating into your next professional chapter, FreeGraduates meets you where you are.
            </p>
          </div>

          <div className="audience-grid-4">
            <div className="audience-card">
              <div className="aud-icon">🎓</div>
              <h3 className="aud-title">Students</h3>
              <p className="aud-desc">Create your first resume, organize academic projects, and prepare for campus placement season.</p>
            </div>

            <div className="audience-card">
              <div className="aud-icon">🚀</div>
              <h3 className="aud-title">Fresh Graduates</h3>
              <p className="aud-desc">Refine entry-level job applications, target key skills, and build confidence through AI interview practice.</p>
            </div>

            <div className="audience-card">
              <div className="aud-icon">🔍</div>
              <h3 className="aud-title">Job Seekers</h3>
              <p className="aud-desc">Optimize your resume against actual job descriptions, diagnose ATS bottlenecks, and discover active roles.</p>
            </div>

            <div className="audience-card">
              <div className="aud-icon">⭐</div>
              <h3 className="aud-title">Professionals</h3>
              <p className="aud-desc">Elevate your executive communication, sharpen behavioral interview techniques, and level up your career.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
           13. PLACEMENT PREPARATION SECTION
           ========================================================== */}
      <section className="section section-mist" id="placements">
        <div className="container">
          <div className="placement-prep-box">
            <div className="section-header text-center">
              <span className="eyebrow">CAMPUS & ENGINEERING DRIVES</span>
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
           14. FREE + OPEN SOURCE CORE VALUES
           ========================================================== */}
      <section className="section" id="opensource">
        <div className="container">
          <div className="open-source-banner text-center">
            <span className="eyebrow">OPEN SOURCE PHILOSOPHY</span>
            <h2 className="section-title">Career preparation should be accessible to everyone.</h2>
            <p className="section-desc" style={{ maxWidth: "720px", marginInline: "auto" }}>
              FreeGraduates is built as a free and open-source platform to make practical career tools accessible to students, graduates, and job seekers worldwide — with zero paywalls on essential preparation.
            </p>

            <div className="os-pillars">
              <div className="os-pillar-item">
                <div className="os-pillar-title">100% Free Core</div>
                <p className="os-pillar-desc">
                  Essential resume generation, ATS checking, and career guidance shouldn't be locked behind a subscription fee.
                </p>
              </div>

              <div className="os-pillar-item">
                <div className="os-pillar-title">Open Source Code</div>
                <p className="os-pillar-desc">
                  Built transparently in the open. Contributions, feedback, and community template contributions are warmly welcomed.
                </p>
              </div>

              <div className="os-pillar-item">
                <div className="os-pillar-title">Community Powered</div>
                <p className="os-pillar-desc">
                  Designed with students, educators, and hiring engineers to solve real hiring challenges fairly.
                </p>
              </div>
            </div>

            <a href="https://github.com/Nikhilsai-9/FreeGraduates" target="_blank" rel="noopener noreferrer" className="btn btn-secondary" style={{ marginTop: "24px" }}>
              Explore FreeGraduates on GitHub &rarr;
            </a>
          </div>
        </div>
      </section>

      {/* ==========================================================
           15. INTEGRATED ATS CHECKER & AUDITOR FORM
           ========================================================== */}
      <section className="section section-mist" id="ats-scanner">
        <div className="container">
          <div className="section-header text-center">
            <span className="eyebrow">AUTOMATED SCREENING AUDIT</span>
            <h2 className="section-title">Check Your Resume ATS Score</h2>
            <p className="section-desc">
              Upload your resume and paste a target job description to get a comprehensive match score, missing keywords, and bullet rewrites.
            </p>
          </div>

          <div className="ui-card ats-scanner-card">
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
                  style={{ minWidth: "240px" }}
                >
                  {loading ? "Analyzing Resume..." : "Run Free ATS Audit &rarr;"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* ==========================================================
           16. CAREER JOURNEY TIMELINE
           ========================================================== */}
      <section className="section" id="journey">
        <div className="container">
          <div className="section-header text-center">
            <span className="eyebrow">YOUR STEP-BY-STEP PATHWAY</span>
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
              <Link to="/signup" className="btn btn-primary btn-lg">
                Get Started Free &rarr;
              </Link>
              <a href="#journey" className="btn btn-secondary btn-lg">
                Explore FreeGraduates
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
           18. FOOTER
           ========================================================== */}
      <footer className="landing-site-footer">
        <div className="container footer-content-wrapper">
          <div className="footer-brand-column">
            <div className="footer-logo">
              Free<span>Graduates</span>
            </div>
            <p className="footer-tagline">
              The free & open-source career platform for college students, engineering graduates, and job seekers.
            </p>
            <div className="footer-domain-badge">Domain: freegraduates.com</div>
          </div>

          <div className="footer-links-column">
            <h4>Platform Tools</h4>
            <Link to="/builder/new">AI Resume Builder</Link>
            <a href="#ats-scanner">ATS Score Checker</a>
            <Link to="/dashboard">User Dashboard</Link>
            <Link to="/history">Audit History</Link>
          </div>

          <div className="footer-links-column">
            <h4>Open Source</h4>
            <a href="https://github.com/Nikhilsai-9/FreeGraduates" target="_blank" rel="noopener noreferrer">
              GitHub Repository
            </a>
            <Link to="/signup">Create Account</Link>
            <Link to="/login">Sign In</Link>
          </div>
        </div>

        <div className="footer-bottom-bar">
          <div className="container bottom-flex">
            <p>&copy; {new Date().getFullYear()} FreeGraduates. Open Source & Community Driven.</p>
            <p>Prepare. Practice. Get Hired.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
