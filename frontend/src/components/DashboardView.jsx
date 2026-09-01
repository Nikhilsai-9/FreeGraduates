import React, { useState } from "react";
import {
  FileText,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  Layers,
  Search,
  ExternalLink,
  Plus,
  Compass
} from "lucide-react";

export default function DashboardView({
  currentUser,
  setActiveView,
  onSelectTemplate
}) {
  const [templateFilter, setTemplateFilter] = useState("all");
  const [templateSearch, setTemplateSearch] = useState("");

  const templates = [
    {
      id: "campus-standard",
      type: "resume",
      name: "Campus Standard",
      category: "Student & Placements",
      style: "Clean Single-Column",
      badge: "Most Popular",
      desc: "Optimized for fresh graduates and internship applications. Highlight coursework and projects."
    },
    {
      id: "sde-minimalist",
      type: "resume",
      name: "SDE Minimalist",
      category: "Software Engineering",
      style: "High Density Tech",
      badge: "ATS 99%",
      desc: "Preferred by top tech hiring teams. Emphasizes system architectures and quantified metrics."
    },
    {
      id: "data-ml-specialist",
      type: "resume",
      name: "Data & ML Specialist",
      category: "AI & Data Science",
      style: "Modern Technical",
      badge: "AI Ready",
      desc: "Designed to spotlight model pipelines, datasets, arXiv preprints, and research algorithms."
    },
    {
      id: "devpulse-portfolio",
      type: "portfolio",
      name: "DevPulse Web Showcase",
      category: "Developer Portfolios",
      style: "Responsive Code Hub",
      badge: "Featured",
      desc: "Showcase GitHub repositories, microservices, and live interactive project sandboxes."
    }
  ];

  const filteredTemplates = templates.filter((t) => {
    const matchesType =
      templateFilter === "all" ||
      (templateFilter === "resume" && t.type === "resume") ||
      (templateFilter === "portfolio" && t.type === "portfolio");
    const matchesSearch =
      !templateSearch ||
      t.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
      t.category.toLowerCase().includes(templateSearch.toLowerCase());
    return matchesType && matchesSearch;
  });

  const userName =
    currentUser?.displayName?.split(" ")[0] ||
    currentUser?.email?.split("@")[0] ||
    "Graduate";

  return (
    <div className="dashboard-view-content">
      {/* Welcome Hero Banner */}
      <section className="dash-hero-card">
        <div className="dash-hero-text">
          <div className="hero-eyebrow-pill">CAREER LAUNCHPAD</div>
          <h2 className="dash-hero-title">
            Welcome back, <span className="hero-name-highlight">{userName}</span>
          </h2>
          <p className="dash-hero-desc">
            Build ATS-compliant resumes, run line-by-line AI audits, and showcase your engineering projects.
          </p>
        </div>

        <div className="dash-hero-actions">
          <button
            type="button"
            className="btn-primary-action"
            onClick={() => setActiveView("builder")}
          >
            <Plus size={16} />
            <span>Create New Resume</span>
          </button>
          <button
            type="button"
            className="btn-secondary-action"
            onClick={() => setActiveView("analyzer")}
          >
            <Sparkles size={16} />
            <span>Analyze Resume</span>
          </button>
        </div>
      </section>

      {/* Metrics Row */}
      <section className="metrics-row-grid">
        <div className="metric-card-box">
          <div className="metric-icon-wrap blue">
            <FileText size={20} />
          </div>
          <div className="metric-data-wrap">
            <div className="metric-value-num">2</div>
            <div className="metric-title-label">Active Resumes</div>
          </div>
        </div>

        <div className="metric-card-box">
          <div className="metric-icon-wrap emerald">
            <TrendingUp size={20} />
          </div>
          <div className="metric-data-wrap">
            <div className="metric-value-num">94%</div>
            <div className="metric-title-label">Top ATS Compatibility</div>
          </div>
        </div>

        <div className="metric-card-box">
          <div className="metric-icon-wrap indigo">
            <Award size={20} />
          </div>
          <div className="metric-data-wrap">
            <div className="metric-value-num">4</div>
            <div className="metric-title-label">Job Matches Evaluated</div>
          </div>
        </div>

        <div className="metric-card-box">
          <div className="metric-icon-wrap violet">
            <Compass size={20} />
          </div>
          <div className="metric-data-wrap">
            <div className="metric-status-pill">Ready to Apply</div>
            <div className="metric-title-label">Target Readiness</div>
          </div>
        </div>
      </section>

      {/* Primary Feature Launchpads */}
      <section className="feature-launch-grid">
        {/* Card 1: Resume Builder */}
        <div className="launchpad-card">
          <div className="launchpad-card-header">
            <div className="launchpad-icon-circle blue">
              <FileText size={22} />
            </div>
            <div>
              <h3 className="launchpad-title">Resume Builder</h3>
              <p className="launchpad-sub">
                Import from LinkedIn, upload existing documents, or use the structured builder with live PDF preview.
              </p>
            </div>
          </div>

          <div className="launchpad-preview-box">
            <div className="mini-resume-paper">
              <div className="wire-line wire-title"></div>
              <div className="wire-line wire-sub"></div>
              <div className="wire-divider"></div>
              <div className="wire-line wire-full"></div>
              <div className="wire-line wire-80"></div>
              <div className="wire-line wire-60"></div>
            </div>
            <div className="launchpad-bullets">
              <div className="bullet-point">✓ 1-Click LinkedIn & File Parsing</div>
              <div className="bullet-point">✓ No JD required to begin</div>
              <div className="bullet-point">✓ Clean standard ATS formatting</div>
            </div>
          </div>

          <div className="launchpad-card-footer">
            <button
              type="button"
              className="btn-launch-primary"
              onClick={() => setActiveView("builder")}
            >
              Open Resume Builder
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Card 2: AI Resume Analyzer & Diff */}
        <div className="launchpad-card">
          <div className="launchpad-card-header">
            <div className="launchpad-icon-circle indigo">
              <Sparkles size={22} />
            </div>
            <div>
              <h3 className="launchpad-title">AI Resume Analyzer & Diff</h3>
              <p className="launchpad-sub">
                Compare your resume against any job description with split-screen visual diffs and line-by-line approval controls.
              </p>
            </div>
          </div>

          <div className="launchpad-preview-box">
            <div className="mini-diff-box">
              <div className="diff-chip green">+ Added 3 target role keywords</div>
              <div className="diff-chip blue">⚡ Upgraded action verbs</div>
              <div className="diff-chip red">✕ Stripped weak passive phrasing</div>
            </div>
            <div className="launchpad-bullets">
              <div className="bullet-point">✓ Side-by-side interactive document diff</div>
              <div className="bullet-point">✓ Accept / Reject permission switches</div>
              <div className="bullet-point">✓ 1-Click Export Approved Resume</div>
            </div>
          </div>

          <div className="launchpad-card-footer">
            <button
              type="button"
              className="btn-launch-primary"
              onClick={() => setActiveView("analyzer")}
            >
              Launch Interactive Analyzer
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>

      {/* Embedded Community & Templates Hub */}
      <section className="embedded-templates-section">
        <div className="embedded-section-header">
          <div>
            <span className="section-eyebrow">COMMUNITY & DESIGNS</span>
            <h3 className="embedded-section-title">Curated Template Library</h3>
            <p className="embedded-section-desc">
              Industry-tested resume formats and developer portfolio layouts.
            </p>
          </div>

          <div className="template-controls-group">
            <div className="template-search-wrap">
              <Search size={15} />
              <input
                type="text"
                placeholder="Search templates..."
                value={templateSearch}
                onChange={(e) => setTemplateSearch(e.target.value)}
              />
            </div>

            <div className="template-pills-row">
              <button
                type="button"
                className={`tmpl-pill ${templateFilter === "all" ? "active" : ""}`}
                onClick={() => setTemplateFilter("all")}
              >
                All
              </button>
              <button
                type="button"
                className={`tmpl-pill ${templateFilter === "resume" ? "active" : ""}`}
                onClick={() => setTemplateFilter("resume")}
              >
                Resumes
              </button>
              <button
                type="button"
                className={`tmpl-pill ${templateFilter === "portfolio" ? "active" : ""}`}
                onClick={() => setTemplateFilter("portfolio")}
              >
                Portfolios
              </button>
            </div>
          </div>
        </div>

        <div className="templates-cards-grid">
          {filteredTemplates.map((t) => (
            <div key={t.id} className="template-widget-card">
              <div className="widget-card-top">
                <span className="template-badge-pill">{t.badge}</span>
                <span className="template-type-label">{t.category}</span>
              </div>

              <h4 className="widget-template-name">{t.name}</h4>
              <p className="widget-template-desc">{t.desc}</p>

              <div className="widget-card-action">
                <button
                  type="button"
                  className="btn-use-template"
                  onClick={() => {
                    if (onSelectTemplate) onSelectTemplate(t.id);
                    setActiveView("builder");
                  }}
                >
                  Use Template
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
