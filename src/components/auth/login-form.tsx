"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Sparkles, UserRound, Presentation } from "lucide-react";

const DEMOS: Record<string, { email: string; password: string }> = {
  STUDENT: { email: "student@demo.com", password: "password123" },
  TEACHER: { email: "teacher@demo.com", password: "password123" },
};

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const isTeacher = role === "TEACHER";
  const [email, setEmail] = useState(DEMOS.STUDENT.email);
  const [password, setPassword] = useState(DEMOS.STUDENT.password);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setEmail(DEMOS[role].email);
    setPassword(DEMOS[role].password);
    setError("");
  }, [role]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role !== role) {
        throw new Error(user.role === "TEACHER" ? "This is a teacher account — switch to the Teacher tab." : "This is a student account — switch to the Student tab.");
      }
      router.push(isTeacher ? "/teacher/dashboard" : "/student/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      <div className="mb-8 text-center lg:text-left">
        <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl shadow-lift lg:mx-0 ${isTeacher ? "bg-gradient-brand" : "bg-gradient-rose"}`}>
          {isTeacher ? <Presentation className="h-6 w-6 text-white" /> : <UserRound className="h-6 w-6 text-white" />}
        </span>
        <h2 className="mt-5 text-3xl font-extrabold">Welcome back</h2>
        <p className="mt-1 text-sm text-ink-500">
          {isTeacher ? "Login to the Teacher Portal to manage your classes." : "Login to the Student Portal to continue learning."}
        </p>
      </div>

      {/* ROLE TOGGLE */}
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1">
        <button
          type="button"
          onClick={() => setRole("STUDENT")}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${role === "STUDENT" ? "bg-white text-rose-600 shadow-soft" : "text-ink-500 hover:text-ink-700"}`}
        >
          <UserRound className="h-4 w-4" /> Student
        </button>
        <button
          type="button"
          onClick={() => setRole("TEACHER")}
          className={`flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-bold transition-all ${role === "TEACHER" ? "bg-white text-primary-600 shadow-soft" : "text-ink-500 hover:text-ink-700"}`}
        >
          <Presentation className="h-4 w-4" /> Teacher
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-ink-200/70 bg-white p-6 shadow-card">
        {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>}
        <div>
          <label htmlFor="login-email" className="block text-sm font-semibold text-ink-700">Email</label>
          <input
            id="login-email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <div>
          <label htmlFor="login-password" className="block text-sm font-semibold text-ink-700">Password</label>
          <input
            id="login-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
          />
        </div>
        <button
          disabled={loading}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold text-white shadow-lift transition-all hover:opacity-95 disabled:opacity-60 ${isTeacher ? "bg-gradient-brand" : "bg-gradient-rose"}`}
        >
          {loading ? "Signing in…" : isTeacher ? "Login to Teacher Portal" : "Login to Student Portal"}
          {!loading && <Sparkles className="h-4 w-4" />}
        </button>
        <p className="text-center text-xs text-ink-400">Demo: {DEMOS[role].email} / {DEMOS[role].password}</p>
        <div className="flex items-center justify-between border-t border-ink-100 pt-3 text-xs">
          <button type="button" className="font-semibold text-primary-600 hover:underline">Forgot password?</button>
          <span className="text-ink-300">·</span>
          <button type="button" onClick={() => setRole(role === "TEACHER" ? "STUDENT" : "TEACHER")} className="font-semibold text-ink-500 hover:text-primary-600">
            {isTeacher ? "Switch to Student →" : "Switch to Teacher →"}
          </button>
        </div>
        <p className="text-center text-sm text-ink-500">
          No account?{" "}
          <a href="/register" className="font-semibold text-primary-600 hover:underline">Create one</a>
        </p>
      </form>
    </div>
  );
}