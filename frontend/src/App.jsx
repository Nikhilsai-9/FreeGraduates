import React, { useState } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import DashboardView from "./components/DashboardView";
import ResumeBuilderView from "./components/ResumeBuilderView";
import ResumeAnalyzerView from "./components/ResumeAnalyzerView";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import History from "./pages/History";
import Results from "./pages/Results";
import "./App.css";

// Unified Authenticated Workspace Layout
function AuthenticatedWorkspace() {
  const { currentUser, logout } = useAuth();
  const [activeView, setActiveView] = useState("dashboard"); // 'dashboard' | 'builder' | 'analyzer' | 'ats-checker' | 'coach' | 'history'
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className={`unified-app-layout ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* 1. Left Collapsible Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onLogout={logout}
      />

      {/* 2. Main Right Container */}
      <div className="unified-main-wrapper">
        {/* Top Header with 3-line Hamburger Menu */}
        <Header
          activeView={activeView}
          setActiveView={setActiveView}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          currentUser={currentUser}
          onLogout={logout}
        />

        {/* View Switcher Container */}
        <main className="unified-view-content-area">
          {activeView === "dashboard" && (
            <DashboardView
              currentUser={currentUser}
              setActiveView={setActiveView}
            />
          )}

          {activeView === "builder" && (
            <ResumeBuilderView
              onBackToDashboard={() => setActiveView("dashboard")}
            />
          )}

          {activeView === "analyzer" && (
            <ResumeAnalyzerView
              onBackToDashboard={() => setActiveView("dashboard")}
            />
          )}

          {activeView === "ats-checker" && (
            <ResumeAnalyzerView
              onBackToDashboard={() => setActiveView("dashboard")}
            />
          )}

          {activeView === "coach" && (
            <div className="coach-placeholder-panel">
              <div className="coach-inner-box">
                <div className="badge-pill">AI CAREER COACH & TOOLS</div>
                <h2>Interactive STAR Interview Simulator & Behavioral Guidance</h2>
                <p>
                  Practice engineering behavioral questions, salary negotiation, and system design prompts with real-time feedback.
                </p>
                <button
                  type="button"
                  className="btn-primary-action"
                  onClick={() => setActiveView("builder")}
                >
                  Return to Resume Builder
                </button>
              </div>
            </div>
          )}

          {activeView === "history" && (
            <div className="history-embedded-container">
              <History />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public Landing Page & Auth */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/history" element={<History />} />

        {/* Protected Unified Dashboard Workspace */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AuthenticatedWorkspace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/builder/new"
          element={
            <ProtectedRoute>
              <AuthenticatedWorkspace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/builder/:id"
          element={
            <ProtectedRoute>
              <AuthenticatedWorkspace />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
