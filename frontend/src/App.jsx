import React, { useMemo, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import ErrorBoundary from "./components/ErrorBoundary";
import Sidebar from "./components/Sidebar";
import DashboardView from "./components/DashboardView";
import ResumeBuilderView from "./components/ResumeBuilderView";
import ResumeAnalyzerView from "./components/ResumeAnalyzerView";
import AtsScannerView from "./components/AtsScannerView";
import OptimizerView from "./components/OptimizerView";
import CoachView from "./components/CoachView";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import History from "./pages/History";
import Results from "./pages/Results";
import Onboarding from "./pages/Onboarding";
import "./App.css";
import "./components/ResumeBuilder.css";

// Map the current URL pathname to the active view id used by the switcher.
// The URL is the single source of truth â€” Sidebar reads & writes it directly.
function viewFromPathname(pathname) {
  if (pathname.startsWith("/builder")) return "builder";
  if (pathname.startsWith("/dashboard")) return "dashboard";
  if (pathname.startsWith("/analyzer")) return "analyzer";
  if (pathname.startsWith("/ats-scanner")) return "ats-checker";
  if (pathname.startsWith("/optimizer")) return "optimizer";
  if (pathname.startsWith("/coach")) return "coach";
  if (pathname.startsWith("/history")) return "history";
  return "dashboard";
}

// Unified Authenticated Workspace Layout
function AuthenticatedWorkspace() {
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  // Derive activeView purely from the URL â€” no duplicate local state.
  const activeView = useMemo(() => viewFromPathname(location.pathname), [location.pathname]);

  // Read ?template= and ?path= from the URL for /builder/new, so deep
  // links like /builder/new?template=classic&path=form still initialize
  // the builder correctly. Defaults match the previous hard-coded values.
  const builderOptions = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const resumeId = location.pathname.match(/^\/builder\/([^/]+)/)?.[1] || null;
    return {
      resumeId: resumeId && resumeId !== "new" ? resumeId : null,
      creationPath: params.get("path") || "form",
      templateStyle: params.get("template") || "classic"
    };
  }, [location.pathname, location.search]);

  return (
    <div className={`unified-app-layout ${collapsed ? "sidebar-collapsed" : ""}`}>
      {/* Left Collapsible Sidebar â€” URL-driven, no shared activeView state. */}
      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        currentUser={currentUser}
        onLogout={logout}
      />

      <div className="unified-main-wrapper">
        <main className={`unified-view-content-area ${activeView === "builder" ? "content-area-full-bleed" : ""}`}>
          <ErrorBoundary>
            {activeView === "dashboard" && (
              <DashboardView currentUser={currentUser} />
            )}

            {activeView === "builder" && (
              <ResumeBuilderView initialOptions={builderOptions} />
            )}

            {activeView === "ats-checker" && (
              <AtsScannerView />
            )}

            {(activeView === "analyzer") && (
              <ResumeAnalyzerView />
            )}
            {activeView === "optimizer" && <OptimizerView />}

            {activeView === "coach" && <CoachView />}

            {activeView === "history" && (
              <div className="history-embedded-container">
                <History />
              </div>
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <Routes>
        {/* Public Landing Page & Auth */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/results/:id" element={<Results />} />
        <Route path="/history" element={<History />} />

        {/* Onboarding wizard â€” full-screen, no sidebar. New users hit this
            immediately after signup until their profile is complete. */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* Protected Unified Workspace â€” URL is the source of truth for the active view. */}
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
        <Route
          path="/analyzer"
          element={
            <ProtectedRoute>
              <AuthenticatedWorkspace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/ats-scanner"
          element={
            <ProtectedRoute>
              <AuthenticatedWorkspace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/optimizer"
          element={
            <ProtectedRoute>
              <AuthenticatedWorkspace />
            </ProtectedRoute>
          }
        />
        <Route
          path="/coach"
          element={
            <ProtectedRoute>
              <AuthenticatedWorkspace />
            </ProtectedRoute>
          }
        />
      </Routes>
      </ErrorBoundary>
    </AuthProvider>
  );
}

