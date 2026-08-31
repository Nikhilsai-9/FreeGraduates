import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { resumeApi } from "../api/api";
import { useAuth } from "../context/AuthContext";
import Toast from "../components/Toast";
import "./Dashboard.css";

export default function Dashboard() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState("error");
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const loadResumes = async () => {
    try {
      setLoading(true);
      const res = await resumeApi.getResumes();
      if (res && res.data) {
        setResumes(res.data);
      }
    } catch (err) {
      console.error("Error loading resumes:", err);
      setToastType("error");
      setToastMessage(err.response?.data?.message || err.message || "Failed to load dashboard resumes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadResumes();
  }, []);

  const handleDelete = async (id, title) => {
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

  const handleDuplicate = async (resume) => {
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
        loadResumes();
      }
    } catch (err) {
      setToastType("error");
      setToastMessage(err.message || "Failed to duplicate resume.");
    }
  };

  return (
    <div className="dashboard-page-container">
      <Toast message={toastMessage} type={toastType} onClose={() => setToastMessage("")} />

      <div className="container">
        <div className="dashboard-header-bar">
          <div>
            <h1 className="dash-title">
              Welcome, {currentUser?.displayName || currentUser?.email?.split("@")[0] || "Graduate"}!
            </h1>
            <p className="dash-subtitle">Manage your saved resumes, custom templates, and AI optimizations.</p>
          </div>
          <Link to="/builder/new" className="btn btn-primary btn-lg">
            + Build New Resume
          </Link>
        </div>

        {loading ? (
          <div className="dashboard-loading-box">
            <div className="loader-spinner-ring" style={{ width: 44, height: 44 }}></div>
            <p>Loading your resume dashboard…</p>
          </div>
        ) : resumes.length > 0 ? (
          <div className="dashboard-resumes-grid">
            {resumes.map((resume) => (
              <div key={resume._id} className="ui-card resume-dash-card">
                <div className="dash-card-preview-window" onClick={() => navigate(`/builder/${resume._id}`)}>
                  <span className="template-name-tag">{resume.templateId || "Modern"} Template</span>
                  <div className="mini-paper-preview">
                    <div className="wire-name">{resume.personalInfo?.fullName || "Candidate Name"}</div>
                    <div className="wire-role">{resume.targetRole || "Software Engineer"}</div>
                    <div className="wire-lines">
                      <div className="wire-l1"></div>
                      <div className="wire-l2"></div>
                      <div className="wire-l3"></div>
                    </div>
                  </div>
                </div>

                <div className="dash-card-body">
                  <h3 className="resume-card-title" onClick={() => navigate(`/builder/${resume._id}`)}>
                    {resume.title || "Untitled Resume"}
                  </h3>
                  <div className="resume-card-meta">
                    Updated {new Date(resume.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                  </div>

                  <div className="resume-card-actions">
                    <Link to={`/builder/${resume._id}`} className="btn btn-primary btn-sm" style={{ flexGrow: 1 }}>
                      Edit Resume
                    </Link>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleDuplicate(resume)}
                      title="Duplicate Resume"
                    >
                      Duplicate
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger btn-sm"
                      onClick={() => handleDelete(resume._id, resume.title)}
                      title="Delete Resume"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ui-card empty-dash-card">
            <div className="empty-dash-icon">📄</div>
            <h2>No Resumes Built Yet</h2>
            <p>Import your LinkedIn PDF, upload an existing resume, or build step-by-step with AI guidance.</p>
            <Link to="/builder/new" className="btn btn-primary btn-lg" style={{ marginTop: "20px" }}>
              Create Your First Resume
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
