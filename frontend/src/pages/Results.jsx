import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { resumeApi } from "../api/api";
import ScoreCircle from "../components/ScoreCircle";
import KeywordChips from "../components/KeywordChips";
import SuggestionCard from "../components/SuggestionCard";
import ParsedDataView from "../components/ParsedDataView";
import Toast from "../components/Toast";
import "./Results.css";

export default function Results() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    async function fetchAnalysis() {
      try {
        setLoading(true);
        setError("");
        const res = await resumeApi.getById(id);
        if (res && res.data) {
          setData(res.data);
        } else {
          throw new Error("Analysis data not found.");
        }
      } catch (err) {
        console.error("Error fetching analysis:", err);
        setError(err.response?.data?.message || err.message || "Failed to load analysis record.");
      } finally {
        setLoading(false);
      }
    }

    if (id) {
      fetchAnalysis();
    }
  }, [id]);

  if (loading) {
    return (
      <div className="container results-loading-box">
        <div className="loader-spinner-ring" style={{ width: 44, height: 44 }}></div>
        <p>Loading analysis results…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container results-error-box">
        <Toast message={error} type="error" onClose={() => setError("")} />
        <h2>Unable to load analysis</h2>
        <p>{error || "The requested analysis could not be found."}</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: "16px" }}>
          Start New Analysis
        </Link>
      </div>
    );
  }

  const subScores = data?.subScores || { skills: 0, experience: 0, education: 0, keywordDensity: 0 };
  const overallFeedback = data?.overallFeedback || { strengths: [], weaknesses: [], quickWins: [] };
  const skillGaps = Array.isArray(data?.skillGaps) ? data.skillGaps : [];

  return (
    <div className="results-page-container">
      {/* Sticky Header Section */}
      <section className="results-sticky-header">
        <div className="container header-flex-row">
          <div className="header-score-group">
            <ScoreCircle score={data?.matchScore || 0} size={104} strokeWidth={9} />
            <div className="header-verdict-block">
              <span className="verdict-eyebrow">Recruiter Verdict</span>
              <h2 className="verdict-title">{data?.verdict || "Match Evaluated"}</h2>
              <div className="resume-meta-name">
                {data?.originalName || "Uploaded Resume"} &bull;{" "}
                {new Date(data?.createdAt || Date.now()).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
              </div>
            </div>
          </div>

          <div className="header-actions no-print">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => window.print()}
              title="Print or Save as PDF"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print / Save PDF
            </button>
            <Link to="/" className="btn btn-primary">
              + New Analysis
            </Link>
          </div>
        </div>
      </section>

      {/* Main Tabbed Content Container */}
      <div className="container results-content-body">
        {/* Navigation Tabs */}
        <div className="tab-nav no-print" role="tablist">
          <button
            className={`tab-btn ${activeTab === "overview" ? "active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            Overview & Sub-Scores
          </button>
          <button
            className={`tab-btn ${activeTab === "keywords" ? "active" : ""}`}
            onClick={() => setActiveTab("keywords")}
          >
            Keywords ({(data?.matchedKeywords || []).length} / {(data?.missingKeywords || []).length})
          </button>
          <button
            className={`tab-btn ${activeTab === "skillGaps" ? "active" : ""}`}
            onClick={() => setActiveTab("skillGaps")}
          >
            Skill Gaps ({skillGaps.length})
          </button>
          <button
            className={`tab-btn ${activeTab === "suggestions" ? "active" : ""}`}
            onClick={() => setActiveTab("suggestions")}
          >
            Fix Suggestions ({(data?.bulletRewrites || []).length})
          </button>
          <button
            className={`tab-btn ${activeTab === "parsed" ? "active" : ""}`}
            onClick={() => setActiveTab("parsed")}
          >
            Parsed Resume Data
          </button>
        </div>

        {/* Tab 1: Overview */}
        {activeTab === "overview" && (
          <div className="tab-pane">
            {/* Sub-Score Bars Grid */}
            <div className="ui-card sub-scores-card">
              <h3 className="card-heading">ATS Dimension Sub-Scores</h3>
              <div className="sub-scores-grid">
                <div className="sub-score-item">
                  <div className="sub-score-header">
                    <span>Skills Match</span>
                    <strong>{subScores?.skills || 0}%</strong>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-bar-fill fill-blue"
                      style={{ width: `${subScores?.skills || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="sub-score-item">
                  <div className="sub-score-header">
                    <span>Experience Level</span>
                    <strong>{subScores?.experience || 0}%</strong>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-bar-fill fill-green"
                      style={{ width: `${subScores?.experience || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="sub-score-item">
                  <div className="sub-score-header">
                    <span>Education Fit</span>
                    <strong>{subScores?.education || 0}%</strong>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-bar-fill fill-purple"
                      style={{ width: `${subScores?.education || 0}%` }}
                    ></div>
                  </div>
                </div>

                <div className="sub-score-item">
                  <div className="sub-score-header">
                    <span>Keyword & ATS Density</span>
                    <strong>{subScores?.keywordDensity || 0}%</strong>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-bar-fill fill-amber"
                      style={{ width: `${subScores?.keywordDensity || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Strengths, Weaknesses & Quick Wins */}
            <div className="feedback-columns-grid">
              {/* Strengths */}
              <div className="ui-card feedback-col-card card-strengths">
                <h4 className="feedback-col-title text-success">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  Candidate Strengths
                </h4>
                <ul className="feedback-list">
                  {(overallFeedback?.strengths || []).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="ui-card feedback-col-card card-weaknesses">
                <h4 className="feedback-col-title text-danger">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                  Identified Gaps
                </h4>
                <ul className="feedback-list">
                  {(overallFeedback?.weaknesses || []).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Quick Wins */}
              <div className="ui-card feedback-col-card card-quickwins">
                <h4 className="feedback-col-title text-primary">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                  Quick Wins
                </h4>
                <ul className="feedback-list">
                  {(overallFeedback?.quickWins || []).map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Keywords */}
        {activeTab === "keywords" && (
          <div className="tab-pane">
            <KeywordChips
              matched={data?.matchedKeywords}
              missing={data?.missingKeywords}
            />
          </div>
        )}

        {/* Tab 3: Skill Gaps */}
        {activeTab === "skillGaps" && (
          <div className="tab-pane">
            <div className="skill-gaps-grid">
              {skillGaps.length > 0 ? (
                skillGaps.map((gap, i) => (
                  <div key={i} className="ui-card skill-gap-card">
                    <h4 className="skill-gap-category">{gap?.category || "Skill Category"}</h4>
                    <div className="skill-gap-missing-block">
                      <span className="gap-label">Missing Skills:</span>
                      <div className="chips-row">
                        {(gap?.missing || []).map((m, mIdx) => (
                          <span key={mIdx} className="badge badge-critical">{m}</span>
                        ))}
                      </div>
                    </div>
                    {gap?.suggestion && (
                      <div className="skill-gap-suggestion">
                        <strong>Recommendation:</strong> {gap.suggestion}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="ui-card empty-card">
                  <p>No critical skill gaps found for this job description!</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 4: Fix Suggestions */}
        {activeTab === "suggestions" && (
          <div className="tab-pane">
            <SuggestionCard
              bulletRewrites={data?.bulletRewrites}
              layoutSuggestions={data?.layoutSuggestions}
            />
          </div>
        )}

        {/* Tab 5: Parsed Data */}
        {activeTab === "parsed" && (
          <div className="tab-pane">
            <ParsedDataView data={data?.parsedData} />
          </div>
        )}
      </div>
    </div>
  );
}
