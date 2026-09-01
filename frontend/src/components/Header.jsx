import React, { useState, useRef, useEffect } from "react";
import {
  Menu,
  Bell,
  Search,
  User,
  LogOut,
  Sparkles,
  FileText,
  History,
  Check
} from "lucide-react";

export default function Header({
  activeView,
  setActiveView,
  collapsed,
  setCollapsed,
  currentUser,
  onLogout
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const titles = {
    dashboard: "Career Dashboard",
    builder: "Resume Builder",
    analyzer: "AI Resume Analyzer & Diff",
    "ats-checker": "ATS Compatibility Scanner",
    coach: "AI Career Coach",
    history: "Audit & Analysis History"
  };

  const getUserInitials = () => {
    if (currentUser?.displayName) {
      const parts = currentUser.displayName.trim().split(" ");
      return parts.length >= 2
        ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
        : parts[0].slice(0, 2).toUpperCase();
    }
    if (currentUser?.email) {
      return currentUser.email.slice(0, 2).toUpperCase();
    }
    return "FG";
  };

  const notifications = [
    {
      id: 1,
      title: "Interactive Diff Ready",
      desc: "Review line-by-line ATS suggested enhancements and approvals.",
      time: "Just now",
      unread: true
    },
    {
      id: 2,
      title: "LinkedIn Import Activated",
      desc: "You can now parse your full profile with 1-click import.",
      time: "2h ago",
      unread: true
    }
  ];

  return (
    <header className="unified-top-header">
      {/* Left: Hamburger Toggle & View Title */}
      <div className="header-left-cluster">
        <button
          type="button"
          className="hamburger-toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
          aria-label="Toggle Sidebar"
          title="Toggle Sidebar Navigation"
        >
          <Menu size={20} />
        </button>

        <div className="header-title-wrapper">
          <span className="header-crumb-eyebrow">FreeGraduates</span>
          <h1 className="header-active-title">{titles[activeView] || "Dashboard"}</h1>
        </div>
      </div>

      {/* Center: Quick Search */}
      <div className="header-search-bar">
        <Search size={16} className="search-icon" />
        <input
          type="text"
          placeholder="Search tools, templates, keywords..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="header-right-cluster">
        {/* Notification Bell */}
        <div className="notif-wrapper" ref={notifRef}>
          <button
            type="button"
            className="header-icon-btn"
            onClick={() => setNotifOpen(!notifOpen)}
            aria-label="Notifications"
          >
            <Bell size={18} />
            <span className="notif-dot"></span>
          </button>

          {notifOpen && (
            <div className="notif-popover">
              <div className="notif-popover-header">
                <span>Notifications</span>
                <span className="notif-count-pill">2 new</span>
              </div>
              <div className="notif-popover-list">
                {notifications.map((n) => (
                  <div key={n.id} className="notif-popover-item">
                    <div className="notif-item-title">{n.title}</div>
                    <div className="notif-item-desc">{n.desc}</div>
                    <div className="notif-item-time">{n.time}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar */}
        <div className="profile-wrapper" ref={profileRef}>
          <button
            type="button"
            className="header-profile-btn"
            onClick={() => setProfileOpen(!profileOpen)}
            aria-label="User Menu"
          >
            <div className="avatar-circle">{getUserInitials()}</div>
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
                <div className="user-email-dim">{currentUser?.email || "member@freegraduates.com"}</div>
              </div>

              <div className="profile-menu-divider"></div>

              <button
                type="button"
                className="profile-menu-item"
                onClick={() => {
                  setActiveView("builder");
                  setProfileOpen(false);
                }}
              >
                <FileText size={15} />
                <span>Resume Builder</span>
              </button>

              <button
                type="button"
                className="profile-menu-item"
                onClick={() => {
                  setActiveView("analyzer");
                  setProfileOpen(false);
                }}
              >
                <Sparkles size={15} />
                <span>AI Resume Analyzer</span>
              </button>

              <button
                type="button"
                className="profile-menu-item"
                onClick={() => {
                  setActiveView("history");
                  setProfileOpen(false);
                }}
              >
                <History size={15} />
                <span>Audit History</span>
              </button>

              <div className="profile-menu-divider"></div>

              <button
                type="button"
                className="profile-menu-item logout-danger"
                onClick={onLogout}
              >
                <LogOut size={15} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
