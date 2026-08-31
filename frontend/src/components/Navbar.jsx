import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./Navbar.css";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  return (
    <header className="site-header" role="banner">
      <div className="container nav-container">
        {/* Brand Logo */}
        <Link to="/" className="brand-logo-group" aria-label="FreeGraduates Home">
          <div className="brand-logo-mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 20V4h14" />
              <path d="M5 12h10" />
              <path d="M12 4l7 7" />
            </svg>
          </div>
          <span className="brand-logo-name">Free<span>Graduates</span></span>
        </Link>

        {/* Center Links */}
        <nav role="navigation" aria-label="Main Navigation">
          <ul className="nav-links">
            <li>
              {location.pathname === "/" ? (
                <a href="#resume" className="nav-link">Resume</a>
              ) : (
                <Link to="/builder/new" className="nav-link">Resume</Link>
              )}
            </li>
            <li>
              {location.pathname === "/" ? (
                <a href="#coach" className="nav-link">AI Coach</a>
              ) : (
                <Link to="/" className="nav-link">AI Coach</Link>
              )}
            </li>
            <li>
              {location.pathname === "/" ? (
                <a href="#interview" className="nav-link">Interview</a>
              ) : (
                <Link to="/" className="nav-link">Interview</Link>
              )}
            </li>
            <li>
              {location.pathname === "/" ? (
                <a href="#ats" className="nav-link">ATS Checker</a>
              ) : (
                <Link to="/" className="nav-link">ATS Checker</Link>
              )}
            </li>
            <li>
              {location.pathname === "/" ? (
                <a href="#portfolio" className="nav-link">Portfolio</a>
              ) : (
                <Link to="/" className="nav-link">Portfolio</Link>
              )}
            </li>
            <li>
              {location.pathname === "/" ? (
                <a href="#jobs" className="nav-link">Jobs</a>
              ) : (
                <Link to="/" className="nav-link">Jobs</Link>
              )}
            </li>
          </ul>
        </nav>

        {/* Right Actions: Login & Get Started Free */}
        <div className="nav-actions">
          {currentUser ? (
            <div className="user-profile-menu">
              <Link to="/dashboard" className="nav-login-btn" style={{ marginRight: '8px' }}>
                Dashboard
              </Link>
              <span className="user-email-tag" title={currentUser.email}>
                {currentUser.displayName || currentUser.email?.split("@")[0]}
              </span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          ) : (
            <>
              <Link to="/login" className="nav-login-btn" id="navLoginBtn">Login</Link>
              <div className="nav-divider" aria-hidden="true"></div>
              <Link to="/signup" className="btn btn-primary btn-sm">Get Started Free</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
