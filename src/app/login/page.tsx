"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useEffect } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace(user.role === "TEACHER" ? "/teacher/dashboard" : "/student/dashboard");
  }, [user, loading, router]);

  return (
    <AuthShell
      brand="Student & Teacher Portal · LSRW AI"
      tagline="One login for students and teachers. Choose your role and sign in."
      bullets={[
        { icon: "🎓", title: "Student Portal", desc: "Practice, assignments, mock interviews & progress" },
        { icon: "🧑‍🏫", title: "Teacher Portal", desc: "Question banks, assignments, results & analytics" },
        { icon: "🤖", title: "AI every step", desc: "Feedback, scoring and insights across both portals" },
      ]}
    >
      <LoginForm />
    </AuthShell>
  );
}