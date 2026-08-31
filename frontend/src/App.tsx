import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import { ToastProvider } from "./hooks/useToast";
import { DashboardLayout, RoleRedirect } from "./layouts/DashboardLayout";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";

import { StudentDashboard } from "./pages/student/Dashboard";
import { AssessmentPage } from "./pages/student/Assessment";
import { PracticeListening } from "./pages/student/PracticeListening";
import { PracticeSpeaking } from "./pages/student/PracticeSpeaking";
import { PracticeReading } from "./pages/student/PracticeReading";
import { PracticeWriting } from "./pages/student/PracticeWriting";
import { ConversationPage } from "./pages/student/Conversation";
import { InterviewPage } from "./pages/student/Interview";
import { PresentationPage } from "./pages/student/Presentation";
import { StudentDiscussions } from "./pages/student/Discussions";
import { StudentAssignments } from "./pages/student/Assignments";
import { StudentProgress } from "./pages/student/Progress";
import { StudentReports } from "./pages/student/Reports";
import { StudentProfile } from "./pages/student/Profile";
import { CoachPage } from "./pages/student/Coach";
import { VocabularyPage } from "./pages/student/Vocabulary";
import { StudyPlanPage } from "./pages/student/StudyPlan";

import { TeacherDashboard } from "./pages/teacher/Dashboard";
import { TeacherStudents } from "./pages/teacher/Students";
import { TeacherStudentDetail } from "./pages/teacher/StudentDetail";
import { TeacherAssignments } from "./pages/teacher/Assignments";
import { TeacherDiscussions } from "./pages/teacher/Discussions";
import { TeacherAnalytics } from "./pages/teacher/Analytics";
import { TeacherReports } from "./pages/teacher/Reports";
import { TeacherProfile } from "./pages/teacher/Profile";
import { TeacherInsights } from "./pages/teacher/Insights";
import { AdminConsole } from "./pages/admin/Users";

function roleHome(role: string): string {
  if (role === "admin") return "/admin/users";
  if (role === "teacher") return "/teacher/dashboard";
  return "/student/dashboard";
}

function Protected({ role }: { role: "student" | "teacher" | "admin" }) {
  const { user, token } = useAuth();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    return <Navigate to={roleHome(user.role)} replace />;
  }
  return <DashboardLayout />;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RoleRedirect />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route path="/student" element={<Protected role="student" />}>
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="assessment" element={<AssessmentPage />} />
              <Route path="practice/listening" element={<PracticeListening />} />
              <Route path="practice/speaking" element={<PracticeSpeaking />} />
              <Route path="practice/reading" element={<PracticeReading />} />
              <Route path="practice/writing" element={<PracticeWriting />} />
              <Route path="conversation" element={<ConversationPage />} />
              <Route path="interview" element={<InterviewPage />} />
              <Route path="presentation" element={<PresentationPage />} />
              <Route path="discussions" element={<StudentDiscussions />} />
              <Route path="assignments" element={<StudentAssignments />} />
              <Route path="coach" element={<CoachPage />} />
              <Route path="vocabulary" element={<VocabularyPage />} />
              <Route path="study-plan" element={<StudyPlanPage />} />
              <Route path="progress" element={<StudentProgress />} />
              <Route path="reports" element={<StudentReports />} />
              <Route path="profile" element={<StudentProfile />} />
            </Route>

            <Route path="/teacher" element={<Protected role="teacher" />}>
              <Route index element={<Navigate to="/teacher/dashboard" replace />} />
              <Route path="dashboard" element={<TeacherDashboard />} />
              <Route path="students" element={<TeacherStudents />} />
              <Route path="students/:id" element={<TeacherStudentDetail />} />
              <Route path="assignments" element={<TeacherAssignments />} />
              <Route path="discussions" element={<TeacherDiscussions />} />
              <Route path="analytics" element={<TeacherAnalytics />} />
              <Route path="insights" element={<TeacherInsights />} />
              <Route path="reports" element={<TeacherReports />} />
              <Route path="profile" element={<TeacherProfile />} />
            </Route>

            <Route path="/admin" element={<Protected role="admin" />}>
              <Route index element={<Navigate to="/admin/users" replace />} />
              <Route path="users" element={<AdminConsole />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}