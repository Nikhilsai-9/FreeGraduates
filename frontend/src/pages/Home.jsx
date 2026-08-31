import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { resumeApi } from "../api/api";
import FileUpload from "../components/FileUpload";
import JDInput from "../components/JDInput";
import Loader from "../components/Loader";
import Toast from "../components/Toast";
import "./Home.css";

export default function Home() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const navigate = useNavigate();

  const isSubmitDisabled = !file || !jobDescription || jobDescription.trim().length < 50 || loading;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitDisabled) return;

    setLoading(true);
    setToastMessage("");

    try {
      const formData = new FormData();
      formData.append("resume", file);
      formData.append("jobDescription", jobDescription.trim());

      const res = await resumeApi.fullAnalyze(formData);

      if (res && res.data) {
        const id = res.data._id || res.data.id;
        navigate(`/results/${id}`);
      } else {
        throw new Error("Invalid response received from server.");
      }
    } catch (err) {
      console.error("Analysis submission error:", err);
      const serverMessage =
        err.response?.data?.message ||
        err.message ||
        "An unexpected error occurred while analyzing your resume.";
      setToastMessage(serverMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-page-container">
      <Loader active={loading} />
      <Toast message={toastMessage} type="error" onClose={() => setToastMessage("")} />

      <div className="container">
        <div className="home-hero-header">
          <div className="badge badge-nice-to-have" style={{ marginBottom: "12px" }}>
            AI-Powered Career Intelligence
          </div>
          <h1 className="home-hero-title">
            Smart Resume & ATS Analysis
          </h1>
          <p className="home-hero-subtitle">
            Upload your resume and paste your target job description. Google Gemini evaluates keyword alignment, computes ATS match scores, and generates actionable bullet rewrites in seconds.
          </p>
        </div>

        <div className="analyzer-form-card ui-card">
          <form onSubmit={handleSubmit}>
            <FileUpload
              file={file}
              onFileSelect={(selected) => setFile(selected)}
              onFileRemove={() => setFile(null)}
            />

            <JDInput
              value={jobDescription}
              onChange={(val) => setJobDescription(val)}
            />

            <div className="form-action-row">
              <button
                type="submit"
                className="btn btn-primary btn-submit-analyze"
                disabled={isSubmitDisabled}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                </svg>
                Analyze Resume & Match JD
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
