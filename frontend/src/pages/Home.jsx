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

const COACH_RESPONSES = {
  introduce: "Coach: Great! Here is your 60-second introduction formula: 1) Present role & degree, 2) Highlight 1-2 major technical projects, 3) Explain why this engineering team excites you.",
  star: "Coach: Use STAR: Situation (set context), Task (your goal), Action (what YOU coded/built), Result (quantified outcome, e.g. 40% speedup).",
  salary: "Coach: When asked about salary expectations: 'My priority is finding the right engineering team. Based on market data for junior SDEs in this region, I am looking for a fair benchmark of ₹X - ₹Y.'"
};

export default function Home() {
  // ATS Audit Upload State
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // Interactive Demo States
  const [templateFilter, setTemplateFilter] = useState("all");
  const [jdPreset, setJdPreset] = useState("sde");
  const [chatMessages, setChatMessages] = useState([
    { sender: "user", text: "I don't know how to introduce myself in an interview." },
    {
      sender: "ai",
      text: "Coach: Let's build your introduction step by step using the Present-Past-Future formula: 1) Present status & degree, 2) Major project results, 3) Why this specific engineering role."
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
    const text = COACH_RESPONSES[topicKey];
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
              <a href="#value-prop" className="btn btn-secondary btn-lg">
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
              <div className="preview-resume-pane">
                <div className="mock-resume-header">
                  <div className="mock-applicant-name">Rahul Sharma</div>
                  <div className="mock-applicant-title">Aspiring Software Engineer &bull; B.Tech CS</div>
                </div>
                <div className="mock-resume-row">
                  <div className="mock-row-title">Core Skills</div>
                  <div className="mock-tags">
                    <span className="mock-tag tag-match">Java</span>
                    <span className="mock-tag tag-match">Spring Boot</span>
                    <span className="mock-tag tag-match">PostgreSQL</span>
                    <span className="mock-tag">Docker</span>
                  </div>
                </div>
                <div className="mock-resume-row">
                  <div className="mock-row-title">Featured Project</div>
                  <p style={{ fontSize: "12px", fontWeight: "700", color: "var(--text)" }}>Distributed Cache Engine</p>
                  <p style={{ fontSize: "11px", color: "var(--muted)" }}>Reduced API query latency by 42% using LRU eviction.</p>
                </div>
              </div>

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
            <span className="college-logo-item">Product Companies</span>
            <span className="college-logo-item">High-Growth Startups</span>
            <span className="college-logo-item">Tech Giants</span>
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
              <Link to="/builder/new" className="pillar-tag">Browse Roles &rarr;</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ==========================================================
          4. RESUME TEMPLATES GALLERY
          ========================================================== */}
      <section className="section" id="templates">
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
          5. RESUME + JOB DESCRIPTION MATCHING DEMO
          ========================================================== */}
      <section className="section section-mist" id="matching">
        <div className="container feature-split-layout">
          <div className="feature-text-side">
            <span className="eyebrow">INTELLIGENT OPTIMIZATION</span>
            <h2 className="section-title">Make your resume match the opportunity.</h2>
            <p className="section-desc">
              Upload your resume alongside any job description. FreeGraduates instantly maps keyword overlap, identifies missing technical competencies, and suggests actionable phrasing adjustments.
            </p>

            <ul className="feature-bullet-list">
              <li class="feature-bullet-item">
                <div><strong>Missing Keyword Detection:</strong> Never miss essential tools or industry terminology.</div>
              </li>
              <li class="feature-bullet-item">
                <div><strong>Contextual Alignment:</strong> Pinpoints whether your bullets reflect the seniority requested.</div>
              </li>
            </ul>

            <a href="#ats-scanner" className="btn btn-primary">Analyze My Match</a>
          </div>

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
        </div>
      </section>

      {/* ==========================================================
          6. AI CAREER COACH SECTION
          ========================================================== */}
      <section className="section" id="coach">
        <div className="container feature-split-layout reversed">
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

          <div className="feature-text-side">
            <span className="eyebrow">COMMUNICATION & GUIDANCE</span>
            <h2 className="section-title">Improve more than your resume. Meet your AI Career Coach.</h2>
            <p className="section-desc">
              Great careers require confident communication. Practice introducing yourself, structuring complex thoughts, speaking clearly, and mastering professional workplace interactions.
            </p>

            <Link to="/signup" className="btn btn-primary">Practice with AI Coach &rarr;</Link>
          </div>
        </div>
      </section>

      {/* ==========================================================
          7. INTEGRATED ATS CHECKER & AUDITOR
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
          8. FOOTER
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
