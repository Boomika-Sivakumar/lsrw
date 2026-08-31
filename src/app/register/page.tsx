"use client";

import Link from "next/link";
import { GraduationCap, Presentation, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-gradient-dark lg:block">
        <div className="pointer-events-none absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-gradient-brand opacity-25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-gradient-sky opacity-20 blur-3xl" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand">
              <span className="text-lg font-black text-white">◉</span>
            </span>
            <span className="font-display text-base font-extrabold tracking-wide text-white">
              LSRW <span className="text-gradient">AI</span>
            </span>
          </Link>
          <div>
            <h1 className="max-w-md text-4xl font-extrabold leading-tight text-white">
              Create your account & <span className="text-gradient">start practicing</span>.
            </h1>
            <div className="mt-8 space-y-4">
              {[
                ["🎯", "Know your level", "Personalized assessment after every session"],
                ["🤖", "AI feedback", "Strengths, weaknesses & next steps"],
                ["📈", "Track progress", "See before → after across every skill"],
              ].map(([icon, t, d]) => (
                <div key={t} className="flex items-center gap-4">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-xl">{icon}</span>
                  <div>
                    <p className="font-bold text-white">{t}</p>
                    <p className="text-sm text-ink-300">{d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-ink-400">Demo: student@demo.com / password123 · teacher@demo.com / password123</p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-ink-50 px-4 py-12">
        <div className="w-full max-w-md animate-fade-in-up">
          <h2 className="text-center text-3xl font-extrabold">Create your account</h2>
          <p className="mt-1 text-center text-sm text-ink-500">Choose the account type that fits you.</p>
          <div className="mt-8 space-y-4">
            <Link
              href="/student/register"
              className="group flex items-center gap-4 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary-400"
            >
              <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-rose shadow-lift">
                <GraduationCap className="h-7 w-7 text-white" />
              </span>
              <div className="flex-1">
                <p className="text-lg font-extrabold text-ink-900">Student</p>
                <p className="text-sm text-ink-500">Practice with AI coaching, take assessments and track your progress</p>
              </div>
              <ArrowRight className="h-5 w-5 text-ink-300 transition-transform group-hover:translate-x-1 group-hover:text-primary-600" />
            </Link>
            <Link
              href="/teacher/register"
              className="group flex items-center gap-4 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card transition-all hover:-translate-y-0.5 hover:border-primary-400"
            >
              <span className="flex h-14 w-14 flex-none items-center justify-center rounded-2xl bg-gradient-brand shadow-lift">
                <Presentation className="h-7 w-7 text-white" />
              </span>
              <div className="flex-1">
                <p className="text-lg font-extrabold text-ink-900">Teacher</p>
                <p className="text-sm text-ink-500">Manage students, assignments, assessments and analytics</p>
              </div>
              <ArrowRight className="h-5 w-5 text-ink-300 transition-transform group-hover:translate-x-1 group-hover:text-primary-600" />
            </Link>
          </div>
          <p className="mt-6 text-center text-sm text-ink-500">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary-600 hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}