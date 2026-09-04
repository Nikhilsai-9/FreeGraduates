import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);

  const profileRef = useRef(null);
  const notifRef = useRef(null);

  const isHomePage = location.pathname === "/";

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdowns when route changes
  useEffect(() => {
    setProfileDropdownOpen(false);
    setNotificationOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      setProfileDropdownOpen(false);
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const handleNavClick = (anchorId) => {
    closeMobileMenu();
    if (!isHomePage) {
      navigate(`/#${anchorId}`);
    }
  };

  // Get user display initials
  const getUserInitials = () => {
    if (currentUser?.displayName) {
      const parts = currentUser.displayName.trim().split(" ");
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (currentUser?.email) {
      return currentUser.email.substring(0, 2).toUpperCase();
    }
    return "FG";
  };

  // Mock notifications for UI architecture
  const notifications = [
    {
      id: 1,
      title: "Welcome to FreeGraduates",
      desc: "Start by creating your first ATS-ready resume or running an analysis.",
      time: "Just now",
      unread: true
    },
    {
      id: 2,
      title: "New Templates Added",
      desc: "Check out the new SDE Minimalist and Data Science templates in Community.",
      time: "1h ago",
      unread: true
    },
    {
      id: 3,
      title: "Complete Your Profile",
      desc: "Add your degree and target role for personalized ATS recommendations.",
      time: "1d ago",
      unread: false
    }
  ];

  return (
    <>
      <header className="site-header" role="banner">
        <div className="nav-container-fluid">
          {/* Brand Logo - Aligned to Left Corner */}
          <Link to="/" className="brand-logo-group" aria-label="FreeGraduates Home" onClick={closeMobileMenu}>
            <div className="brand-logo-mark">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 23V9h14M9 16h10M15 9l8 8" />
              </svg>
            </div>
            <span className="brand-logo-name">Free<span>Graduates</span></span>
          </Link>

          {/* Center Navigation Links (when not on dashboard or as general nav) */}
          <nav role="navigation" aria-label="Main Navigation" className="desktop-main-nav">
            <ul className="nav-links">
              {currentUser && (
                <li>
                  <Link
                    to="/dashboard"
                    className={`nav-link ${location.pathname === "/dashboard" ? "active-nav" : ""}`}
                  >
                    Dashboard
                  </Link>
                </li>
              )}
              <li>
                <Link
                  to="/builder/new"
                  className={`nav-link ${location.pathname.startsWith("/builder") ? "active-nav" : ""}`}
                >
                  Resume Builder
                </Link>
              </li>
              <li>
                {isHomePage ? (
                  <a href="#ats" className="nav-link">ATS Checker</a>
                ) : (
                  <Link to="/#ats" className="nav-link" onClick={() => handleNavClick("ats")}>ATS Checker</Link>
                )}
              </li>
              <li>
                {isHomePage ? (
                  <a href="#templates" className="nav-link">Community</a>
                ) : (
                  <Link to="/dashboard" className="nav-link">Community</Link>
                )}
              </li>
              <li>
                {isHomePage ? (
                  <a href="#coach" className="nav-link">AI Coach</a>
                ) : (
                  <Link to="/#coach" className="nav-link" onClick={() => handleNavClick("coach")}>AI Coach</Link>
                )}
              </li>
              <li>
                {isHomePage ? (
                  <a href="#interview" className="nav-link">Interview</a>
                ) : (
                  <Link to="/#interview" className="nav-link" onClick={() => handleNavClick("interview")}>Interview</Link>
                )}
              </li>
              <li>
                {isHomePage ? (
                  <a href="#jobs" className="nav-link">Jobs</a>
                ) : (
                  <Link to="/#jobs" className="nav-link" onClick={() => handleNavClick("jobs")}>Jobs</Link>
                )}
              </li>
            </ul>
          </nav>

          {/* Right Actions: Notifications & Profile in Top Right Corner */}
          <div className="nav-actions">
            {currentUser ? (
              <div className="nav-authenticated-cluster">
                {/* Notification Bell */}
                <div className="notif-dropdown-wrapper" ref={notifRef}>
                  <button
                    type="button"
                    className="notif-btn"
                    aria-label="Notifications"
                    onClick={() => setNotificationOpen(!notificationOpen)}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                    </svg>
                    <span className="notif-badge-dot"></span>
                  </button>

                  {/* Notification Popover */}
                  {notificationOpen && (
                    <div className="notif-popover-panel">
                      <div className="notif-header">
                        <span className="notif-title">Notifications</span>
                        <span className="notif-count">2 unread</span>
                      </div>
                      <div className="notif-list">
                        {notifications.map((item) => (
                          <div key={item.id} className={`notif-item ${item.unread ? "unread" : ""}`}>
                            <div className="notif-item-title">{item.title}</div>
                            <div className="notif-item-desc">{item.desc}</div>
                            <div className="notif-item-time">{item.time}</div>
                          </div>
                        ))}
                      </div>
                      <div className="notif-footer">
                        <button type="button" className="notif-mark-read" onClick={() => setNotificationOpen(false)}>
                          Close
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Circular Profile Avatar & Dropdown */}
                <div className="profile-dropdown-wrapper" ref={profileRef}>
                  <button
                    type="button"
                    className="profile-avatar-btn"
                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                    aria-label="User Profile Menu"
                    aria-expanded={profileDropdownOpen}
                  >
                    {currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="Profile" className="user-avatar-circle user-avatar-img" />
                    ) : (
                      <div className="user-avatar-circle">{getUserInitials()}</div>
                    )}
                    <span className="profile-name-snippet">
                      {currentUser.displayName || currentUser.email?.split("@")[0]}
                    </span>
                    <svg className="dropdown-arrow-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {/* Profile Dropdown Menu */}
                  {profileDropdownOpen && (
                    <div className="profile-menu-dropdown">
                      <div className="dropdown-user-header">
                        <div className="dropdown-user-name">
                          {currentUser.displayName || "FreeGraduates Member"}
                        </div>
                        <div className="dropdown-user-email">{currentUser.email}</div>
                      </div>

                      <div className="dropdown-divider"></div>

                      <Link to="/dashboard" className="dropdown-menu-item" onClick={() => setProfileDropdownOpen(false)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7" />
                          <rect x="14" y="3" width="7" height="7" />
                          <rect x="14" y="14" width="7" height="7" />
                          <rect x="3" y="14" width="7" height="7" />
                        </svg>
                        Dashboard
                      </Link>

                      <Link to="/builder/new" className="dropdown-menu-item" onClick={() => setProfileDropdownOpen(false)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        Resume Builder
                      </Link>

                      <Link to="/history" className="dropdown-menu-item" onClick={() => setProfileDropdownOpen(false)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 14 14" />
                        </svg>
                        Audit History
                      </Link>

                      <div className="dropdown-divider"></div>

                      <button
                        type="button"
                        className="dropdown-menu-item dropdown-logout-btn"
                        onClick={handleLogout}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                          <polyline points="16 17 21 12 16 7" />
                          <line x1="21" y1="12" x2="9" y2="12" />
                        </svg>
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <Link to="/login" className="nav-login-btn" id="navLoginBtn">Login</Link>
                <div className="nav-divider" aria-hidden="true"></div>
                <Link to="/signup" className="btn btn-primary btn-sm">Get Started Free</Link>
              </>
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="mobile-menu-toggle"
            id="mobileMenuToggle"
            aria-label="Toggle Menu"
            aria-expanded={mobileMenuOpen}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileMenuOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </>
              )}
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`mobile-nav-drawer ${mobileMenuOpen ? "active" : ""}`} id="mobileNavDrawer" role="dialog" aria-modal="true">
        <ul className="mobile-nav-links">
          {currentUser && (
            <li>
              <Link to="/dashboard" onClick={closeMobileMenu}>Dashboard</Link>
            </li>
          )}
          <li>
            <Link to="/builder/new" onClick={closeMobileMenu}>Resume Builder</Link>
          </li>
          <li>
            <a href={isHomePage ? "#ats" : "/#ats"} onClick={() => handleNavClick("ats")}>ATS Checker</a>
          </li>
          <li>
            <a href={isHomePage ? "#templates" : "/#templates"} onClick={() => handleNavClick("templates")}>Templates & Community</a>
          </li>
          <li>
            <a href={isHomePage ? "#coach" : "/#coach"} onClick={() => handleNavClick("coach")}>AI Career Coach</a>
          </li>
          <li>
            <a href={isHomePage ? "#interview" : "/#interview"} onClick={() => handleNavClick("interview")}>AI Interview</a>
          </li>
          <li>
            <a href={isHomePage ? "#portfolio" : "/#portfolio"} onClick={() => handleNavClick("portfolio")}>Portfolio Builder</a>
          </li>
          <li>
            <a href={isHomePage ? "#jobs" : "/#jobs"} onClick={() => handleNavClick("jobs")}>Jobs & Internships</a>
          </li>
          <li>
            <a href={isHomePage ? "#opensource" : "/#opensource"} onClick={() => handleNavClick("opensource")}>Open Source</a>
          </li>
        </ul>
        <div className="mobile-nav-actions">
          {currentUser ? (
            <button type="button" className="btn btn-secondary" style={{ width: "100%" }} onClick={handleLogout}>
              Sign Out
            </button>
          ) : (
            <>
              <Link to="/login" className="btn btn-secondary" style={{ width: "100%" }} onClick={closeMobileMenu}>
                Login
              </Link>
              <Link to="/signup" className="btn btn-primary" style={{ width: "100%" }} onClick={closeMobileMenu}>
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </div>
    </>
  );
}
