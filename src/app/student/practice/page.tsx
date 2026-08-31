"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Headphones, Mic, BookOpen, PenLine, ArrowRight, Sparkles, Zap, BarChart3, RefreshCw } from "lucide-react";

interface DashboardData {
  scores?: Record<string, number>;
}

const SKILLS = [
  {
    key: "LISTENING",
    icon: Headphones,
    title: "Listening",
    desc: "Listen carefully and speak what you understood.",
    flow: ["Listen", "Understand", "Speak"],
    href: "/student/practice/listening",
    gradient: "bg-gradient-sky",
    chip: "bg-sky-50 text-sky-600",
    bar: "bg-sky-500",
    metric: "LISTENING",
    metricAlt: "COMPREHENSION",
  },
  {
    key: "SPEAKING",
    icon: Mic,
    title: "Speaking",
    desc: "Get a topic and express your ideas confidently.",
    flow: ["Topic", "Think", "Speak"],
    href: "/student/practice/speaking",
    gradient: "bg-gradient-rose",
    chip: "bg-violet-50 text-violet-600",
    bar: "bg-violet-500",
    metric: "SPEAKING",
    metricAlt: "FLUENCY",
  },
  {
    key: "READING",
    icon: BookOpen,
    title: "Reading",
    desc: "Read sentences aloud and improve pronunciation.",
    flow: ["Read", "Speak", "Improve"],
    href: "/student/practice/reading",
    gradient: "bg-gradient-mint",
    chip: "bg-emerald-50 text-emerald-600",
    bar: "bg-emerald-500",
    metric: "READING",
    metricAlt: "PRONUNCIATION",
  },
  {
    key: "WRITING",
    icon: PenLine,
    title: "Writing",
    desc: "Practice writing sentences in your notebook.",
    flow: ["Read", "Write", "Complete"],
    href: "/student/practice/writing",
    gradient: "bg-gradient-amber",
    chip: "bg-amber-50 text-amber-600",
    bar: "bg-amber-500",
    metric: "WRITING",
    metricAlt: "GRAMMAR",
  },
];

const STEPS = [
  { icon: Sparkles, title: "Choose a skill", desc: "Pick the skill you want to train today." },
  { icon: Zap, title: "Complete the activity", desc: "A short focused AI activity starts instantly." },
  { icon: BarChart3, title: "Get instant feedback", desc: "See your scores and what to improve." },
  { icon: RefreshCw, title: "Improve your next attempt", desc: "Practice again to level up your skills." },
];

export default function PracticeHub() {
  const router = useRouter();
  const [progress, setProgress] = useState<Record<string, number>>({});

  useEffect(() => {
    api<DashboardData>("/api/users/me/dashboard")
      .then((d) => {
        const scores = d.scores ?? {};
        const map: Record<string, number> = {};
        for (const s of SKILLS) {
          const value = scores[s.metric] ?? scores[s.metricAlt] ?? 0;
          if (value > 0) map[s.key] = Math.min(100, Math.round(value));
        }
        setProgress(map);
      })
      .catch(() => {
        /* progress is optional — omit silently */
      });
  }, []);

  return (
    <div className="space-y-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-hero px-6 py-14 text-center shadow-card sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute -left-16 -top-16 h-56 w-56 rounded-full bg-gradient-brand opacity-15 blur-3xl animate-float-slow" />
        <div className="pointer-events-none absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-gradient-sky opacity-15 blur-3xl animate-float" />
        <div className="pointer-events-none absolute right-1/4 top-8 hidden h-8 w-8 rounded-2xl bg-gradient-brand opacity-20 blur-md sm:block" />

        <div className="relative z-10">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-200/80 bg-white px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.15em] text-primary-600 shadow-soft">
            <Sparkles className="h-3.5 w-3.5" /> AI-Powered LSRW Practice
          </span>
          <h1 className="mx-auto mt-5 max-w-3xl font-display text-4xl font-extrabold leading-tight text-ink-900 sm:text-5xl">
            Practice Your <span className="text-gradient">Communication Skills</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-ink-500">
            Build stronger Listening, Speaking, Reading and Writing skills with short, focused AI-powered activities.
          </p>
          <p className="mt-2 text-sm font-medium text-ink-400">Choose a skill and start practicing.</p>
        </div>
      </section>

      {/* SKILL CARDS */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-ink-400">Choose a skill to practice</h2>
        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          {SKILLS.map((s, i) => {
            const pct = progress[s.key];
            return (
              <button
                key={s.key}
                onClick={() => router.push(s.href)}
                style={{ animationDelay: `${i * 60}ms` }}
                className="group relative overflow-hidden rounded-2xl border border-ink-200/70 bg-white p-6 text-left shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-primary-200 hover:shadow-lift animate-fade-in-up"
                aria-label={`Start ${s.title} practice`}
              >
                <div className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-10 blur-2xl ${s.gradient}`} />

                <div className="relative z-10">
                  <div className="flex items-start justify-between">
                    <span className={`flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-soft transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-3 ${s.gradient}`}>
                      <s.icon className="h-7 w-7" />
                    </span>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${s.chip}`}>{s.key}</span>
                  </div>

                  <h3 className="mt-4 font-display text-2xl font-extrabold text-ink-900 transition-colors group-hover:text-primary-700">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{s.desc}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-1.5">
                    {s.flow.map((step, j) => (
                      <Fragment key={step}>
                        <span className="rounded-md bg-ink-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-500 transition-colors group-hover:bg-primary-50 group-hover:text-primary-700">
                          {step}
                        </span>
                        {j < s.flow.length - 1 && <ArrowRight className="h-3 w-3 text-ink-300" />}
                      </Fragment>
                    ))}
                  </div>

                  {pct !== undefined && (
                    <div className="mt-4">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-ink-400">
                        <span>Progress</span>
                        <span className="font-mono font-bold text-ink-600">{pct}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                        <div className={`h-full rounded-full transition-all duration-700 ${s.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  <div className={`mt-5 flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white shadow-soft transition-transform duration-200 group-hover:scale-[1.02] ${s.gradient}`}>
                    START {s.title.toUpperCase()}
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* HOW PRACTICE WORKS */}
      <section>
        <h2 className="text-sm font-bold uppercase tracking-[0.15em] text-ink-400">How practice works</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, i) => (
            <div key={step.title} className="relative rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card">
              <span className="absolute right-4 top-4 font-display text-3xl font-extrabold text-ink-100">{i + 1}</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                <step.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-3 text-sm font-bold text-ink-800">{step.title}</h3>
              <p className="mt-1 text-xs leading-relaxed text-ink-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}