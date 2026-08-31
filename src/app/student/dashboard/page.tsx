"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { ScoreRing } from "@/components/ui/score-ring";
import { SkillCard, type SkillData } from "@/components/skill-card";
import { AIInsightCard } from "@/components/ai-insight-card";
import { PracticeCard, type PracticeTile } from "@/components/practice-card";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { PageSkeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/page-header";
import { metricLabel, deriveStrengths, deriveWeaknesses, buildRecommendation } from "@/lib/insights";
import { ArrowRight, Flame, Sparkles, TrendingUp } from "lucide-react";

interface DashboardData {
  level: string | null;
  overall: number;
  scores: Record<string, number>;
  recentSessions: { id: string; skill: string; topic: string | null; completedAt: string | null; overallScore: number | null }[];
}

const DETAIL_METRICS = ["GRAMMAR", "VOCABULARY", "PRONUNCIATION", "FLUENCY", "COMPREHENSION", "CONFIDENCE", "PARTICIPATION"];

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    api<DashboardData>("/api/users/me/dashboard").then(setData).catch(console.error);
  }, [user, loading, router]);

  const skillCards = useMemo<SkillData[]>(() => {
    const s = data?.scores ?? {};
    return [
      {
        icon: "🎧", name: "Listening", score: s.LISTENING ?? 0,
        gradient: "bg-gradient-sky", bar: "bg-gradient-sky",
        submetrics: [{ label: "Comprehension", value: s.COMPREHENSION ?? 0 }, { label: "Listening", value: s.LISTENING ?? 0 }],
        href: "/practice/listening",
      },
      {
        icon: "🎤", name: "Speaking", score: s.SPEAKING ?? 0,
        gradient: "bg-gradient-rose", bar: "bg-gradient-rose",
        submetrics: [
          { label: "Fluency", value: s.FLUENCY ?? 0 },
          { label: "Pronunciation", value: s.PRONUNCIATION ?? 0 },
          { label: "Confidence", value: s.CONFIDENCE ?? 0 },
        ],
        href: "/practice/speaking",
      },
      {
        icon: "📖", name: "Reading", score: s.READING ?? 0,
        gradient: "bg-gradient-mint", bar: "bg-gradient-mint",
        submetrics: [{ label: "Comprehension", value: s.COMPREHENSION ?? 0 }, { label: "Reading", value: s.READING ?? 0 }],
        href: "/practice/reading",
      },
      {
        icon: "✍️", name: "Writing", score: s.WRITING ?? 0,
        gradient: "bg-gradient-amber", bar: "bg-gradient-amber",
        submetrics: [
          { label: "Grammar", value: s.GRAMMAR ?? 0 },
          { label: "Vocabulary", value: s.VOCABULARY ?? 0 },
        ],
        href: "/practice/writing",
      },
    ];
  }, [data]);

  const quickPractice: PracticeTile[] = [
    { icon: "🎧", title: "Listening Practice", subtitle: "Improve comprehension", href: "/practice/listening", gradient: "bg-gradient-sky", glow: "bg-cyan-200/60" },
    { icon: "🎤", title: "Speaking Practice", subtitle: "Talk with AI", href: "/practice/speaking", gradient: "bg-gradient-rose", glow: "bg-pink-200/60" },
    { icon: "📖", title: "Reading Practice", subtitle: "Improve comprehension", href: "/practice/reading", gradient: "bg-gradient-mint", glow: "bg-emerald-200/60" },
    { icon: "✍️", title: "Writing Practice", subtitle: "Improve professional writing", href: "/practice/writing", gradient: "bg-gradient-amber", glow: "bg-amber-200/60" },
  ];

  if (!user) return null;
  if (loading || !data) return <PageSkeleton />;

  const strengths = deriveStrengths(data.scores);
  const weaknesses = deriveWeaknesses(data.scores);
  const recommendation = buildRecommendation(data.scores);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Student Dashboard"
        title={`${greeting()}, ${user.name} 👋`}
        subtitle="Ready to improve your communication today?"
        icon={<TrendingUp className="h-6 w-6" />}
        right={
          <div className="flex items-center gap-2 rounded-2xl border border-primary-200 bg-white px-4 py-2.5 shadow-soft">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">User ID</p>
              <p className="font-mono text-sm font-extrabold text-primary-600">{user.userId}</p>
            </div>
            <CopyButton value={user.userId} />
          </div>
        }
      />

      {/* AI SCORE */}
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="relative overflow-hidden lg:col-span-1">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-brand opacity-10 blur-3xl" />
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink-400">AI Communication Score</p>
            <div className="mt-5">
              <ScoreRing value={data.overall} size={190} from="#6366F1" to="#8B5CF6">
                <span className="font-display text-5xl font-extrabold text-ink-900">{data.overall}</span>
                <span className="text-sm font-semibold text-ink-400">/ 100</span>
              </ScoreRing>
            </div>
            <p className="mt-4 text-lg font-extrabold capitalize text-primary-600">{data.level ?? "Beginner"}</p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-100 text-[10px]">↑</span>
              8% from last month
            </p>
            <Link href="/student/assessments" className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700 transition-colors hover:bg-primary-100">
              Re-assess <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Recent Practice Sessions" subtitle="Your latest AI-analyzed activity" icon="📈" right={<Link href="/student/progress" className="text-xs font-bold text-primary-600 hover:underline">View progress</Link>} />
          <div className="p-5">
            {data.recentSessions.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-ink-200 p-10 text-center">
                <p className="text-3xl">🎤</p>
                <p className="mt-2 text-sm font-semibold text-ink-700">No speaking sessions yet.</p>
                <p className="mt-1 text-xs text-ink-400">Start your first AI conversation.</p>
                <Link href="/student/practice" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-lift">
                  Start Practicing <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {data.recentSessions.slice(0, 6).map((s) => (
                  <li key={s.id} className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-3 transition-colors hover:bg-primary-50">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{s.skill === "LISTENING" ? "🎧" : s.skill === "SPEAKING" ? "🎤" : s.skill === "READING" ? "📖" : "✍️"}</span>
                      <div>
                        <p className="text-sm font-bold text-ink-800">{s.skill} {s.topic ? `— ${s.topic}` : "Session"}</p>
                        {s.completedAt && <p className="text-[11px] text-ink-400">{new Date(s.completedAt).toLocaleString()}</p>}
                      </div>
                    </div>
                    <Badge tone={s.overallScore && s.overallScore >= 80 ? "success" : s.overallScore && s.overallScore >= 60 ? "primary" : "warning"}>
                      {s.overallScore ?? "—"}%
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </section>

      {/* LSRW SKILL CARDS */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-extrabold">LSRW Skill Performance</h2>
          <Link href="/student/progress" className="text-sm font-bold text-primary-600 hover:underline">Full analytics →</Link>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {skillCards.map((skill) => <SkillCard key={skill.name} skill={skill} />)}
        </div>
      </section>

      {/* DETAILED METRICS */}
      <Card>
        <CardHeader title="Communication Metrics" subtitle="Detailed breakdown across key skills" icon="🎯" />
        <div className="grid gap-x-10 gap-y-5 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {DETAIL_METRICS.map((m, i) => {
            const v = data.scores[m] ?? 0;
            const bar =
              v >= 80 ? "bg-emerald-500" : v >= 60 ? "bg-gradient-brand" : v >= 40 ? "bg-amber-500" : "bg-red-400";
            return (
              <div key={m} className="animate-fade-in-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink-700">{metricLabel(m)}</span>
                  <span className="font-mono font-bold text-ink-900">{v}%</span>
                </div>
                <ProgressBar value={v} color={bar} />
              </div>
            );
          })}
        </div>
      </Card>

      {/* AI INSIGHTS */}
      <section className="grid gap-6 lg:grid-cols-3">
        <AIInsightCard icon="✨" title="Your Strengths" tone="strength" items={strengths.length ? strengths.map((x) => `Strong ${x.toLowerCase()}`) : ["Strong foundation forming — keep practicing daily"]} />
        <AIInsightCard icon="⚠️" title="Areas to Improve" tone="warning" items={weaknesses.length ? weaknesses.map((x) => `${x} accuracy`) : ["Consistency across sessions", "Pushing into harder topics"]} />
        <Card className="relative overflow-hidden border-violet-200/70 bg-violet-50/60 p-6">
          <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-rose opacity-20 blur-2xl" />
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-brand text-white shadow-soft"><Sparkles className="h-4 w-4" /></span>
            <h3 className="text-sm font-bold uppercase tracking-wide text-violet-700">💡 AI Recommendation</h3>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-ink-700">{recommendation}</p>
          <Link href="/student/practice" className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-brand py-3 text-sm font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5">
            Start Recommended Practice <ArrowRight className="h-4 w-4" />
          </Link>
        </Card>
      </section>

      {/* QUICK PRACTICE + DAILY CHALLENGE */}
      <section className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h2 className="mb-4 text-xl font-extrabold">Quick Practice</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {quickPractice.map((tile) => <PracticeCard key={tile.title} tile={tile} />)}
          </div>
        </div>

        <div>
          <h2 className="mb-4 text-xl font-extrabold">Today</h2>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-dark p-6 text-white shadow-card">
            <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-amber-400/20 blur-2xl" />
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-amber text-2xl"><Flame className="h-6 w-6 text-white" /></span>
            <h3 className="mt-4 font-display text-lg font-extrabold uppercase tracking-wide">Daily Challenge</h3>
            <p className="mt-2 text-sm text-ink-200">
              Speak for 5 minutes about <span className="font-bold text-white">"My Career Goals"</span>
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 px-3 py-1 text-xs font-bold text-amber-300">
              <Flame className="h-3.5 w-3.5" /> +50 XP
            </p>
            <Link href="/student/practice/speaking?topic=My%20Career%20Goals" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-white py-3 text-sm font-bold text-ink-900 transition-transform hover:-translate-y-0.5">
              Start Challenge <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}