import React from "react";
import {
  LayoutDashboard,
  FileText,
  Sparkles,
  CheckCircle2,
  Bot,
  History,
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import Logo from "./Logo";

export default function Sidebar({
  activeView,
  setActiveView,
  collapsed,
  setCollapsed,
  onLogout
}) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "builder", label: "Resume Builder", icon: FileText },
    { id: "analyzer", label: "AI Resume Analyzer", icon: Sparkles },
    { id: "ats-checker", label: "ATS Scanner", icon: CheckCircle2 },
    { id: "coach", label: "AI Coach & Tools", icon: Bot, badge: "Beta" },
    { id: "history", label: "Audit History", icon: History }
  ];

  return (
    <aside className={`unified-sidebar ${collapsed ? "collapsed" : ""}`}>
      {/* Brand Header */}
      <div className="sidebar-brand-area">
        <button
          type="button"
          className="brand-logo-button"
          onClick={() => setActiveView("dashboard")}
        >
          <Logo showWordmark={!collapsed} size={36} />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="sidebar-nav-container">
        <div className="nav-group-label">{!collapsed ? "WORKSPACE" : "•"}</div>
        <div className="nav-items-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`nav-item-btn ${isActive ? "active" : ""}`}
                onClick={() => setActiveView(item.id)}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={19} className="nav-icon" />
                {!collapsed && <span className="nav-item-label">{item.label}</span>}
                {!collapsed && item.badge && (
                  <span className="nav-item-badge">{item.badge}</span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Sidebar Footer & Collapse Toggle */}
      <div className="sidebar-footer-area">
        <button
          type="button"
          className="sidebar-collapse-toggle-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          {!collapsed && <span>Collapse Sidebar</span>}
        </button>

        <button
          type="button"
          className="sidebar-signout-btn"
          onClick={onLogout}
          title={collapsed ? "Sign Out" : undefined}
        >
          <LogOut size={18} />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
