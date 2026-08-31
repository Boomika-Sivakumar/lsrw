import { AuthShell } from "@/components/auth/auth-shell";
import { RegisterForm } from "@/components/auth/register-form";

export default function StudentRegisterPage() {
  return (
    <AuthShell
      brand="Student Portal · LSRW AI"
      tagline="Start your journey to confident communication."
      bullets={[
        { icon: "🧠", title: "Adaptive practice", desc: "Exercises that match your current level" },
        { icon: "🥇", title: "Get certified", desc: "LSRW score, level & detailed reports" },
        { icon: "👥", title: "Group learning", desc: "Live group discussions with AI analysis" },
      ]}
    >
      <RegisterForm role="STUDENT" />
    </AuthShell>
  );
}