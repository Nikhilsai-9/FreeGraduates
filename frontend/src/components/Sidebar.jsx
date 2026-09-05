import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  CheckCircle2,
  Bot,
  History,
  Wand2,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LifeBuoy
} from "lucide-react";
import Logo from "./Logo";

// Each sidebar item has an explicit route. The sidebar reads `useLocation`
// for active state and calls `navigate()` on click — the URL is the single
// source of truth shared with AuthenticatedWorkspace.
const NAV_GROUPS = [
  {
    label: "Workspace",
    items: [
      { id: "dashboard", path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { id: "builder", path: "/builder/new", label: "Resume Builder", icon: FileText },
      { id: "analyzer", path: "/analyzer", label: "AI Resume Analyzer", icon: Sparkles },
      { id: "ats-checker", path: "/ats-scanner", label: "ATS Scanner", icon: CheckCircle2 }
    ]
  },
  {
    label: "Career Tools",
    items: [
      { id: "optimizer", path: "/optimizer", label: "Resume Optimizer", icon: Wand2 },
      { id: "coach", path: "/coach", label: "AI Coach & Tools", icon: Bot, badge: "Beta" },
      { id: "history", path: "/history", label: "Audit History", icon: History }
    ]
  }
];

function pathMatches(pathname, itemPath) {
  if (itemPath === "/dashboard") return pathname === "/dashboard";
  if (itemPath === "/builder/new") return pathname.startsWith("/builder");
  return pathname === itemPath || pathname.startsWith(itemPath + "/");
}

export default function Sidebar({
  collapsed,
  setCollapsed,
  currentUser,
  onLogout
}) {
  const navigate = useNavigate();
  const location = useLocation();

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

  const displayName =
    currentUser?.displayName || currentUser?.email?.split("@")[0] || "Member";

  const goTo = (path) => {
    if (location.pathname !== path) navigate(path);
  };

  return (
    <aside className={`unified-sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-brand-area">
        <button
          type="button"
          className="brand-logo-button"
          onClick={() => goTo("/dashboard")}
          aria-label="Go to dashboard"
        >
          <Logo showWordmark={!collapsed} size={36} />
        </button>
      </div>

      <nav className="sidebar-nav-container">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="sidebar-nav-group">
            <div className="nav-group-label">
              {!collapsed ? group.label : "\u2014"}
            </div>
            <div className="nav-items-list">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathMatches(location.pathname, item.path);
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`nav-item-btn ${isActive ? "active" : ""}`}
                    onClick={() => goTo(item.path)}
                    aria-current={isActive ? "page" : undefined}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon size={18} className="nav-icon" strokeWidth={isActive ? 2.2 : 1.9} />
                    {!collapsed && <span className="nav-item-label">{item.label}</span>}
                    {!collapsed && item.badge && (
                      <span className="nav-item-badge">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="sidebar-footer-area">
        <div className="sidebar-profile-card">
          <div className="profile-avatar-sm">{getUserInitials()}</div>
          {!collapsed && (
            <div className="profile-meta">
              <span className="profile-name">{displayName}</span>
              <span className="profile-role">FreeGraduates Member</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="sidebar-collapse-toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!collapsed && <span>Collapse</span>}
        </button>

        <button
          type="button"
          className="sidebar-signout-btn"
          onClick={onLogout}
          title={collapsed ? "Sign Out" : undefined}
          aria-label="Sign out"
        >
          <LogOut size={16} />
          {!collapsed && <span>Sign Out</span>}
        </button>

        {!collapsed && (
          <div className="sidebar-help-note">
            <LifeBuoy size={13} />
            <span>Need help? <a href="mailto:support@freegraduates.com">Contact support</a></span>
          </div>
        )}
      </div>
    </aside>
  );
}