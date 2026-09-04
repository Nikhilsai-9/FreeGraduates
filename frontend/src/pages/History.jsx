import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText, FolderOpen } from "lucide-react";
import { resumeApi } from "../api/api";
import Toast from "../components/Toast";
import "./History.css";

export default function History() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("error");

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await resumeApi.getHistory();
      if (res && res.data) {
        setHistory(res.data);
      }
    } catch (err) {
      console.error("Error loading history:", err);
      setToastType("error");
      setToastMessage(err.response?.data?.message || err.message || "Failed to load analysis history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id, originalName) => {
    const confirmed = window.confirm(`Are you sure you want to delete the analysis for "${originalName}"?`);
    if (!confirmed) return;

    try {
      setDeletingId(id);
      await resumeApi.deleteById(id);
      setHistory((prev) => prev.filter((item) => item._id !== id));
      setToastType("success");
      setToastMessage(`Analysis for "${originalName}" deleted.`);
    } catch (err) {
      console.error("Error deleting analysis:", err);
      setToastType("error");
      setToastMessage(err.response?.data?.message || err.message || "Failed to delete analysis.");
    } finally {
      setDeletingId(null);
    }
  };

  const getScoreBadgeClass = (score) => {
    if (score >= 75) return "badge-success";
    if (score >= 50) return "badge-important";
    return "badge-critical";
  };

  return (
    <div className="history-page-container">
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage("")} />

      <div className="container">
        <div className="history-header">
          <div>
            <h1 className="history-title">Analysis History</h1>
            <p className="history-subtitle">View and manage your recent resume evaluations.</p>
          </div>
          <Link to="/" className="btn btn-primary">
            + New Analysis
          </Link>
        </div>

        {loading ? (
          <div className="history-loading-box">
            <div className="loader-spinner-ring" style={{ width: 36, height: 36 }}></div>
            <p>Loading history records…</p>
          </div>
        ) : history.length > 0 ? (
          <div className="history-grid">
            {history.map((item) => (
              <div key={item._id} className="ui-card history-card">
                <div className="history-card-top">
                  <div className="history-card-file">
                    <div className="file-icon-badge"><FileText size={18} /></div>
                    <div>
                      <h3 className="history-card-filename">{item.originalName || "Resume Document"}</h3>
                      <div className="history-card-date">
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </div>
                    </div>
                  </div>
                  <div className={`badge ${getScoreBadgeClass(item.matchScore)}`}>
                    Score: {item.matchScore || 0}%
                  </div>
                </div>

                <div className="history-card-verdict">
                  <span className="verdict-tag-label">Verdict:</span> {item.verdict || "Evaluated"}
                </div>

                <div className="history-card-actions">
                  <Link to={`/results/${item._id}`} className="btn btn-secondary btn-sm">
                    View Results
                  </Link>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={deletingId === item._id}
                    onClick={() => handleDelete(item._id, item.originalName)}
                  >
                    {deletingId === item._id ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ui-card empty-history-card">
            <div className="empty-icon"><FolderOpen size={34} /></div>
            <h3>No past analyses found</h3>
            <p>Upload a resume and job description to generate your first ATS analysis.</p>
            <Link to="/" className="btn btn-primary" style={{ marginTop: "18px" }}>
              Start First Analysis
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
