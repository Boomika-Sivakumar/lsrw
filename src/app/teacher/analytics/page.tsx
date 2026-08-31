"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { LineChart } from "@/components/ui/line-chart";
import { TrendingUp, Trophy, AlertTriangle } from "lucide-react";

interface ClassPerformance {
  classSize: number;
  averages: { metric: string; average: number }[];
  strongestSkills: { metric: string; average: number }[];
  weakestSkills: { metric: string; average: number }[];
  commonMistakes: { message: string; count: number }[];
  overallAverage: number;
}

interface StudentRow {
  id: string;
  userId: string;
  name: string;
  level: string | null;
  overall: number | null;
}

const SKILL_COLOR: Record<string, string> = { SPEAKING: "bg-gradient-brand", LISTENING: "bg-gradient-sky", READING: "bg-gradient-violet", WRITING: "bg-gradient-rose" };

export default function TeacherAnalyticsPage() {
  const [perf, setPerf] = useState<ClassPerformance | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);

  useEffect(() => {
    api<ClassPerformance>("/api/teacher/class/performance").then(setPerf).catch(console.error);
    api<StudentRow[]>("/api/teacher/students").then(setStudents).catch(console.error);
  }, []);

  const chartData = useMemo(() => {
    const sorted = [...(perf?.averages ?? [])].sort((a, b) => a.average - b.average);
    return sorted.map((a) => ({ label: a.metric.slice(0, 4), value: a.average }));
  }, [perf]);

  const levelDist = useMemo(() => {
    const d: Record<string, number> = {};
    for (const s of students) d[s.level ?? "UNRATED"] = (d[s.level ?? "UNRATED"] ?? 0) + 1;
    return Object.entries(d).sort((a, b) => b[1] - a[1]);
  }, [students]);

  if (!perf) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Teacher" title="Analytics" subtitle="Class-level performance trends, skill gaps and participation." icon={<TrendingUp className="h-6 w-6" />} gradient="bg-gradient-brand" />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Students", value: String(perf.classSize) },
          { label: "Class average", value: `${perf.overallAverage}%` },
          { label: "Skills tracked", value: String(perf.averages.length) },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{s.label}</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-ink-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Skill score distribution" subtitle="Class average per metric, low → high" icon="📈" />
          <div className="p-6">
            <LineChart data={chartData} height={220} from="#6366F1" to="#8B5CF6" />
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Level distribution" subtitle="Where students stand" icon="🏅" />
            <div className="space-y-3 p-6">
              {levelDist.map(([level, count]) => (
                <div key={level}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink-700">{level}</span>
                    <span className="font-mono font-bold text-ink-900">{count}</span>
                  </div>
                  <ProgressBar value={(count / Math.max(1, students.length)) * 100} color={level === "PROFICIENT" ? "bg-emerald-500" : level === "ADVANCED" ? "bg-gradient-brand" : level === "INTERMEDIATE" ? "bg-gradient-sky" : "bg-amber-500"} />
                </div>
              ))}
              {levelDist.length === 0 && <p className="text-sm text-ink-400">No students yet.</p>}
            </div>
          </Card>

          <Card>
            <CardHeader title="Class strengths & gaps" subtitle="Overview at a glance" icon={<Trophy className="h-4 w-4 text-amber-500" />} />
            <div className="space-y-3 p-6">
              <div className="rounded-xl bg-emerald-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">🏆 Strongest</p>
                <div className="mt-2 space-y-2">
                  {perf.strongestSkills.map((s) => (
                    <div key={s.metric} className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-ink-800">{s.metric}</span>
                      <span className="font-mono font-bold text-ink-900">{s.average}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-xl bg-amber-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">⚠️ Needs work</p>
                <div className="mt-2 space-y-2">
                  {perf.weakestSkills.map((s) => (
                    <div key={s.metric} className="flex items-center justify-between text-sm">
                      <span className="font-semibold text-ink-800">{s.metric}</span>
                      <span className="font-mono font-bold text-ink-900">{s.average}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader title="Common mistakes" subtitle="Most frequent across the class" icon={<AlertTriangle className="h-4 w-4 text-amber-500" />} />
        <div className="grid gap-2 p-6 sm:grid-cols-2">
          {perf.commonMistakes.length === 0 && <p className="text-sm text-ink-400">No mistakes recorded yet.</p>}
          {perf.commonMistakes.slice(0, 8).map((m, i) => (
            <div key={i} className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-2.5 text-sm">
              <span className="text-ink-700">{m.message}</span>
              <Badge tone="warning">×{m.count}</Badge>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Skill heatmap" subtitle="Per-skill averages" icon="🌡️" />
        <div className="flex flex-wrap gap-3 p-6">
          {perf.averages.map((a) => (
            <div key={a.metric} className="min-w-[180px] flex-1 rounded-xl border border-ink-100 p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-bold text-ink-800">{a.metric}</span>
                <span className="font-mono font-extrabold">{a.average}%</span>
              </div>
              <ProgressBar value={a.average} color={SKILL_COLOR[a.metric] ?? "bg-gradient-brand"} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}