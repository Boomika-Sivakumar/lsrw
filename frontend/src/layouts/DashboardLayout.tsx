import React from "react";
import { NavLink, Outlet, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const STUDENT_NAV: NavItem[] = [
  { to: "/student/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/student/assessment", label: "Assessment", icon: "📝" },
  { to: "/student/practice/listening", label: "Listening", icon: "👂" },
  { to: "/student/practice/speaking", label: "Speaking", icon: "🎤" },
  { to: "/student/practice/reading", label: "Reading", icon: "📖" },
  { to: "/student/practice/writing", label: "Writing", icon: "✍️" },
  { to: "/student/conversation", label: "AI Conversation", icon: "💬" },
  { to: "/student/interview", label: "Mock Interview", icon: "🎙️" },
  { to: "/student/presentation", label: "Presentation", icon: "📢" },
  { to: "/student/discussions", label: "Group Discussion", icon: "👥" },
  { to: "/student/assignments", label: "Assignments", icon: "📚" },
  { to: "/student/coach", label: "AI Coach", icon: "🧠" },
  { to: "/student/vocabulary", label: "Vocabulary Builder", icon: "🔤" },
  { to: "/student/study-plan", label: "Study Plan", icon: "🗓️" },
  { to: "/student/progress", label: "Progress", icon: "📈" },
  { to: "/student/reports", label: "Reports", icon: "🗂️" },
  { to: "/student/profile", label: "Profile", icon: "👤" },
];

const TEACHER_NAV: NavItem[] = [
  { to: "/teacher/dashboard", label: "Dashboard", icon: "📊" },
  { to: "/teacher/students", label: "Students", icon: "👩‍🎓" },
  { to: "/teacher/assignments", label: "Assignments", icon: "📚" },
  { to: "/teacher/discussions", label: "Group Discussions", icon: "👥" },
  { to: "/teacher/analytics", label: "Class Analytics", icon: "📈" },
  { to: "/teacher/insights", label: "AI Insights", icon: "🤖" },
  { to: "/teacher/reports", label: "Reports", icon: "🗂️" },
  { to: "/teacher/profile", label: "Profile", icon: "👤" },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/admin/users", label: "User Management", icon: "🛠️" },
];

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const nav = user?.role === "admin" ? ADMIN_NAV : user?.role === "teacher" ? TEACHER_NAV : STUDENT_NAV;
  const area = user?.role === "admin" ? "Admin Console" : user?.role === "teacher" ? "Teacher Console" : "Student Workspace";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
          <span className="text-xl">🎓</span>
          <div>
            <div className="text-sm font-bold text-brand-700">LSRW AI</div>
            <div className="text-[10px] text-slate-400">Communication Platform</div>
          </div>
        </div>
        <nav className="space-y-1 overflow-y-auto p-3" style={{ maxHeight: "calc(100vh - 4rem)" }}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  isActive ? "bg-brand-50 font-medium text-brand-700" : "text-slate-600 hover:bg-slate-50"
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
          <div className="text-sm text-slate-500">{area}</div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-slate-700">{user?.full_name}</div>
              {user?.user_id && (
                <div className="text-xs font-semibold text-brand-600">User ID: {user.user_id}</div>
              )}
            </div>
            <button onClick={handleLogout} className="btn btn-outline">
              Logout
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6" style={{ maxHeight: "calc(100vh - 4rem)" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export function RoleRedirect() {
  const { user, token } = useAuth();
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  const target = user.role === "admin" ? "/admin/users" : user.role === "teacher" ? "/teacher/dashboard" : "/student/dashboard";
  return <Navigate to={target} replace />;
}

