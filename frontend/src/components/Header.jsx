import React, { useState, useRef, useEffect } from "react";
import { Menu, Bell, LogOut, ChevronLeft } from "lucide-react";

export default function Header({
  activeView,
  setActiveView,
  collapsed,
  setCollapsed,
  currentUser,
  onLogout
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [avatarImgError, setAvatarImgError] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setAvatarImgError(false); }, [currentUser?.uid]);

  const titles = {
    dashboard: "Dashboard",
    builder: "Resume Builder",
    analyzer: "AI Resume Analyzer",
    "ats-checker": "ATS Scanner",
    optimizer: "AI Resume Optimizer",
    coach: "AI Coach & Tools",
    history: "Audit History"
  };

  const getUserInitials = () => {
    if (currentUser?.displayName) {
      const parts = currentUser.displayName.trim().split(" ");
      return parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    if (currentUser?.email) return currentUser.email.slice(0, 2).toUpperCase();
    return "FG";
  };

  const photoURL = (() => {
    if (!currentUser) return null;
    const url = currentUser.photoURL || currentUser.avatar || currentUser.profileImage || null;
    if (!url || typeof url !== "string" || url.trim() === "") return null;
    return url;
  })();

  return (
    <header className="unified-top-header">
      <div className="header-left-cluster">
        <button
          type="button"
          className="hamburger-toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle Sidebar"
        >
          {collapsed ? <Menu size={18} /> : <ChevronLeft size={18} />}
        </button>

        <div className="header-title-wrapper">
          <span className="header-crumb-eyebrow">FreeGraduates</span>
          <h1 className="header-active-title">{titles[activeView] || "Dashboard"}</h1>
        </div>
      </div>

      <div className="header-right-cluster">
        <div className="notif-wrapper">
          <button type="button" className="header-icon-btn" aria-label="Notifications">
            <Bell size={16} />
            <span className="notif-dot"></span>
          </button>
        </div>

        <div className="profile-wrapper" ref={profileRef}>
          <button
            type="button"
            className="header-profile-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="User Menu"
          >
            {photoURL && !avatarImgError ? (
              <img
                src={photoURL}
                alt={currentUser?.displayName || "Profile"}
                className="avatar-circle avatar-img"
                onError={() => setAvatarImgError(true)}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="avatar-circle">{getUserInitials()}</div>
            )}
            <span className="profile-name-text">
              {currentUser?.displayName || currentUser?.email?.split("@")[0] || "Member"}
            </span>
          </button>

          {profileOpen && (
            <div className="profile-menu-popover">
              <div className="profile-menu-header">
                <div className="user-name-bold">
                  {currentUser?.displayName || "FreeGraduates Member"}
                </div>
                <div className="user-email-dim">{currentUser?.email || ""}</div>
              </div>
              <div className="profile-menu-divider"></div>
              <button type="button" className="profile-menu-item" onClick={onLogout}>
                <LogOut size={14} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
