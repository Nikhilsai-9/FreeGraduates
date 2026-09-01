import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { resumeApi } from "../api/api";
import { useAuth } from "../context/AuthContext";
import Toast from "../components/Toast";
import FileUpload from "../components/FileUpload";
import JDInput from "../components/JDInput";
import Loader from "../components/Loader";
import "./Dashboard.css";

// Community Templates Data Architecture
const COMMUNITY_TEMPLATES = [
  // 1. Resume Templates
  {
    id: "campus-standard",
    type: "resume",
    title: "Campus Standard",
    role: "Students & Internships",
    category: "Student",
    style: "Clean Single-Column",
    badge: "Most Popular",
    templateKey: "campus",
    description: "Tailored for university placements and internship applications. Focuses on coursework, academic projects, and core competencies.",
    features: ["100% ATS Compliant", "Optimized for fresh grads", "Single-column hierarchy", "Quick export"]
  },
  {
    id: "sde-minimalist",
    type: "resume",
    title: "SDE Minimalist",
    role: "Backend, Fullstack & DevOps",
    category: "Software Engineering",
    style: "Minimalist Tech",
    badge: "ATS 99%",
    templateKey: "minimal",
    description: "High-density technical layout preferred by engineering hiring managers. Highlights system architectures and quantifiable metrics.",
    features: ["Maximized readability", "Tech stack tags", "Quantified impact bullets", "Zero parsing penalty"]
  },
  {
    id: "data-ml-specialist",
    type: "resume",
    title: "Data & ML Specialist",
    role: "AI / ML, Data Science & Research",
    category: "AI & Data",
    style: "Modern Technical",
    badge: "AI Ready",
    templateKey: "modern",
    description: "Designed for machine learning engineers and data analysts to emphasize model pipelines, datasets, and research papers.",
    features: ["Project architecture highlights", "Tooling & libraries focus", "Modern section headers", "Dual column support"]
  },
  {
    id: "executive-classic",
    type: "resume",
    title: "Executive Classic",
    role: "Product, Consulting & Management",
    category: "Business & Management",
    style: "Classic Professional",
    badge: "Corporate",
    templateKey: "classic",
    description: "Traditional corporate formatting ideal for consulting, project management, and business leadership opportunities.",
    features: ["Formal serif accents", "Leadership emphasis", "Standard ATS sections", "High print fidelity"]
  },
  {
    id: "frontend-creator",
    type: "resume",
    title: "Frontend Creator",
    role: "UI/UX & Web Developers",
    category: "Software Engineering",
    style: "Vibrant Tech",
    badge: "Creative",
    templateKey: "modern",
    description: "Vibrant and structured formatting for frontend developers and UI engineers to display live demos and visual links.",
    features: ["Live demo URLs", "Design system skills", "Component project blocks", "ATS verified"]
  },

  // 2. Portfolio Templates
  {
    id: "devpulse-portfolio",
    type: "portfolio",
    title: "DevPulse Micro Portfolio",
    role: "Backend & Systems Engineers",
    category: "Software Engineering",
    style: "Glassmorphism & Code Demos",
    badge: "New",
    templateKey: "devpulse",
    description: "A fast, responsive web portfolio built to showcase GitHub repositories, API endpoints, and live microservice deployments.",
    features: ["Live GitHub stars sync", "Interactive code sandbox", "Docker container links", "Mobile responsive"]
  },
  {
    id: "neuralsearch-portfolio",
    type: "portfolio",
    title: "NeuralSearch Showcase",
    role: "AI / ML & Vector Engineers",
    category: "AI & Data",
    style: "Modern Dark Theme",
    badge: "AI Showcase",
    templateKey: "neuralsearch",
    description: "Showcase deep learning projects, research preprints, HuggingFace demos, and vector search embeddings.",
    features: ["HuggingFace spaces embed", "Jupyter notebook previews", "FastAPI endpoint docs", "Dark mode"]
  },
  {
    id: "minimalist-dark-swe",
    type: "portfolio",
    title: "Minimalist Developer Hub",
    role: "Fullstack Developers",
    category: "Software Engineering",
    style: "Minimal Monospace",
    badge: "Minimalist",
    templateKey: "minimal-dev",
    description: "Super lightweight, blazing fast developer homepage with terminal-inspired typography and minimal layout.",
    features: ["Sub-50ms page load", "Custom domain ready", "Blog markdown support", "Clean project cards"]
  },
  {
    id: "academic-research-portfolio",
    type: "portfolio",
    title: "Academic & Research Page",
    role: "Graduates & PhD Researchers",
    category: "Student",
    style: "Academic Clean",
    badge: "Research",
    templateKey: "academic",
    description: "Structured portfolio for university thesis projects, conference papers, publications, and academic awards.",
    features: ["BibTeX citation export", "PDF paper attachments", "Advisor & grant credits", "Clean typography"]
  }
];

export default function Dashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  // User Data State
  const [resumes, setResumes] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  // Toast State
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("error");

  // Top Bar Dropdowns State
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  // Community Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all"); // 'all', 'resume', 'portfolio'

  // Template Preview Modal State
  const [previewTemplate, setPreviewTemplate] = useState(null);

  // Quick Analyzer Modal State
  const [quickScanOpen, setQuickScanOpen] = useState(false);
  const [scanFile, setScanFile] = useState(null);
  const [scanJd, setScanJd] = useState("");
  const [scanning, setScanning] = useState(false);

  // Horizontal Scroll Refs
  const resumeRowRef = useRef(null);
  const portfolioRowRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load Real User Data from Backend
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [resumesRes, historyRes] = await Promise.allSettled([
        resumeApi.getResumes(),
        resumeApi.getHistory()
      ]);

      if (resumesRes.status === "fulfilled" && resumesRes.value?.data) {
        setResumes(resumesRes.value.data);
      }
      if (historyRes.status === "fulfilled" && historyRes.value?.data) {
        setHistory(historyRes.value.data);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handle Resume Duplicate
  const handleDuplicateResume = async (resume) => {
    try {
      const copyData = {
        ...resume,
        _id: undefined,
        title: `${resume.title || "Resume"} (Copy)`,
        createdAt: undefined,
        updatedAt: undefined
      };
      const res = await resumeApi.createResume(copyData);
      if (res && res.data) {
        setToastType("success");
        setToastMessage(`Duplicated as "${res.data.title}".`);
        loadDashboardData();
      }
    } catch (err) {
      setToastType("error");
      setToastMessage(err.message || "Failed to duplicate resume.");
    }
  };

  // Handle Resume Delete
  const handleDeleteResume = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title || "Untitled Resume"}"?`)) return;

    try {
      await resumeApi.deleteResume(id);
      setResumes((prev) => prev.filter((r) => r._id !== id));
      setToastType("success");
      setToastMessage(`Resume "${title}" deleted.`);
    } catch (err) {
      setToastType("error");
      setToastMessage(err.response?.data?.message || err.message || "Failed to delete resume.");
    }
  };

  // Handle Quick Scan Submit
  const handleQuickScanSubmit = async (e) => {
    e.preventDefault();
    if (!scanFile) {
      setToastType("error");
      setToastMessage("Please select a resume file (PDF or DOCX).");
      return;
    }

    try {
      setScanning(true);
      const formData = new FormData();
      formData.append("resume", scanFile);
      if (scanJd.trim()) {
        formData.append("jobDescription", scanJd.trim());
      }

      const res = await resumeApi.fullAnalyze(formData);
      if (res && res.data && res.data.analysisId) {
        setQuickScanOpen(false);
        navigate(`/results/${res.data.analysisId}`);
      } else {
        throw new Error(res.message || "Analysis failed.");
      }
    } catch (err) {
      console.error("Quick scan error:", err);
      setToastType("error");
      setToastMessage(err.response?.data?.message || err.message || "Analysis request failed.");
    } finally {
      setScanning(false);
    }
  };

  // Scroll Horizontal Rows
  const scrollRow = (ref, direction) => {
    if (ref.current) {
      const scrollAmount = direction === "left" ? -340 : 340;
      ref.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  // Filter Templates
  const filteredTemplates = COMMUNITY_TEMPLATES.filter((t) => {
    const matchesCategory =
      activeCategory === "all" ||
      (activeCategory === "resume" && t.type === "resume") ||
      (activeCategory === "portfolio" && t.type === "portfolio");

    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !query ||
      t.title.toLowerCase().includes(query) ||
      t.role.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query) ||
      t.style.toLowerCase().includes(query);

    return matchesCategory && matchesSearch;
  });

  const resumeTemplates = filteredTemplates.filter((t) => t.type === "resume");
  const portfolioTemplates = filteredTemplates.filter((t) => t.type === "portfolio");

  // User First Name & Initials
  const userFirstName =
    currentUser?.displayName?.split(" ")[0] ||
    currentUser?.email?.split("@")[0] ||
    "Graduate";

  const getUserInitials = () => {
    if (currentUser?.displayName) {
      const parts = currentUser.displayName.trim().split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (currentUser?.email) {
      return currentUser.email.substring(0, 2).toUpperCase();
    }
    return "FG";
  };

  const notifications = [
    {
      id: 1,
      title: "Welcome to FreeGraduates",
      desc: "Start by creating your first ATS-ready resume or running an analysis.",
      time: "Just now",
      unread: true
    },
    {
      id: 2,
      title: "New Templates Added",
      desc: "Check out the new SDE Minimalist and Data Science templates in Community.",
      time: "1h ago",
      unread: true
    }
  ];

  return (
    <div className="dash-layout-root">
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage("")} />
      <Loader active={scanning} />

      {/* ==========================================================
           1. AUTHENTICATED SIDEBAR NAVIGATION (STARTS AT TOP)
           ========================================================== */}
      <aside className="dash-sidebar" aria-label="Dashboard Sidebar">
        <div className="sidebar-brand-strip">
          <Link to="/" className="sidebar-brand-group">
            <div className="brand-logo-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 20V4h14" />
                <path d="M5 12h10" />
                <path d="M12 4l7 7" />
              </svg>
            </div>
            <span className="sidebar-brand-text">Free<span>Graduates</span></span>
          </Link>
        </div>

        <nav className="sidebar-nav-list">
          <div className="sidebar-section-label">WORKSPACE</div>
          <a href="#workspace" className="sidebar-nav-item active">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            <span>Dashboard</span>
          </a>

          <Link to="/builder/new" className="sidebar-nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <span>Resume Builder</span>
          </Link>

          <button type="button" className="sidebar-nav-item" onClick={() => setQuickScanOpen(true)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span>AI Resume Analyzer</span>
          </button>

          <a href="#community" className="sidebar-nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Community & Templates</span>
          </a>

          <div className="sidebar-section-label" style={{ marginTop: "18px" }}>CAREER TOOLS</div>
          <div className="sidebar-nav-item disabled-tool">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 12l3 3 5-5" />
            </svg>
            <span>ATS Checker</span>
            <span className="sidebar-badge-soon">Soon</span>
          </div>

          <div className="sidebar-nav-item disabled-tool">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
            <span>AI Coach</span>
            <span className="sidebar-badge-soon">Soon</span>
          </div>

          <div className="sidebar-nav-item disabled-tool">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            </svg>
            <span>AI Interview</span>
            <span className="sidebar-badge-soon">Soon</span>
          </div>

          <div className="sidebar-nav-item disabled-tool">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
            </svg>
            <span>Portfolio</span>
            <span className="sidebar-badge-soon">Soon</span>
          </div>

          <div className="sidebar-nav-item disabled-tool">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
            <span>Jobs & Internships</span>
            <span className="sidebar-badge-soon">Soon</span>
          </div>
        </nav>

        <div className="sidebar-bottom-actions">
          <Link to="/history" className="sidebar-nav-item">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 14 14" />
            </svg>
            <span>Audit History</span>
          </Link>
          <button type="button" className="sidebar-nav-item sidebar-logout-btn" onClick={logout}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ==========================================================
           2. MAIN DASHBOARD CONTENT AREA (NO DUPLICATE HEADER)
           ========================================================== */}
      <main className="dash-main-scrollable">
        <div className="dash-content-container">

          {/* Top Dashboard Header Bar with Profile & Notifications */}
          <div className="dash-top-bar">
            <div className="dash-top-title-area">
              <div className="dash-top-badge">WORKSPACE</div>
              <span className="dash-top-heading">Personal Career Dashboard</span>
            </div>

            <div className="dash-top-user-cluster">
              {/* Notification Bell */}
              <div className="notif-dropdown-wrapper" ref={notifRef}>
                <button
                  type="button"
                  className="notif-btn"
                  aria-label="Notifications"
                  onClick={() => setNotificationOpen(!notificationOpen)}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <span className="notif-badge-dot"></span>
                </button>

                {notificationOpen && (
                  <div className="notif-popover-panel">
                    <div className="notif-header">
                      <span className="notif-title">Notifications</span>
                      <span className="notif-count">2 unread</span>
                    </div>
                    <div className="notif-list">
                      {notifications.map((item) => (
                        <div key={item.id} className={`notif-item ${item.unread ? "unread" : ""}`}>
                          <div className="notif-item-title">{item.title}</div>
                          <div className="notif-item-desc">{item.desc}</div>
                          <div className="notif-item-time">{item.time}</div>
                        </div>
                      ))}
                    </div>
                    <div className="notif-footer">
                      <button type="button" className="notif-mark-read" onClick={() => setNotificationOpen(false)}>
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Circular Profile Avatar & Dropdown */}
              <div className="profile-dropdown-wrapper" ref={profileRef}>
                <button
                  type="button"
                  className="profile-avatar-btn"
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  aria-label="User Profile Menu"
                  aria-expanded={profileDropdownOpen}
                >
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="user-avatar-circle user-avatar-img" />
                  ) : (
                    <div className="user-avatar-circle">{getUserInitials()}</div>
                  )}
                  <span className="profile-name-snippet">
                    {currentUser?.displayName || currentUser?.email?.split("@")[0]}
                  </span>
                  <svg className="dropdown-arrow-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {profileDropdownOpen && (
                  <div className="profile-menu-dropdown">
                    <div className="dropdown-user-header">
                      <div className="dropdown-user-name">
                        {currentUser?.displayName || "FreeGraduates Member"}
                      </div>
                      <div className="dropdown-user-email">{currentUser?.email}</div>
                    </div>

                    <div className="dropdown-divider"></div>

                    <Link to="/builder/new" className="dropdown-menu-item" onClick={() => setProfileDropdownOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                      </svg>
                      Resume Builder
                    </Link>

                    <Link to="/history" className="dropdown-menu-item" onClick={() => setProfileDropdownOpen(false)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 14 14" />
                      </svg>
                      Audit History
                    </Link>

                    <div className="dropdown-divider"></div>

                    <button
                      type="button"
                      className="dropdown-menu-item dropdown-logout-btn"
                      onClick={logout}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ==========================================================
               PART A: PRODUCT WORKSPACE (PERSONAL CAREER WORK)
               ========================================================== */}
          <section id="workspace" className="dash-section">
            {/* Welcome Banner */}
            <div className="dash-welcome-banner">
              <div>
                <span className="eyebrow eyebrow-mint">Personal Workspace</span>
                <h1 className="dash-welcome-title">
                  Welcome back, <span className="highlight-blue">{userFirstName}</span>
                </h1>
                <p className="dash-welcome-sub">
                  Continue where you left off. Manage your resumes, audit ATS compatibility, and browse community templates.
                </p>
              </div>

              <div className="dash-welcome-actions">
                <Link to="/builder/new" className="btn btn-primary">
                  + Build New Resume
                </Link>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setQuickScanOpen(true)}
                >
                  ⚡ Scan Resume ATS
                </button>
              </div>
            </div>

            {/* Career Progress Strip */}
            <div className="dash-metrics-strip">
              <div className="metric-box">
                <div className="metric-num">{resumes.length}</div>
                <div className="metric-label">Saved Resumes</div>
              </div>
              <div className="metric-divider"></div>
              <div className="metric-box">
                <div className="metric-num">{history.length}</div>
                <div className="metric-label">ATS Audits</div>
              </div>
              <div className="metric-divider"></div>
              <div className="metric-box">
                <div className="metric-num highlight-blue">
                  {history.length > 0 ? `${history[0].matchScore || 0}%` : "—"}
                </div>
                <div className="metric-label">Latest ATS Score</div>
              </div>
              <div className="metric-divider"></div>
              <div className="metric-box">
                <div className="metric-status-badge">Active Job Seeker</div>
                <div className="metric-label">Status</div>
              </div>
            </div>

            {/* Primary Action Cards: Resume Builder & AI Resume Analyzer */}
            <div className="primary-tools-grid">
              {/* Tool 1: Resume Builder Card */}
              <div className="tool-workspace-card">
                <div className="tool-card-head">
                  <div className="tool-icon-circle blue-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <h3 className="tool-head-title">Resume Builder</h3>
                    <p className="tool-head-desc">Create and manage your professional resume.</p>
                  </div>
                </div>

                <div className="tool-inner-content">
                  {loading ? (
                    <div className="tool-loading-placeholder">Loading your resumes…</div>
                  ) : resumes.length > 0 ? (
                    <div className="user-resumes-list">
                      {resumes.slice(0, 3).map((r) => (
                        <div key={r._id} className="user-resume-item">
                          <div>
                            <div className="user-res-name">{r.title || "Untitled Resume"}</div>
                            <div className="user-res-date">
                              Updated {new Date(r.updatedAt || Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric" })} &bull; {r.templateId || "Standard"} Layout
                            </div>
                          </div>
                          <div className="user-res-actions">
                            <Link to={`/builder/${r._id}`} className="btn btn-secondary btn-sm">
                              Edit
                            </Link>
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              title="Duplicate"
                              onClick={() => handleDuplicateResume(r)}
                            >
                              Copy
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              title="Delete"
                              onClick={() => handleDeleteResume(r._id, r.title)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="tool-empty-state">
                      <p>No resumes created yet. Choose a template or start from scratch.</p>
                    </div>
                  )}
                </div>

                <div className="tool-card-footer">
                  <Link
                    to={resumes.length > 0 ? `/builder/${resumes[0]._id}` : "/builder/new"}
                    className="btn btn-primary btn-sm"
                  >
                    {resumes.length > 0 ? "Continue Resume &rarr;" : "Build My Resume &rarr;"}
                  </Link>
                  <Link to="/builder/new" className="btn btn-secondary btn-sm">
                    + New Resume
                  </Link>
                </div>
              </div>

              {/* Tool 2: AI Resume Analyzer Card */}
              <div className="tool-workspace-card">
                <div className="tool-card-head">
                  <div className="tool-icon-circle mint-icon">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <div style={{ flexGrow: 1 }}>
                    <h3 className="tool-head-title">AI Resume Analyzer</h3>
                    <p className="tool-head-desc">
                      Analyze your resume and discover ways to improve it for the role you're targeting.
                    </p>
                  </div>
                </div>

                <div className="tool-inner-content">
                  {loading ? (
                    <div className="tool-loading-placeholder">Loading evaluation records…</div>
                  ) : history.length > 0 ? (
                    <div className="user-resumes-list">
                      {history.slice(0, 3).map((item) => (
                        <div key={item._id} className="user-resume-item">
                          <div>
                            <div className="user-res-name">{item.originalName || "Uploaded Resume"}</div>
                            <div className="user-res-date">
                              Evaluated {new Date(item.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                            </div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className="metric-score-tag">{item.matchScore || 0}% ATS</span>
                            <Link to={`/results/${item._id}`} className="btn btn-secondary btn-sm">
                              View
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="tool-empty-state">
                      <p>No analyses performed yet. Upload a resume to test keyword match & formatting.</p>
                    </div>
                  )}
                </div>

                <div className="tool-card-footer">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setQuickScanOpen(true)}
                  >
                    Analyze Resume &rarr;
                  </button>
                  <Link to="/history" className="btn btn-secondary btn-sm">
                    View All History
                  </Link>
                </div>
              </div>
            </div>

            {/* Quick Actions Strip */}
            <div className="quick-actions-box">
              <div className="quick-actions-label">QUICK ACTIONS</div>
              <div className="quick-actions-row">
                <Link to="/builder/new" className="quick-action-pill">
                  <span className="qa-icon">📄</span> Build Resume
                </Link>
                <button type="button" className="quick-action-pill" onClick={() => setQuickScanOpen(true)}>
                  <span className="qa-icon">⚡</span> Analyze Resume
                </button>
                <a href="#community" className="quick-action-pill">
                  <span className="qa-icon">🎨</span> Browse Templates
                </a>
                <div className="quick-action-pill disabled-pill" title="Coming Soon">
                  <span className="qa-icon">🤖</span> AI Interview <span className="pill-soon">Soon</span>
                </div>
                <div className="quick-action-pill disabled-pill" title="Coming Soon">
                  <span className="qa-icon">💻</span> Build Portfolio <span className="pill-soon">Soon</span>
                </div>
                <div className="quick-action-pill disabled-pill" title="Coming Soon">
                  <span className="qa-icon">💼</span> Explore Jobs <span className="pill-soon">Soon</span>
                </div>
              </div>
            </div>
          </section>

          {/* ==========================================================
               PART B: FREEGRADUATES COMMUNITY / TEMPLATE LIBRARY
               ========================================================== */}
          <section id="community" className="dash-section community-section">
            <div className="community-header-box">
              <div className="eyebrow">FreeGraduates Community</div>
              <h2 className="section-title">Explore the Community Template Library</h2>
              <p className="section-desc">
                Discover professional resume and portfolio templates created to help you present your work better.
              </p>
            </div>

            {/* Search Bar & Category Filters */}
            <div className="community-controls-bar">
              <div className="community-search-input-wrapper">
                <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  className="community-search-input"
                  placeholder="Search resume templates, portfolio templates, styles, roles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="clear-search-btn"
                    onClick={() => setSearchQuery("")}
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Category Pills */}
              <div className="community-category-pills">
                <button
                  type="button"
                  className={`cat-filter-btn ${activeCategory === "all" ? "active" : ""}`}
                  onClick={() => setActiveCategory("all")}
                >
                  All Templates
                </button>
                <button
                  type="button"
                  className={`cat-filter-btn ${activeCategory === "resume" ? "active" : ""}`}
                  onClick={() => setActiveCategory("resume")}
                >
                  Resume Templates ({COMMUNITY_TEMPLATES.filter(t => t.type === "resume").length})
                </button>
                <button
                  type="button"
                  className={`cat-filter-btn ${activeCategory === "portfolio" ? "active" : ""}`}
                  onClick={() => setActiveCategory("portfolio")}
                >
                  Portfolio Templates ({COMMUNITY_TEMPLATES.filter(t => t.type === "portfolio").length})
                </button>
              </div>
            </div>

            {/* 1. RESUME TEMPLATES ROW (HORIZONTAL BROWSING) */}
            {(activeCategory === "all" || activeCategory === "resume") && resumeTemplates.length > 0 && (
              <div className="template-row-container">
                <div className="template-row-header">
                  <div>
                    <h3 className="template-row-title">Resume Templates</h3>
                    <p className="template-row-sub">Single and dual-column layouts strictly compliant with ATS parsers.</p>
                  </div>
                  <div className="row-scroll-controls">
                    <button
                      type="button"
                      className="scroll-btn"
                      onClick={() => scrollRow(resumeRowRef, "left")}
                      aria-label="Scroll Left"
                    >
                      &larr;
                    </button>
                    <button
                      type="button"
                      className="scroll-btn"
                      onClick={() => scrollRow(resumeRowRef, "right")}
                      aria-label="Scroll Right"
                    >
                      &rarr;
                    </button>
                  </div>
                </div>

                <div className="template-cards-horizontal-strip" ref={resumeRowRef}>
                  {resumeTemplates.map((template) => (
                    <div key={template.id} className="template-community-card">
                      <div className="card-preview-area">
                        <span className="tmpl-badge-tag">{template.badge}</span>
                        {/* Mini Paper Preview */}
                        <div className="card-wireframe-paper">
                          <div className="wire-bar wire-bar-title"></div>
                          <div className="wire-bar wire-bar-blue"></div>
                          <div style={{ height: "1px", background: "var(--color-ash)", marginBlock: "4px" }}></div>
                          <div className="wire-bar wire-bar-full"></div>
                          <div className="wire-bar wire-bar-80"></div>
                          <div className="wire-bar wire-bar-60"></div>
                          <div style={{ height: "6px" }}></div>
                          <div className="wire-bar wire-bar-title" style={{ width: "40%" }}></div>
                          <div className="wire-bar wire-bar-full"></div>
                        </div>
                      </div>

                      <div className="card-meta-area">
                        <h4 className="tmpl-title">{template.title}</h4>
                        <div className="tmpl-role-tag">{template.role}</div>
                        <div className="tmpl-style-text">{template.style}</div>

                        <div className="tmpl-btn-actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setPreviewTemplate(template)}
                          >
                            Preview
                          </button>
                          <Link
                            to={`/builder/new?template=${template.templateKey}`}
                            className="btn btn-primary btn-sm"
                          >
                            Use Template
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. PORTFOLIO TEMPLATES ROW (HORIZONTAL BROWSING) */}
            {(activeCategory === "all" || activeCategory === "portfolio") && portfolioTemplates.length > 0 && (
              <div className="template-row-container" style={{ marginTop: "40px" }}>
                <div className="template-row-header">
                  <div>
                    <h3 className="template-row-title">Portfolio Templates</h3>
                    <p className="template-row-sub">Modern web templates to showcase GitHub repos, demos, and live projects.</p>
                  </div>
                  <div className="row-scroll-controls">
                    <button
                      type="button"
                      className="scroll-btn"
                      onClick={() => scrollRow(portfolioRowRef, "left")}
                      aria-label="Scroll Left"
                    >
                      &larr;
                    </button>
                    <button
                      type="button"
                      className="scroll-btn"
                      onClick={() => scrollRow(portfolioRowRef, "right")}
                      aria-label="Scroll Right"
                    >
                      &rarr;
                    </button>
                  </div>
                </div>

                <div className="template-cards-horizontal-strip" ref={portfolioRowRef}>
                  {portfolioTemplates.map((template) => (
                    <div key={template.id} className="template-community-card">
                      <div className="card-preview-area portfolio-preview-bg">
                        <span className="tmpl-badge-tag">{template.badge}</span>
                        {/* Mini Browser Frame */}
                        <div className="card-wireframe-browser">
                          <div className="wire-browser-dots">
                            <span className="dot dot-red"></span>
                            <span className="dot dot-yellow"></span>
                            <span className="dot dot-green"></span>
                          </div>
                          <div className="wire-browser-body">
                            <div className="wire-avatar-circle"></div>
                            <div className="wire-bar wire-bar-title" style={{ width: "50%" }}></div>
                            <div className="wire-bar wire-bar-60"></div>
                            <div className="wire-bar wire-bar-80"></div>
                          </div>
                        </div>
                      </div>

                      <div className="card-meta-area">
                        <h4 className="tmpl-title">{template.title}</h4>
                        <div className="tmpl-role-tag">{template.role}</div>
                        <div className="tmpl-style-text">{template.style}</div>

                        <div className="tmpl-btn-actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setPreviewTemplate(template)}
                          >
                            Preview
                          </button>
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setPreviewTemplate(template)}
                          >
                            Explore Site
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty Search Result State */}
            {filteredTemplates.length === 0 && (
              <div className="community-empty-state">
                <div className="empty-search-icon">🔍</div>
                <h3>No Templates Found</h3>
                <p>No community templates matched your search query "{searchQuery}".</p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ marginTop: "14px" }}
                  onClick={() => { setSearchQuery(""); setActiveCategory("all"); }}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </section>

        </div>
      </main>

      {/* ==========================================================
           3. TEMPLATE PREVIEW MODAL
           ========================================================== */}
      {previewTemplate && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <span className="tmpl-badge-tag">{previewTemplate.type.toUpperCase()}</span>
                <h3 className="modal-title">{previewTemplate.title}</h3>
                <div style={{ fontSize: "13px", color: "var(--color-pencil)", marginTop: "2px" }}>
                  {previewTemplate.role} &bull; {previewTemplate.style}
                </div>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setPreviewTemplate(null)}
                aria-label="Close Preview"
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-desc">{previewTemplate.description}</p>

              <div className="modal-features-list">
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-fog)", marginBottom: "8px" }}>
                  TEMPLATE HIGHLIGHTS:
                </div>
                {previewTemplate.features?.map((feat, idx) => (
                  <div key={idx} className="modal-feature-item">
                    <span className="feat-check">✓</span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setPreviewTemplate(null)}
              >
                Close Preview
              </button>
              {previewTemplate.type === "resume" ? (
                <Link
                  to={`/builder/new?template=${previewTemplate.templateKey}`}
                  className="btn btn-primary"
                  onClick={() => setPreviewTemplate(null)}
                >
                  Use This Template &rarr;
                </Link>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    setToastType("success");
                    setToastMessage("Portfolio Builder integration preview ready! Coming soon in next update.");
                    setPreviewTemplate(null);
                  }}
                >
                  Launch Portfolio Preview
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ==========================================================
           4. QUICK SCAN / ATS ANALYZER MODAL
           ========================================================== */}
      {quickScanOpen && (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal-card modal-scan-card">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Run AI Resume Analysis</h3>
                <p style={{ fontSize: "13px", color: "var(--color-pencil)" }}>
                  Upload your resume file and paste an optional job description.
                </p>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setQuickScanOpen(false)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleQuickScanSubmit}>
              <div className="modal-body">
                <FileUpload
                  file={scanFile}
                  onFileSelect={(f) => setScanFile(f)}
                  onFileRemove={() => setScanFile(null)}
                />
                <JDInput
                  value={scanJd}
                  onChange={(text) => setScanJd(text)}
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setQuickScanOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!scanFile || scanning}
                >
                  {scanning ? "Analyzing Structure…" : "Run Full ATS Scan &rarr;"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
