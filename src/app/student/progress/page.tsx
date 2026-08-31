"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { LineChart } from "@/components/ui/line-chart";
import { metricLabel } from "@/lib/insights";
import { TrendingUp, ArrowRight, Lock, CheckCircle2, Route } from "lucide-react";

interface ProgressData {
  before: { results: { metric: string; score: number }[]; completedAt: string } | null;
  after: { results: { metric: string; score: number }[]; completedAt: string } | null;
  improvement: Record<string, number>;
  timeline: { id: string; completedAt: string; overall: number; level: string }[];
}

const PATH_STEPS = [
  { label: "Grammar Basics", done: true },
  { label: "Vocabulary", done: true },
  { label: "Speaking Basics", done: true },
  { label: "Fluency", done: false, active: true },
  { label: "Advanced Group Discussion", done: false },
  { label: "Mock Interview", done: false },
  { label: "Professional Communication", done: false },
];

export default function ProgressPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ProgressData | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    api<ProgressData>("/api/users/me/progress").then(setData).catch(console.error);
  }, [user, loading, router]);

  if (!user) return null;
  if (loading || !data) return <PageSkeleton />;

  const beforeMap = new Map(data.before?.results.map((r) => [r.metric, r.score]));
  const afterMap = new Map(data.after?.results.map((r) => [r.metric, r.score]));
  const timeline = data.timeline.map((t, i) => ({
    label: new Date(t.completedAt).toLocaleDateString(undefined, { month: "short" }),
    value: t.overall,
    first: i === 0,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analytics"
        title="Communication Progress"
        subtitle="See exactly how much you've improved — before vs after."
        icon={<TrendingUp className="h-6 w-6" />}
        gradient="bg-gradient-brand"
      />

      {/* TIMELINE */}
      <Card>
        <CardHeader title="Overall Score Timeline" subtitle="Your communication score across assessments" icon="📈" />
        <div className="p-6">
          {timeline.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-200 p-10 text-center">
              <p className="text-3xl">📈</p>
              <p className="mt-2 text-sm font-semibold text-ink-600">No completed assessments yet.</p>
              <p className="mt-1 text-xs text-ink-400">Complete an assessment to see your progress over time.</p>
              <Link href="/student/assessments" className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-lift">
                Take Assessment <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <LineChart data={timeline} height={220} />
          )}
        </div>
      </Card>

      {/* BEFORE → AFTER */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-6 lg:col-span-2">
          <CardHeader title="Before → After" subtitle="Metric-by-metric improvement" icon="🚀" />
          <div className="mt-4 grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {[...afterMap.entries()].map(([metric, after]) => {
              const before = beforeMap.get(metric) ?? 0;
              const delta = after - before;
              return (
                <div key={metric}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink-700">{metricLabel(metric)}</span>
                    <span className="flex items-center gap-2 font-mono text-xs font-bold">
                      <span className="text-ink-500">{before}%</span>
                      <span className="text-ink-300">→</span>
                      <span className="text-ink-900">{after}%</span>
                      <Badge tone={delta >= 0 ? "success" : "danger"}>
                        {delta >= 0 ? "+" : ""}{delta}%
                      </Badge>
                    </span>
                  </div>
                  <ProgressBar value={after} color={delta >= 0 ? "bg-emerald-500" : "bg-amber-500"} />
                </div>
              );
            })}
            {data.before === null && (
              <p className="text-sm text-ink-400 sm:col-span-2">Complete two assessments to unlock before/after analysis.</p>
            )}
          </div>
        </Card>

        {/* LEARNING PATH */}
        <Card className="p-6">
          <CardHeader title="Your AI Learning Path" subtitle="Recommended next activity" icon={<Route className="h-4 w-4 text-violet-600" />} />
          <div className="mt-4 space-y-1">
            {PATH_STEPS.map((s, i) => (
              <div key={s.label}>
                <Link
                  href={s.active ? "/practice" : s.done ? "/practice" : "/assessment"}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                    s.active ? "bg-violet-50 font-bold text-violet-700" : s.done ? "text-ink-600 hover:bg-ink-50" : "text-ink-400 hover:bg-ink-50"
                  }`}
                >
                  {s.done ? (
                    <CheckCircle2 className="h-4 w-4 flex-none text-emerald-500" />
                  ) : s.active ? (
                    <span className="flex h-4 w-4 flex-none items-center justify-center rounded-full bg-gradient-brand">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    </span>
                  ) : (
                    <Lock className="h-4 w-4 flex-none text-ink-300" />
                  )}
                  <span className="flex-1">{s.label}</span>
                  {s.active && <ArrowRight className="h-4 w-4" />}
                </Link>
                {i < PATH_STEPS.length - 1 && <div className="ml-[1.35rem] h-2 border-l border-dashed border-ink-200" />}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}