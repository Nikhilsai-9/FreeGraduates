import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { profileApi } from "../api/api";
import { useAuth } from "../context/AuthContext";
import Loader from "../components/Loader";
import Toast from "../components/Toast";
import "./Onboarding.css";

/**
 * FreeGraduates onboarding wizard.
 *
 * Three short steps that fill in the user's target role, university and
 * skills so the rest of the app (Dashboard, AI Coach, Jobs) can
 * personalise its output.
 */
export default function Onboarding() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [profile, setProfile] = useState({
    targetRole: "",
    targetCompany: "",
    university: "",
    degree: "",
    graduationYear: "",
    yearsExperience: 0,
    skills: "",
    bio: "",
    preferredLocations: "",
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const existing = await profileApi.get();
        if (cancelled || !existing) return;
        setProfile((p) => ({
          ...p,
          targetRole: existing.targetRole || p.targetRole,
          targetCompany: existing.targetCompany || p.targetCompany,
          university: existing.university || p.university,
          degree: existing.degree || p.degree,
          graduationYear: existing.graduationYear || p.graduationYear,
          yearsExperience: typeof existing.yearsExperience === "number" ? existing.yearsExperience : p.yearsExperience,
          skills: Array.isArray(existing.skills) ? existing.skills.join(", ") : p.skills,
          bio: existing.bio || p.bio,
          preferredLocations: Array.isArray(existing.preferredLocations) ? existing.preferredLocations.join(", ") : p.preferredLocations,
        }));
        if (existing.onboardingComplete) navigate("/dashboard", { replace: true });
      } catch (err) {
        console.warn("Could not prefill profile:", err);
      }
    })();
    return () => { cancelled = true; };
  }, [currentUser, navigate]);

  const update = (key, value) => setProfile((p) => ({ ...p, [key]: value }));
  const next = () => setStep((s) => Math.min(3, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const finish = async () => {
    try {
      setLoading(true);
      setToastMessage("");
      const payload = {
        ...profile,
        yearsExperience: Number(profile.yearsExperience) || 0,
        skills: profile.skills.split(",").map((s) => s.trim()).filter(Boolean),
        preferredLocations: profile.preferredLocations.split(",").map((s) => s.trim()).filter(Boolean),
        fullName: currentUser?.displayName || profile.fullName || "",
        email: currentUser?.email || profile.email || "",
        onboardingComplete: true,
      };
      await profileApi.save(payload);
      await profileApi.markOnboarded();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("Save profile error:", err);
      setToastMessage(err.response?.data?.detail || err.message || "Could not save your profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="onboarding-page-wrapper">
      <Toast message={toastMessage} onClose={() => setToastMessage("")} />
      <div className="onboarding-card-large">
        <div className="onboarding-progress-track">
          <div className={`onboarding-step-dot ${step >= 1 ? "done" : ""}`}>1</div>
          <div className={`onboarding-step-line ${step >= 2 ? "done" : ""}`} />
          <div className={`onboarding-step-dot ${step >= 2 ? "done" : ""}`}>2</div>
          <div className={`onboarding-step-line ${step >= 3 ? "done" : ""}`} />
          <div className={`onboarding-step-dot ${step >= 3 ? "done" : ""}`}>3</div>
        </div>
        {loading && <Loader message="Saving your profile..." />}

        {step === 1 && (
          <div className="wizard-step-pane">
            <h2 className="wizard-title-text">Where are you headed?</h2>
            <p className="wizard-subtitle-text">We'll tailor every suggestion to your target role.</p>
            <div className="form-grid-2">
              <Field id="targetRole" label="Target role" placeholder="Software Engineer" value={profile.targetRole} onChange={(v) => update("targetRole", v)} />
              <Field id="targetCompany" label="Target company (optional)" placeholder="Google, any startup" value={profile.targetCompany} onChange={(v) => update("targetCompany", v)} />
              <Field id="university" label="University" placeholder="IIT Bombay" value={profile.university} onChange={(v) => update("university", v)} />
              <Field id="degree" label="Degree" placeholder="B.Tech Computer Science" value={profile.degree} onChange={(v) => update("degree", v)} />
              <Field id="graduationYear" label="Graduation year" placeholder="2026" type="number" value={profile.graduationYear} onChange={(v) => update("graduationYear", v)} />
              <Field id="yearsExperience" label="Years of experience" type="number" value={profile.yearsExperience} onChange={(v) => update("yearsExperience", v)} />
            </div>
            <div className="wizard-actions-row">
              <button type="button" className="btn btn-primary btn-lg" onClick={next}>Continue →</button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="wizard-step-pane">
            <h2 className="wizard-title-text">Your top skills</h2>
            <p className="wizard-subtitle-text">5–10 technologies you're most confident in.</p>
            <div className="form-group">
              <label htmlFor="skills">Skills</label>
              <textarea id="skills" className="form-textarea" rows={4} placeholder="JavaScript, React, Node.js, Python, PostgreSQL, Docker, AWS" value={profile.skills} onChange={(e) => update("skills", e.target.value)} />
            </div>
            <Field id="preferredLocations" label="Preferred locations (optional)" placeholder="Bengaluru, Remote" value={profile.preferredLocations} onChange={(v) => update("preferredLocations", v)} />
            <div className="form-group">
              <label htmlFor="bio">Short bio (optional)</label>
              <textarea id="bio" className="form-textarea" rows={3} placeholder="A one-paragraph intro FreeGraduates can lean on." value={profile.bio} onChange={(e) => update("bio", e.target.value)} />
            </div>
            <div className="wizard-actions-row">
              <button type="button" className="btn btn-secondary" onClick={back}>← Back</button>
              <button type="button" className="btn btn-primary" onClick={next}>Continue →</button>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="wizard-step-pane">
            <h2 className="wizard-title-text">You're all set 🎓</h2>
            <p className="wizard-subtitle-text">We'll use this to personalise resumes, the AI Coach, and job matches.</p>
            <ul className="onboarding-summary-list">
              <li><strong>Target role:</strong> {profile.targetRole || "— pick later"}</li>
              <li><strong>University:</strong> {profile.university || "—"}</li>
              <li><strong>Skills:</strong> {profile.skills || "—"}</li>
            </ul>
            <div className="wizard-actions-row">
              <button type="button" className="btn btn-secondary" onClick={back}>← Back</button>
              <button type="button" className="btn btn-primary btn-lg" onClick={finish} disabled={loading}>
                {loading ? "Saving..." : "Open my dashboard →"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ id, label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <div className="form-group">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} className="form-input" placeholder={placeholder} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
