// ProfileView.jsx
// Real user profile page: Firebase Auth + backend profile doc.

import { useEffect, useMemo, useState } from "react";
import {
  User, Mail, Shield, Calendar, Briefcase, GraduationCap,
  FileText, Activity, Edit3, Save, X, Check, RefreshCw,
  AlertCircle, Camera
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { profileApi, resumeApi } from "../api/api";
import "./ProfileView.css";

function initialsFromName(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatDate(value) {
  if (!value) return "\u2014";
  try {
    const d = typeof value === "string" || typeof value === "number" ? new Date(value) : value;
    if (Number.isNaN(d?.getTime?.())) return "\u2014";
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return "\u2014";
  }
}

export default function ProfileView() {
  const { currentUser: user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resumeCount, setResumeCount] = useState(null);
  const [activityCount, setActivityCount] = useState(null);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameMsg, setNameMsg] = useState(null);
  const [statsKey, setStatsKey] = useState(0);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await profileApi.get();
        if (!cancel) setProfile(data || null);
      } catch (err) {
        if (!cancel) setError(err?.response?.data?.detail || err.message || "Failed to load profile.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [resumes] = await Promise.all([resumeApi.list().catch(() => [])]);
        if (!cancel) {
          setResumeCount(Array.isArray(resumes) ? resumes.length : 0);
          setActivityCount(0);
        }
      } catch {
        if (!cancel) { setResumeCount(0); setActivityCount(0); }
      }
    })();
    return () => { cancel = true; };
  }, [statsKey]);

  const displayName = useMemo(() => {
    return (
      profile?.display_name ||
      user?.displayName ||
      (user?.email || "").split("@")[0] ||
      "Anonymous User"
    );
  }, [profile, user]);

  const email = user?.email || "";
  const photoURL = user?.photoURL || "";
  const provider = useMemo(() => {
    const providers = user?.providerData || [];
    if (!providers.length) return "Firebase Auth";
    return providers.map((p) => p.providerId).filter(Boolean).join(", ");
  }, [user]);

  const createdAt = useMemo(() => profile?.created_at || user?.metadata?.creationTime || null, [profile, user]);
  const lastSignIn = useMemo(() => user?.metadata?.lastSignInTime || profile?.last_seen_at || null, [profile, user]);

function startEditName() {
    setDraftName(displayName);
    setEditingName(true);
    setNameMsg(null);
  }

  function cancelEditName() {
    setEditingName(false);
    setDraftName("");
    setNameMsg(null);
  }

  async function saveName() {
    const trimmed = draftName.trim();
    if (!trimmed) {
      setNameMsg({ type: "error", text: "Name cannot be empty." });
      return;
    }
    try {
      setSavingName(true);
      setNameMsg(null);
      const updated = await profileApi.save({ display_name: trimmed });
      setProfile((prev) => ({ ...(prev || {}), ...(updated || {}), display_name: trimmed }));
      setEditingName(false);
      setNameMsg({ type: "success", text: "Name updated." });
    } catch (err) {
      setNameMsg({ type: "error", text: err?.response?.data?.detail || err.message || "Failed to update name." });
    } finally {
      setSavingName(false);
    }
  }

if (loading) {
    return (
      <div className="fg-profile fg-profile--loading" role="status" aria-live="polite">
        <RefreshCw className="fg-spin" size={20} />
        <span>Loading your profile\u2026</span>
      </div>
    );
  }

if (error) {
    return (
      <div className="fg-profile fg-profile--error" role="alert">
        <AlertCircle size={20} />
        <div>
          <h3>Couldn\u2019t load profile</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

return (
    <div className="fg-profile">
      <header className="fg-profile__header">
        <div className="fg-profile__avatar" aria-hidden="true">
          {photoURL ? (
            <img src={photoURL} alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.style.display = "none"; }} />
          ) : null}
          <span className="fg-profile__avatar-initials" data-show-fallback={!photoURL}>
            {initialsFromName(displayName)}
          </span>
          <span className="fg-profile__avatar-badge" title="Photo managed by Firebase Auth">
            <Camera size={12} />
          </span>
        </div>

        <div className="fg-profile__id">
          {editingName ? (
            <div className="fg-profile__name-edit">
              <input type="text" value={draftName} onChange={(e) => setDraftName(e.target.value)} disabled={savingName} maxLength={80} aria-label="Display name" autoFocus onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") cancelEditName(); }} />
              <button className="fg-btn fg-btn--primary" onClick={saveName} disabled={savingName || !draftName.trim()} aria-label="Save name">
                {savingName ? <RefreshCw className="fg-spin" size={14} /> : <Save size={14} />}
              </button>
              <button className="fg-btn fg-btn--ghost" onClick={cancelEditName} disabled={savingName} aria-label="Cancel edit">
                <X size={14} />
              </button>
            </div>
          ) : (
            <div className="fg-profile__name-row">
              <h1>{displayName}</h1>
              <button className="fg-btn fg-btn--ghost fg-btn--icon" onClick={startEditName} aria-label="Edit display name" title="Edit name">
                <Edit3 size={14} />
              </button>
            </div>
          )}

          {nameMsg && (
            <p className={`fg-profile__msg fg-profile__msg--${nameMsg.type}`} role={nameMsg.type === "error" ? "alert" : "status"}>
              {nameMsg.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
              {nameMsg.text}
            </p>
          )}

          <p className="fg-profile__email"><Mail size={14} /> {email || "\u2014"}</p>
          <p className="fg-profile__provider"><Shield size={14} /> {provider}</p>
        </div>
      </header>

<section className="fg-profile__section" aria-labelledby="fg-profile-meta">
        <h2 id="fg-profile-meta"><User size={16} /> Account</h2>
        <dl className="fg-profile__meta">
          <div>
            <dt>User ID</dt>
            <dd><code>{user?.uid || "\u2014"}</code></dd>
          </div>
          <div>
            <dt>Email verified</dt>
            <dd>{user?.emailVerified ? "Yes" : "Not verified"}</dd>
          </div>
          <div>
            <dt>Account created</dt>
            <dd><Calendar size={13} /> {formatDate(createdAt)}</dd>
          </div>
          <div>
            <dt>Last sign-in</dt>
            <dd><Calendar size={13} /> {formatDate(lastSignIn)}</dd>
          </div>
        </dl>
      </section>

      <section className="fg-profile__section" aria-labelledby="fg-profile-stats">
        <h2 id="fg-profile-stats"><Activity size={16} /> Activity</h2>
        <div className="fg-profile__stats">
          <div className="fg-profile__stat">
            <FileText size={20} />
            <div>
              <strong>{resumeCount ?? "\u2014"}</strong>
              <span>Resumes created</span>
            </div>
          </div>
          <div className="fg-profile__stat">
            <Activity size={20} />
            <div>
              <strong>{activityCount ?? "\u2014"}</strong>
              <span>Recent actions</span>
            </div>
          </div>
        </div>
        <button className="fg-btn fg-btn--ghost" onClick={() => setStatsKey((k) => k + 1)} aria-label="Refresh activity">
          <RefreshCw size={14} /> Refresh
        </button>
      </section>

      {(profile?.target_role || profile?.industry || profile?.experience_level) && (
        <section className="fg-profile__section" aria-labelledby="fg-profile-prefs">
          <h2 id="fg-profile-prefs"><Briefcase size={16} /> Job preferences</h2>
          <dl className="fg-profile__meta">
            {profile?.target_role && (<div><dt>Target role</dt><dd>{profile.target_role}</dd></div>)}
            {profile?.industry && (<div><dt>Industry</dt><dd>{profile.industry}</dd></div>)}
            {profile?.experience_level && (<div><dt>Experience level</dt><dd>{profile.experience_level}</dd></div>)}
          </dl>
        </section>
      )}

      {(profile?.education_level || profile?.field_of_study) && (
        <section className="fg-profile__section" aria-labelledby="fg-profile-edu">
          <h2 id="fg-profile-edu"><GraduationCap size={16} /> Education</h2>
          <dl className="fg-profile__meta">
            {profile?.education_level && (<div><dt>Level</dt><dd>{profile.education_level}</dd></div>)}
            {profile?.field_of_study && (<div><dt>Field of study</dt><dd>{profile.field_of_study}</dd></div>)}
          </dl>
        </section>
      )}
    </div>
  );
}

