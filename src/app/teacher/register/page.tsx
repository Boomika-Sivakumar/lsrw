import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function TeacherRegisterPage() {
  return (
    <AuthShell
      brand="Teacher Portal · LSRW AI"
      tagline="Bring AI-powered English teaching to your classroom."
      bullets={[
        { icon: "📝", title: "Assignments", desc: "Send targeted LSRW work to individuals or the class" },
        { icon: "🎯", title: "Track outcomes", desc: "Assessments, mock interviews and group discussions" },
        { icon: "📄", title: "PDF reports", desc: "Export student and class reports anytime" },
      ]}
    >
      <RegisterForm role="TEACHER" />
    </AuthShell>
  );
}