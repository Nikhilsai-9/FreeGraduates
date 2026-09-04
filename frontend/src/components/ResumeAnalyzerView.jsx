import React, { useState, useRef } from "react";
import {
  Sparkles,
  Upload,
  Check,
  X,
  CheckCheck,
  Download,
  ArrowLeft,
  FileText,
  TrendingUp,
  AlertCircle,
  RotateCcw
} from "lucide-react";
import html2pdf from "html2pdf.js";
import { generateResumeDiffAnalysis } from "../services/aiEngine";

export default function ResumeAnalyzerView({ onBackToDashboard }) {
  // Step: 'input' | 'diff'
  const [step, setStep] = useState("diff");
  const [jobDescription, setJobDescription] = useState(
    "Senior Full Stack Engineer needed. Required skills: TypeScript, React, Node.js, Kubernetes, Redis, Docker, CI/CD pipelines, distributed systems."
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const documentRef = useRef(null);

  // Base Resume Data
  const [resumeData, setResumeData] = useState({
    personal: {
      fullName: "Nikhil Sai",
      email: "nikhil.sai@freegraduates.com",
      phone: "+1 (555) 432-8901",
      location: "San Francisco, CA",
      linkedin: "linkedin.com/in/nikhilsai",
      github: "github.com/nikhilsai",
      summary: "Software Engineer specializing in scalable fullstack web architectures and distributed systems. Proven ability to optimize API throughput and design intuitive user interfaces."
    },
    experience: [
      {
        id: "exp-1",
        role: "Software Engineering Intern",
        company: "TechNova Cloud Systems",
        location: "Remote",
        startDate: "Jun 2025",
        endDate: "Aug 2025",
        description: "Engineered scalable REST APIs in Node.js and Go, reducing query latency by 34%.\nContainerized microservices using Docker and automated CI/CD pipelines via GitHub Actions.\nCollaborated with UI team to build accessible React dashboards serving 12,000+ daily active users."
      },
      {
        id: "exp-2",
        role: "Undergraduate Research Assistant",
        company: "Autonomous Systems Lab",
        location: "Campus",
        startDate: "Jan 2024",
        endDate: "May 2025",
        description: "Implemented vector search algorithms for real-time sensor anomaly detection in Python.\nBenchmarked model inference times across edge devices, achieving 18fps sustained throughput."
      }
    ],
    skills: ["TypeScript", "JavaScript", "Python", "React.js", "Node.js", "Go", "PostgreSQL", "Docker", "AWS", "Git"]
  });

  // Diff Analysis Data
  const [analysisResult, setAnalysisResult] = useState(() =>
    generateResumeDiffAnalysis(resumeData, jobDescription)
  );

  // Run analysis when triggered
  const handleRunAnalysis = () => {
    setAnalyzing(true);
    setTimeout(() => {
      const result = generateResumeDiffAnalysis(resumeData, jobDescription);
      setAnalysisResult(result);
      setAnalyzing(false);
      setStep("diff");
    }, 400);
  };

  // Toggle individual diff acceptance
  const setDiffStatus = (diffId, status) => {
    setAnalysisResult((prev) => ({
      ...prev,
      diffs: prev.diffs.map((d) => (d.id === diffId ? { ...d, status } : d))
    }));
  };

  // Master Approve All
  const handleApproveAll = () => {
    setAnalysisResult((prev) => ({
      ...prev,
      diffs: prev.diffs.map((d) => ({ ...d, status: "accepted" }))
    }));
  };

  // Master Reject All
  const handleRejectAll = () => {
    setAnalysisResult((prev) => ({
      ...prev,
      diffs: prev.diffs.map((d) => ({ ...d, status: "rejected" }))
    }));
  };

  // Compute accepted counts
  const acceptedCount = analysisResult.diffs.filter((d) => d.status === "accepted").length;
  const totalDiffs = analysisResult.diffs.length;

  // Export PDF with accepted changes
  const handleExportDiffPDF = () => {
    if (!documentRef.current) return;
    setIsExporting(true);
    const opt = {
      margin: 8,
      filename: `${resumeData.personal.fullName.replace(/\s+/g, "_")}_AI_Optimized_Resume.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
    };

    html2pdf()
      .set(opt)
      .from(documentRef.current)
      .save()
      .then(() => setIsExporting(false))
      .catch(() => {
        window.print();
        setIsExporting(false);
      });
  };

  return (
    <div className="analyzer-view-container">
      {/* Top Header Controls */}
      <div className="analyzer-top-bar">
        <div className="analyzer-bar-left">
          <button
            type="button"
            className="btn-back-nav"
            onClick={onBackToDashboard}
          >
            <ArrowLeft size={16} />
            <span>Dashboard</span>
          </button>
          <div className="score-summary-pill">
            <TrendingUp size={15} className="green-icon" />
            <span>ATS Compatibility: <strong>{analysisResult.score}%</strong></span>
          </div>
          <div className="approved-counter-tag">
            {acceptedCount} of {totalDiffs} enhancements approved
          </div>
        </div>

        <div className="analyzer-bar-actions">
          <button
            type="button"
            className="btn-approve-all"
            onClick={handleApproveAll}
          >
            <CheckCheck size={16} />
            <span>Approve All</span>
          </button>
          <button
            type="button"
            className="btn-reject-all"
            onClick={handleRejectAll}
          >
            <RotateCcw size={15} />
            <span>Reset / Reject All</span>
          </button>
          <button
            type="button"
            className="btn-export-pdf"
            onClick={handleExportDiffPDF}
            disabled={isExporting}
          >
            <Download size={16} />
            <span>{isExporting ? "Generating PDF..." : "Export Updated Resume (PDF)"}</span>
          </button>
        </div>
      </div>

      {/* Main Half-Page Split: Left Document / Right Diff Cards */}
      <div className="analyzer-split-grid">
        {/* ==========================================================
             LEFT HALF: DYNAMIC RESUME WITH VISUAL DIFF HIGHLIGHTS
             ========================================================== */}
        <div className="diff-document-pane">
          <div className="diff-pane-legend">
            <span className="legend-item"><span className="legend-dot green"></span> Recommended Addition</span>
            <span className="legend-item"><span className="legend-dot blue"></span> Verb / Keyword Upgrade</span>
            <span className="legend-item"><span className="legend-dot red"></span> Phrasing Replacement</span>
          </div>

          <div className="document-sheet" ref={documentRef}>
            {/* Header */}
            <div className="doc-header">
              <h1 className="doc-name">{resumeData.personal.fullName}</h1>
              <div className="doc-sub">
                {resumeData.personal.email} &bull; {resumeData.personal.phone} &bull; {resumeData.personal.location}
              </div>
              <div className="doc-sub">
                {resumeData.personal.linkedin} &bull; {resumeData.personal.github}
              </div>
            </div>

            {/* Summary with Diff */}
            <div className="doc-sec">
              <div className="doc-sec-title">PROFESSIONAL SUMMARY</div>
              <p className="doc-text">
                {resumeData.personal.summary}
                {/* Diff 1 representation */}
                {(() => {
                  const diff = analysisResult.diffs.find((d) => d.id === "diff-1");
                  if (!diff) return null;
                  if (diff.status === "accepted") {
                    return (
                      <span className="diff-highlight addition accepted">
                        {" "}Specialized in modern web architectures, Kubernetes, and scalable microservices.
                      </span>
                    );
                  }
                  if (diff.status === "pending") {
                    return (
                      <span className="diff-highlight addition pending">
                        {" "}[+ Specialized in modern web architectures, Kubernetes, and scalable microservices]
                      </span>
                    );
                  }
                  return null;
                })()}
              </p>
            </div>

            {/* Experience with Diffs */}
            <div className="doc-sec">
              <div className="doc-sec-title">EXPERIENCE</div>
              <div className="doc-entry">
                <div className="doc-entry-header">
                  <strong>Software Engineering Intern</strong> — TechNova Cloud Systems
                  <span className="doc-date">Jun 2025 – Aug 2025</span>
                </div>
                <ul className="doc-bullets">
                  {/* Bullet 1 with Diff 2 */}
                  <li>
                    {(() => {
                      const diff = analysisResult.diffs.find((d) => d.id === "diff-2");
                      if (diff?.status === "accepted") {
                        return (
                          <span className="diff-highlight verb-upgrade accepted">
                            Architected high-throughput RESTful services and gRPC endpoints in Node.js & Go, slashing p99 latency by 34% across 12M+ monthly queries.
                          </span>
                        );
                      }
                      if (diff?.status === "pending") {
                        return (
                          <>
                            <span className="diff-strike">Engineered scalable REST APIs in Node.js and Go, reducing query latency by 34%.</span>{" "}
                            <span className="diff-highlight verb-upgrade pending">
                              [Architected high-throughput RESTful services and gRPC endpoints in Node.js & Go, slashing p99 latency by 34%]
                            </span>
                          </>
                        );
                      }
                      return "Engineered scalable REST APIs in Node.js and Go, reducing query latency by 34%.";
                    })()}
                  </li>

                  {/* Bullet 2 with Diff 3 */}
                  <li>
                    {(() => {
                      const diff = analysisResult.diffs.find((d) => d.id === "diff-3");
                      if (diff?.status === "accepted") {
                        return (
                          <span className="diff-highlight addition accepted">
                            Automated zero-downtime deployment pipelines using Docker, GitHub Actions, and Kubernetes, reducing release cycles from 2 hours to 8 minutes.
                          </span>
                        );
                      }
                      if (diff?.status === "pending") {
                        return (
                          <>
                            <span className="diff-strike">Containerized microservices using Docker and automated CI/CD pipelines via GitHub Actions.</span>{" "}
                            <span className="diff-highlight addition pending">
                              [+ Automated zero-downtime deployment pipelines using Docker, GitHub Actions, and Kubernetes]
                            </span>
                          </>
                        );
                      }
                      return "Containerized microservices using Docker and automated CI/CD pipelines via GitHub Actions.";
                    })()}
                  </li>

                  <li>Collaborated with UI team to build accessible React dashboards serving 12,000+ daily active users.</li>
                </ul>
              </div>
            </div>

            {/* Skills with Diff */}
            <div className="doc-sec">
              <div className="doc-sec-title">TECHNICAL SKILLS</div>
              <p className="doc-text">
                <strong>Languages & Frameworks: </strong>
                {resumeData.skills.join(", ")}
                {/* Diff 4 Representation */}
                {(() => {
                  const diff = analysisResult.diffs.find((d) => d.id === "diff-4");
                  if (diff?.status === "accepted") {
                    return (
                      <span className="diff-highlight addition accepted">
                        , Kubernetes, Redis, GraphQL
                      </span>
                    );
                  }
                  if (diff?.status === "pending") {
                    return (
                      <span className="diff-highlight addition pending">
                        {" "}[+ Kubernetes, Redis, GraphQL]
                      </span>
                    );
                  }
                  return null;
                })()}
              </p>
            </div>
          </div>
        </div>

        {/* ==========================================================
             RIGHT HALF: INTERACTIVE SUGGESTIONS & PERMISSION CONTROLS
             ========================================================== */}
        <div className="diff-controls-pane">
          <div className="controls-pane-header">
            <h3 className="controls-title">AI Suggestions & Permission Approvals</h3>
            <p className="controls-sub">
              Accept individual edits to merge them into your resume document live.
            </p>
          </div>

          <div className="diff-cards-list">
            {analysisResult.diffs.map((diff, index) => {
              const isAccepted = diff.status === "accepted";
              const isRejected = diff.status === "rejected";
              return (
                <div
                  key={diff.id}
                  className={`diff-approval-card ${diff.status}`}
                >
                  <div className="card-top-row">
                    <span className={`diff-type-badge ${diff.type}`}>
                      {diff.type === "addition" && "+ ADDITION"}
                      {diff.type === "verb_enhancement" && "VERB UPGRADE"}
                      {diff.type === "deletion" && "CONDENSATION"}
                    </span>
                    <span className="diff-step-index">Change #{index + 1}</span>
                  </div>

                  <h4 className="diff-card-title">{diff.title}</h4>
                  <p className="diff-explanation">{diff.explanation}</p>

                  {/* Before / After comparison */}
                  <div className="diff-comparison-box">
                    <div className="diff-compare-item before">
                      <span className="compare-label">CURRENT:</span>
                      <p>{diff.originalText}</p>
                    </div>
                    <div className="diff-compare-item after">
                      <span className="compare-label">PROPOSED ENHANCEMENT:</span>
                      <p>{diff.recommendedText}</p>
                    </div>
                  </div>

                  {/* Accept / Reject Buttons */}
                  <div className="diff-action-buttons">
                    <button
                      type="button"
                      className={`btn-diff-reject ${isRejected ? "active" : ""}`}
                      onClick={() => setDiffStatus(diff.id, "rejected")}
                    >
                      <X size={15} />
                      <span>{isRejected ? "Rejected" : "Reject"}</span>
                    </button>
                    <button
                      type="button"
                      className={`btn-diff-accept ${isAccepted ? "active" : ""}`}
                      onClick={() => setDiffStatus(diff.id, "accepted")}
                    >
                      <Check size={15} />
                      <span>{isAccepted ? "Accepted" : "Accept Change"}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
