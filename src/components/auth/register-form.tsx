"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { UserPlus, GraduationCap, Presentation } from "lucide-react";

export function RegisterForm({ role }: { role: "STUDENT" | "TEACHER" }) {
  const { register } = useAuth();
  const router = useRouter();
  const isTeacher = role === "TEACHER";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await register(name, email, password, role);
      router.push(user.role === "TEACHER" ? "/teacher/dashboard" : "/student/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm animate-fade-in-up">
      <div className="mb-8 text-center lg:text-left">
        <span className={`mx-auto flex h-12 w-12 items-center justify-center rounded-2xl shadow-lift lg:mx-0 ${isTeacher ? "bg-gradient-brand" : "bg-gradient-rose"}`}>
          <UserPlus className="h-6 w-6 text-white" />
        </span>
        <h2 className="mt-5 text-3xl font-extrabold">{isTeacher ? "Teacher Registration" : "Student Registration"}</h2>
        <p className="mt-1 text-sm text-ink-500">
          {isTeacher
            ? "Set up your teacher account to manage students and assignments."
            : "You'll get a unique User ID (e.g. BA1024) that tracks all your activity."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-ink-200/70 bg-white p-6 shadow-card">
        {error && <p className="rounded-xl bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700">{error}</p>}
        <div>
          <label htmlFor={`${role}-name`} className="block text-sm font-semibold text-ink-700">Full name</label>
          <input id={`${role}-name`} value={name} onChange={(e) => setName(e.target.value)} required className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
        </div>
        <div>
          <label htmlFor={`${role}-email`} className="block text-sm font-semibold text-ink-700">Email</label>
          <input id={`${role}-email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
        </div>
        <div>
          <label htmlFor={`${role}-password`} className="block text-sm font-semibold text-ink-700">Password (min 8 chars)</label>
          <input id={`${role}-password`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${role === "STUDENT" ? "border-primary-500 bg-primary-50 text-primary-700" : "border-ink-200 text-ink-400"}`}
            onClick={() => router.push("/student/register")}
          >
            <GraduationCap className="h-4 w-4" /> Student
          </button>
          <button
            type="button"
            className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold ${role === "TEACHER" ? "border-primary-500 bg-primary-50 text-primary-700" : "border-ink-200 text-ink-400"}`}
            onClick={() => router.push("/teacher/register")}
          >
            <Presentation className="h-4 w-4" /> Teacher
          </button>
        </div>
        <button
          disabled={loading}
          className={`flex w-full items-center justify-center gap-2 rounded-xl py-3 font-bold text-white shadow-lift transition-all hover:opacity-95 disabled:opacity-60 ${isTeacher ? "bg-gradient-brand" : "bg-gradient-rose"}`}
        >
          {loading ? "Creating account…" : isTeacher ? "Create Teacher Account" : "Create Student Account"}
        </button>
        <p className="text-center text-sm text-ink-500">
          Already registered?{" "}
          <a href="/login" className="font-semibold text-primary-600 hover:underline">Login</a>
        </p>
      </form>
    </div>
  );
}