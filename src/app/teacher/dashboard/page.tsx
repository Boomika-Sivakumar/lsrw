"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { metricLabel } from "@/lib/insights";
import { GraduationCap, Trophy, AlertTriangle, Users, TrendingUp, Activity } from "lucide-react";

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
  scores: Record<string, number>;
  assessmentCount: number;
}

export default function TeacherPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [performance, setPerformance] = useState<ClassPerformance | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);

  useEffect(() => {
    if (loading) return;
    if (!user || user.role !== "TEACHER") {
      router.push("/dashboard");
      return;
    }
    api<ClassPerformance>("/api/teacher/class/performance").then(setPerformance).catch(console.error);
    api<StudentRow[]>("/api/teacher/students").then(setStudents).catch(console.error);
  }, [user, loading, router]);

  const sorted = useMemo(() => [...students].sort((a, b) => (b.overall ?? 0) - (a.overall ?? 0)), [students]);

  if (!user) return null;
  if (loading || !performance) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Teacher"
        title="Teacher Dashboard"
        subtitle="Monitor your class LSRW performance, mistakes and group discussion analytics."
        icon={<GraduationCap className="h-6 w-6" />}
        gradient="bg-gradient-brand"
        right={
          <Link href="/teacher/group-discussions" className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5">
            <Users className="h-4 w-4" /> Create Discussion
          </Link>
        }
      />

      {/* OVERVIEW */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Students", value: String(performance.classSize), icon: Users, grad: "from-primary-500 to-violet-500" },
          { label: "Average Score", value: `${performance.overallAverage}%`, icon: Activity, grad: "from-sky-500 to-cyan-500" },
          { label: "Improvement", value: "+12%", icon: TrendingUp, grad: "from-emerald-500 to-cyan-500" },
          { label: "Weakest Skill", value: performance.weakestSkills[0]?.metric?.toLowerCase() ?? "—", icon: AlertTriangle, grad: "from-amber-500 to-orange-500" },
        ].map((s) => (
          <div key={s.label} className="relative overflow-hidden rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card">
            <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-15 blur-2xl ${s.grad}`} />
            <s.icon className="h-5 w-5 text-ink-400" />
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-ink-400">{s.label}</p>
            <p className="mt-1 font-display text-3xl font-extrabold capitalize text-ink-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* CHARTS */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Class LSRW Performance" subtitle="Average score per metric" icon="📊" />
          <div className="space-y-4 p-6">
            {performance.averages.map((a) => (
              <div key={a.metric}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink-700">{metricLabel(a.metric)}</span>
                  <span className="font-mono font-bold text-ink-900">{a.average}%</span>
                </div>
                <ProgressBar value={a.average} color={a.average >= 70 ? "bg-emerald-500" : a.average >= 50 ? "bg-gradient-brand" : "bg-amber-500"} />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Strongest vs Weakest" subtitle="Where the class excels and needs help" icon={<Trophy className="h-4 w-4 text-amber-500" />} />
            <div className="space-y-3 p-6">
              <div className="rounded-xl bg-emerald-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">🏆 Strongest</p>
                <p className="mt-1 text-sm font-bold text-ink-800">
                  {performance.strongestSkills[0]?.metric ?? "—"} ({performance.strongestSkills[0]?.average}%)
                </p>
              </div>
              <div className="rounded-xl bg-amber-50 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-amber-700">⚠️ Weakest</p>
                <p className="mt-1 text-sm font-bold text-ink-800">
                  {performance.weakestSkills[0]?.metric ?? "—"} ({performance.weakestSkills[0]?.average}%)
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Common Mistakes" subtitle="Most frequent across the class" icon="🔍" />
            <div className="p-5">
              {performance.commonMistakes.length === 0 ? (
                <p className="text-sm text-ink-400">No mistakes recorded yet.</p>
              ) : (
                <ul className="space-y-2.5">
                  {performance.commonMistakes.slice(0, 6).map((m, i) => (
                    <li key={i} className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-2.5 text-sm">
                      <span className="text-ink-700">{m.message}</span>
                      <Badge tone="warning">×{m.count}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* STUDENTS */}
      <Card>
        <CardHeader title="Student Roster" subtitle="Ranked by overall score" icon="👥" />
        <div className="overflow-x-auto p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="py-3 pl-4 pr-4">Rank</th>
                <th className="py-3 pr-4">User ID</th>
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Level</th>
                <th className="py-3 pr-4">Overall</th>
                <th className="py-3 pr-4">Assessments</th>
                <th className="py-3 pr-4">Speaking</th>
                <th className="py-3">Listening</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.id} className="border-b border-ink-50 transition-colors hover:bg-primary-50/50">
                  <td className="py-3 pl-4 pr-4">
                    {i === 0 ? <span className="text-lg">🏆</span> : <span className="font-mono text-ink-400">#{i + 1}</span>}
                  </td>
                  <td className="py-3 pr-4 font-mono font-bold text-primary-600">{s.userId}</td>
                  <td className="py-3 pr-4 font-medium text-ink-800">{s.name}</td>
                  <td className="py-3 pr-4">
                    <Badge tone={s.level === "PROFICIENT" ? "success" : s.level === "ADVANCED" ? "primary" : s.level ? "warning" : "default"}>
                      {s.level ?? "—"}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 font-mono font-bold text-ink-900">{s.overall ?? "—"}</td>
                  <td className="py-3 pr-4 text-ink-600">{s.assessmentCount}</td>
                  <td className="py-3 pr-4 font-mono text-ink-600">{s.scores.SPEAKING ?? "—"}</td>
                  <td className="py-3 font-mono text-ink-600">{s.scores.LISTENING ?? "—"}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-sm text-ink-400">No students yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}