import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import FileUpload from "../components/FileUpload";
import JDInput from "../components/JDInput";
import Loader from "../components/Loader";
import Toast from "../components/Toast";
import { resumeApi } from "../api/api";
import "./Home.css";

const PLATFORM_TOOLS = [
  {
    id: "builder",
    icon: "📄",
    title: "AI Resume Builder",
    tag: "LIVE NOW",
    badgeColor: "success",
    desc: "Build professional, ATS-friendly resumes in real-time with split-screen AI diff suggestions.",
    link: "/builder/new"
  },
  {
    id: "templates",
    icon: "🎨",
    title: "Resume Templates",
    tag: "4 TEMPLATES",
    badgeColor: "primary",
    desc: "Switch dynamically between Minimal SDE, Modern Tech, Campus Student, and Executive Classic layouts.",
    link: "/builder/new"
  },
  {
    id: "matching",
    icon: "🎯",
    title: "Resume + JD Matching",
    tag: "LIVE NOW",
    badgeColor: "success",
    desc: "Compare your resume directly against any Job Description to uncover missing technical keywords.",
    link: "#ats-scanner"
  },
  {
    id: "ats",
    icon: "📊",
    title: "ATS Score & Checker",
    tag: "LIVE NOW",
    badgeColor: "success",
    desc: "Get an instant match score (0-100), sub-scores for experience, education, and keyword density.",
    link: "#ats-scanner"
  },
  {
    id: "coach",
    icon: "🗣️",
    title: "AI Communication Coach",
    tag: "COMING SOON",
    badgeColor: "warning",
    desc: "Practice verbal clarity, tone, and confidence for recruiter phone screens and behavioral rounds.",
    link: null
  },
  {
    id: "interview",
    icon: "🤖",
    title: "AI Interview Prep",
    tag: "COMING SOON",
    badgeColor: "warning",
    desc: "Simulate role-specific technical and STAR method interviews with dynamic AI feedback.",
    link: null
  },
  {
    id: "portfolio-builder",
    icon: "💻",
    title: "Portfolio Builder",
    tag: "COMING SOON",
    badgeColor: "warning",
    desc: "Convert your resume and GitHub repositories into a modern developer portfolio website.",
    link: null
  },
  {
    id: "portfolio-templates",
    icon: "✨",
    title: "Portfolio Templates",
    tag: "COMING SOON",
    badgeColor: "warning",
    desc: "Choose from glassmorphism, minimal dark, and interactive developer portfolio themes.",
    link: null
  },
  {
    id: "jobs",
    icon: "💼",
    title: "Job Discovery & Internships",
    tag: "COMING SOON",
    badgeColor: "warning",
    desc: "Aggregated entry-level software engineering jobs, internships, and off-campus drives.",
    link: null
  },
  {
    id: "roadmaps",
    icon: "🗺️",
    title: "Career Roadmaps",
    tag: "COMING SOON",
    badgeColor: "warning",
    desc: "Curated learning paths for Frontend, Backend, DevOps, Data Engineering, and AI/ML.",
    link: null
  },
  {
    id: "assessments",
    icon: "📝",
    title: "Skill Assessments",
    tag: "COMING SOON",
    badgeColor: "warning",
    desc: "Take quick coding and domain quizzes to validate skills and showcase verified badges.",
    link: null
  },
  {
    id: "salary",
    icon: "💰",
    title: "Salary Insights",
    tag: "COMING SOON",
    badgeColor: "warning",
    desc: "Transparent compensation benchmarks for fresh graduates and junior software engineers.",
    link: null
  }
];

export default function Home() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

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

  return (
    <div className="landing-page-container">
      <Loader active={loading} />
      <Toast message={toastMessage} type="error" onClose={() => setToastMessage("")} />

      {/* Hero Banner */}
      <section className="hero-banner-section">
        <div className="container hero-content-box">
          <div className="hero-glow-badge">
            <span className="badge-sparkle">✨</span> 100% Free & Open-Source Career Platform
          </div>

          <h1 className="hero-title">
            Prepare. Practice. <span className="text-gradient">Get Hired.</span>
          </h1>

          <p className="hero-subtitle">
            FreeGraduates brings AI Resume Building, ATS Scoring, Mock Interviews, and Portfolio Generation together in one place for college students, fresh graduates, and job seekers.
          </p>

          <div className="hero-cta-cluster">
            <Link to="/builder/new" className="btn btn-primary btn-lg">
              🚀 Build AI Resume Now
            </Link>
            <a href="#ats-scanner" className="btn btn-secondary btn-lg">
              ⚡ Scan ATS Score
            </a>
            <a
              href="https://github.com/Nikhilsai-9/FreeGraduates"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary btn-lg"
            >
              ⭐ GitHub Repository
            </a>
          </div>

          <div className="hero-metrics-strip">
            <div className="metric-item">
              <strong>100% Free</strong>
              <span>No Credit Card Required</span>
            </div>
            <div className="metric-divider"></div>
            <div className="metric-item">
              <strong>Gemini 3.6 AI</strong>
              <span>Sub-Second Intelligence</span>
            </div>
            <div className="metric-divider"></div>
            <div className="metric-item">
              <strong>ATS Compliant</strong>
              <span>Workday, Greenhouse & Lever</span>
            </div>
          </div>
        </div>
      </section>

      {/* Integrated ATS Scanner Section */}
      <section id="ats-scanner" className="ats-scanner-section">
        <div className="container">
          <div className="section-header-box text-center">
            <span className="section-eyebrow">INSTANT ATS RESUME AUDITOR</span>
            <h2 className="section-headline">Check Your Resume ATS Score</h2>
            <p className="section-subtext">
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

              <div className="ats-action-row">
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

      {/* Product Vision & 12 Tools Grid */}
      <section className="platform-tools-section">
        <div className="container">
          <div className="section-header-box text-center">
            <span className="section-eyebrow">COMPLETE CAREER ECOSYSTEM</span>
            <h2 className="section-headline">Everything You Need To Get Hired</h2>
            <p className="section-subtext">
              FreeGraduates is building the ultimate open-source suite of career preparation tools for engineers and graduates.
            </p>
          </div>

          <div className="tools-grid-layout">
            {PLATFORM_TOOLS.map((tool) => (
              <div key={tool.id} className="ui-card tool-feature-card">
                <div className="tool-card-top">
                  <div className="tool-icon-box">{tool.icon}</div>
                  <span className={`tool-status-badge badge-${tool.badgeColor}`}>
                    {tool.tag}
                  </span>
                </div>

                <h3 className="tool-card-title">{tool.title}</h3>
                <p className="tool-card-desc">{tool.desc}</p>

                {tool.link ? (
                  <Link to={tool.link} className="btn-tool-action">
                    Launch Tool &rarr;
                  </Link>
                ) : (
                  <span className="tool-coming-tag">In Active Development</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
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
