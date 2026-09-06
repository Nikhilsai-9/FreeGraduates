// SettingsView.jsx
// Account, security, preferences. Real user data only.

import { useEffect, useMemo, useState } from "react";
import {
  User, Lock, Bell, Palette, LogOut, Mail, Shield,
  RefreshCw, AlertCircle, Check, Moon, Sun, Monitor,
  Save, Trash2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { profileApi } from "../api/api";
import "./SettingsView.css";

const PREF_STORAGE_KEY = "fg.preferences.v1";

const defaultPrefs = {
  theme: "system",
  emailNotifications: true,
  productUpdates: false,
};

function readLocalPrefs() {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const raw = window.localStorage.getItem(PREF_STORAGE_KEY);
    if (!raw) return defaultPrefs;
    return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch {
    return defaultPrefs;
  }
}

function applyTheme(theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (theme === "dark") {
    root.dataset.theme = "dark";
  } else if (theme === "light") {
    root.dataset.theme = "light";
  } else {
    delete root.dataset.theme;
  }
}

export default function SettingsView() {
  const { currentUser: user, logout, resetPassword } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState(null);
  const [prefs, setPrefs] = useState(() => readLocalPrefs());
  const [prefsBusy, setPrefsBusy] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState(null);

  const email = user?.email || "";
  const provider = useMemo(() => {
    const p = user?.providerData || [];
    if (!p.length) return "Firebase Auth";
    return p.map((x) => x.providerId).filter(Boolean).join(", ");
  }, [user]);
  const isPasswordProvider = useMemo(() => {
    return (user?.providerData || []).some((p) => p.providerId === "password");
  }, [user]);

useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await profileApi.get();
        if (!cancel) setProfile(data || null);
      } catch (err) {
        if (!cancel) setError(err?.response?.data?.detail || err.message || "Failed to load settings.");
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

async function handleResetPassword() {
    if (!email) return;
    try {
      setResetBusy(true);
      setResetMsg(null);
      await resetPassword(email);
      setResetMsg({ type: "success", text: `Password reset email sent to ${email}. Check your inbox.` });
    } catch (err) {
      setResetMsg({ type: "error", text: err?.message || "Failed to send reset email." });
    } finally {
      setResetBusy(false);
    }
  }

  function updatePref(key, value) {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }

  async function savePrefs() {
    try {
      setPrefsBusy(true);
      setPrefsMsg(null);
      window.localStorage.setItem(PREF_STORAGE_KEY, JSON.stringify(prefs));
      applyTheme(prefs.theme);
      if (profile && profile.uid) {
        await profileApi.save({
          preferences: {
            emailNotifications: prefs.emailNotifications,
            productUpdates: prefs.productUpdates,
            theme: prefs.theme,
          },
        }).catch(() => {});
      }
      setPrefsMsg({ type: "success", text: "Preferences saved." });
    } catch (err) {
      setPrefsMsg({ type: "error", text: err?.message || "Could not save preferences." });
    } finally {
      setPrefsBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      await logout();
    } catch (err) {
      setDeleteMsg({ type: "error", text: err?.message || "Could not sign out." });
    }
  }

  function handleDeleteRequest() {
    setDeleteMsg({
      type: "error",
      text: "Account deletion isn\u2019t available in-app yet. Please contact support@freegraduates.com to request deletion.",
    });
    setConfirmDelete(false);
  }

if (loading) {
    return (
      <div className="fg-settings fg-settings--loading" role="status" aria-live="polite">
        <RefreshCw className="fg-spin" size={20} />
        <span>Loading settings\u2026</span>
      </div>
    );
  }

if (error) {
    return (
      <div className="fg-settings fg-settings--error" role="alert">
        <AlertCircle size={20} />
        <div>
          <h3>Couldn\u2019t load settings</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

return (
    <div className="fg-settings">
      <header className="fg-settings__header">
        <h1>Settings</h1>
        <p>Manage your account, security, and preferences.</p>
      </header>

      <section className="fg-settings__section" aria-labelledby="fg-settings-account">
        <h2 id="fg-settings-account"><User size={16} /> Account</h2>
        <dl className="fg-settings__meta">
          <div><dt>Email</dt><dd><Mail size={13} /> {email || "\u2014"}</dd></div>
          <div><dt>Display name</dt><dd>{user?.displayName || profile?.display_name || "\u2014"}</dd></div>
          <div><dt>Sign-in method</dt><dd><Shield size={13} /> {provider}</dd></div>
          <div><dt>Email verified</dt><dd>{user?.emailVerified ? "Yes" : "Not verified"}</dd></div>
        </dl>
        <p className="fg-settings__hint">Want to change your name or email? Open <a href="/profile">Profile</a> to update.</p>
      </section>

      <section className="fg-settings__section" aria-labelledby="fg-settings-security">
        <h2 id="fg-settings-security"><Lock size={16} /> Security</h2>
        <div className="fg-settings__row">
          <div>
            <strong>Reset password</strong>
            <p>{isPasswordProvider ? "Send a password reset link to your email." : "You signed up with a social provider. Password reset is managed by that provider."}</p>
          </div>
          <button className="fg-btn fg-btn--ghost" onClick={handleResetPassword} disabled={!email || resetBusy} aria-label="Send password reset email">
            {resetBusy ? <RefreshCw className="fg-spin" size={14} /> : <Mail size={14} />}
            {resetBusy ? "Sending\u2026" : "Send reset email"}
          </button>
        </div>
        {resetMsg && (
          <p className={`fg-settings__msg fg-settings__msg--${resetMsg.type}`} role={resetMsg.type === "error" ? "alert" : "status"}>
            {resetMsg.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
            {resetMsg.text}
          </p>
        )}
      </section>

      <section className="fg-settings__section" aria-labelledby="fg-settings-prefs">
        <h2 id="fg-settings-prefs"><Palette size={16} /> Preferences</h2>

        <div className="fg-settings__field">
          <label className="fg-settings__label"><Palette size={14} /> Theme</label>
          <div className="fg-settings__seg" role="radiogroup" aria-label="Theme">
            {[
              { value: "light", label: "Light", icon: <Sun size={14} /> },
              { value: "system", label: "System", icon: <Monitor size={14} /> },
              { value: "dark", label: "Dark", icon: <Moon size={14} /> },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={prefs.theme === opt.value}
                className={`fg-settings__seg-btn ${prefs.theme === opt.value ? "is-active" : ""}`}
                onClick={() => updatePref("theme", opt.value)}
              >
                {opt.icon}
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="fg-settings__field">
          <label className="fg-settings__toggle">
            <input type="checkbox" checked={prefs.emailNotifications} onChange={(e) => updatePref("emailNotifications", e.target.checked)} />
            <span className="fg-settings__toggle-track" aria-hidden="true"></span>
            <span className="fg-settings__toggle-label">
              <Bell size={14} />
              Email notifications
              <small>Updates when analyses, optimizations, or interviews complete.</small>
            </span>
          </label>
        </div>

        <div className="fg-settings__field">
          <label className="fg-settings__toggle">
            <input type="checkbox" checked={prefs.productUpdates} onChange={(e) => updatePref("productUpdates", e.target.checked)} />
            <span className="fg-settings__toggle-track" aria-hidden="true"></span>
            <span className="fg-settings__toggle-label">
              <Mail size={14} />
              Product updates
              <small>Occasional news about new FreeGraduates features.</small>
            </span>
          </label>
        </div>

        <div className="fg-settings__actions">
          <button className="fg-btn fg-btn--primary" onClick={savePrefs} disabled={prefsBusy}>
            {prefsBusy ? <RefreshCw className="fg-spin" size={14} /> : <Save size={14} />}
            {prefsBusy ? "Saving\u2026" : "Save preferences"}
          </button>
          {prefsMsg && (
            <span className={`fg-settings__msg fg-settings__msg--${prefsMsg.type}`} role={prefsMsg.type === "error" ? "alert" : "status"}>
              {prefsMsg.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
              {prefsMsg.text}
            </span>
          )}
        </div>
      </section>

      <section className="fg-settings__section fg-settings__section--danger" aria-labelledby="fg-settings-danger">
        <h2 id="fg-settings-danger"><LogOut size={16} /> Account actions</h2>
        <div className="fg-settings__row">
          <div>
            <strong>Sign out</strong>
            <p>You\u2019ll need to log back in to access your resumes.</p>
          </div>
          <button className="fg-btn fg-btn--ghost" onClick={handleSignOut}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
        <div className="fg-settings__divider" role="separator"></div>
        <div className="fg-settings__row">
          <div>
            <strong className="fg-settings__danger-title">Delete account</strong>
            <p>Permanently removes your resume history and personal data.</p>
          </div>
          {confirmDelete ? (
            <div className="fg-settings__confirm">
              <button className="fg-btn fg-btn--danger" onClick={handleDeleteRequest}>
                <Trash2 size={14} /> Confirm delete
              </button>
              <button className="fg-btn fg-btn--ghost" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="fg-btn fg-btn--danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={14} /> Delete account
            </button>
          )}
        </div>
        {deleteMsg && (
          <p className={`fg-settings__msg fg-settings__msg--${deleteMsg.type}`} role={deleteMsg.type === "error" ? "alert" : "status"}>
            {deleteMsg.type === "success" ? <Check size={14} /> : <AlertCircle size={14} />}
            {deleteMsg.text}
          </p>
        )}
      </section>
    </div>
  );
}


