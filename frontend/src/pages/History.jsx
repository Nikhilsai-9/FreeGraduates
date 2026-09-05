import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, FolderOpen, Plus, Edit3, Download, Trash2, Clock, Tag } from "lucide-react";
import { resumeApi } from "../api/api";
import Toast from "../components/Toast";
import "./History.css";

/**
 * "My Resumes" workspace — replaces the legacy ATS-analysis history with a
 * proper saved-resumes list backed by the new builder's REST API.
 *
 * Flow:
 *   - List page at `/history` → `GET /api/resume/list`
 *   - Click "Open" / "Edit" → `/builder/:id`
 *   - Click "Export" → `POST /api/resume/{id}/export` (DOCX/PDF/MD)
 *   - Click "Delete" → `DELETE /api/resume/{id}`
 *   - "New Resume" CTA → `/builder/new`
 */
export default function History() {
  const navigate = useNavigate();
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [exportingId, setExportingId] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("error");
  const [search, setSearch] = useState("");

  const loadResumes = useCallback(async () => {
    try {
      setLoading(true);
      const list = await resumeApi.list();
      setResumes(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Error loading resumes:", err);
      setToastType("error");
      setToastMessage(err.response?.data?.detail || err.message || "Failed to load your resumes.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  const handleOpen = (id) => {
    navigate(`/builder/${id}`);
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(`Delete "${item.versionName || "this resume"}"? This cannot be undone.`);
    if (!confirmed) return;

    try {
      setDeletingId(item.id);
      await resumeApi.remove(item.id);
      setResumes((prev) => prev.filter((r) => r.id !== item.id));
      setToastType("success");
      setToastMessage(`Deleted "${item.versionName || "resume"}".`);
    } catch (err) {
      console.error("Error deleting resume:", err);
      setToastType("error");
      setToastMessage(err.response?.data?.detail || err.message || "Failed to delete the resume.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async (item, format) => {
    try {
      setExportingId(item.id);
      await resumeApi.export(item.id, format);
      setToastType("success");
      setToastMessage(`Exported "${item.versionName || "resume"}.${format}"`);
    } catch (err) {
      console.error("Export error:", err);
      setToastType("error");
      setToastMessage(err.response?.data?.detail || err.message || `Could not export ${format.toUpperCase()}.`);
    } finally {
      setExportingId(null);
    }
  };

  const filtered = resumes.filter((r) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      (r.versionName || "").toLowerCase().includes(q) ||
      (r.targetRole || "").toLowerCase().includes(q) ||
      (r.targetCompany || "").toLowerCase().includes(q)
    );
  });

  const totalCount = resumes.length;
  const lastUpdated = resumes[0]?.updatedAt ? new Date(resumes[0].updatedAt) : null;

  return (
    <div className="history-page-container">
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage("")} />

      <div className="container">
        <div className="history-header">
          <div>
            <h1 className="history-title">My Resumes</h1>
            <p className="history-subtitle">
              {totalCount === 0
                ? "You haven't built any resumes yet — create your first one below."
                : `${totalCount} saved ${totalCount === 1 ? "resume" : "resumes"}${
                    lastUpdated
                      ? " · last edited " +
                        lastUpdated.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
                      : ""
                  }`}
            </p>
          </div>
          <div className="history-header-actions">
            <Link to="/builder/new" className="btn btn-primary">
              <Plus size={16} /> New Resume
            </Link>
          </div>
        </div>

        {totalCount > 0 && (
          <div className="history-search-row">
            <input
              type="text"
              className="form-input"
              placeholder="Search by name, role, or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        )}

        {loading ? (
          <div className="history-loading-box">
            <div className="loader-spinner-ring" style={{ width: 36, height: 36 }}></div>
            <p>Loading your resumes...</p>
          </div>
        ) : filtered.length > 0 ? (
          <div className="history-grid">
            {filtered.map((item) => (
              <div key={item.id} className="ui-card history-card">
                <div className="history-card-top">
                  <div className="history-card-file">
                    <div className="file-icon-badge"><FileText size={18} /></div>
                    <div>
                      <h3 className="history-card-filename">{item.versionName || "Untitled resume"}</h3>
                      <div className="history-card-date">
                        <Clock size={12} />
                        <span>
                          {item.updatedAt
                            ? "Updated " + new Date(item.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "Date unknown"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="history-card-badges">
                    {item.targetRole && (
                      <span className="badge badge-success">
                        <Tag size={11} /> {item.targetRole}
                        {item.targetCompany ? " @ " + item.targetCompany : ""}
                      </span>
                    )}
                    {item.templateStyle && (
                      <span className="badge badge-neutral">{item.templateStyle}</span>
                    )}
                  </div>
                </div>

                <div className="history-card-actions">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => handleOpen(item.id)}
                  >
                    <Edit3 size={14} /> Open
                  </button>
                  <div className="export-menu">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={exportingId === item.id}
                      onClick={() => handleExport(item, "docx")}
                      title="Download DOCX"
                    >
                      <Download size={14} /> {exportingId === item.id ? "..." : "DOCX"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={exportingId === item.id}
                      onClick={() => handleExport(item, "pdf")}
                      title="Download PDF"
                    >
                      PDF
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      disabled={exportingId === item.id}
                      onClick={() => handleExport(item, "md")}
                      title="Download Markdown"
                    >
                      MD
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn btn-danger btn-sm"
                    disabled={deletingId === item.id}
                    onClick={() => handleDelete(item)}
                  >
                    <Trash2 size={14} /> {deletingId === item.id ? "..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : totalCount > 0 ? (
          <div className="ui-card empty-history-card">
            <div className="empty-icon"><FolderOpen size={34} /></div>
            <h3>No resumes match "{search}"</h3>
            <p>Try a different search term.</p>
          </div>
        ) : (
          <div className="ui-card empty-history-card">
            <div className="empty-icon"><FolderOpen size={34} /></div>
            <h3>No saved resumes yet</h3>
            <p>Build, save, and re-open resumes from one place.</p>
            <Link to="/builder/new" className="btn btn-primary" style={{ marginTop: "18px" }}>
              <Plus size={16} /> Create Your First Resume
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
