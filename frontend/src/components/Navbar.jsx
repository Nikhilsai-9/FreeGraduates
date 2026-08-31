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
    <header className="site-navbar">
      <div className="container navbar-container">
        <Link to="/" className="navbar-brand">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <span className="brand-title">Free<span>Graduates</span></span>
        </Link>

        <nav className="navbar-links">
          <Link
            to="/builder/new"
            className={`nav-item ${location.pathname.startsWith("/builder") ? "active" : ""}`}
          >
            Resume Builder
          </Link>
          <Link
            to="/"
            className={`nav-item ${location.pathname === "/" ? "active" : ""}`}
          >
            ATS Checker
          </Link>
          <Link
            to="/dashboard"
            className={`nav-item ${location.pathname === "/dashboard" ? "active" : ""}`}
          >
            Dashboard
          </Link>
          <Link
            to="/history"
            className={`nav-item ${location.pathname === "/history" ? "active" : ""}`}
          >
            Audit History
          </Link>
        </nav>

        {/* User Auth Actions */}
        <div className="navbar-auth-actions">
          {currentUser ? (
            <div className="user-profile-menu">
              <span className="user-email-tag" title={currentUser.email}>
                {currentUser.displayName || currentUser.email?.split("@")[0]}
              </span>
              <button type="button" className="btn btn-secondary btn-sm" onClick={handleLogout}>
                Sign Out
              </button>
            </div>
          ) : (
            <div className="auth-btn-cluster">
              <Link to="/login" className="btn btn-secondary btn-sm">
                Sign In
              </Link>
              <Link to="/signup" className="btn btn-primary btn-sm">
                Create Account
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
