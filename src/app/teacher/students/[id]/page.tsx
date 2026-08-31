"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ArrowLeft, GraduationCap } from "lucide-react";

interface StudentDetail {
  id: string;
  userId: string;
  name: string;
  email: string;
  level: string | null;
  createdAt: string;
  assessments: { id: string; type: string; overall: number | null; level: string | null; completedAt: string | null; results: { metric: string; score: number }[] }[];
  practiceSessions: { id: string; skill: string; mode: string; topic: string | null; overallScore: number | null; completedAt: string | null }[];
  mistakes: { type: string; message: string; correction: string | null; occurrences: number }[];
  assignmentSubmissions: { id: string; title: string; skill: string; status: string; score: number | null; submittedAt: string }[];
}

const SKILL_COLOR: Record<string, string> = { SPEAKING: "bg-gradient-brand", LISTENING: "bg-gradient-sky", READING: "bg-gradient-violet", WRITING: "bg-gradient-rose" };

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const [s, setS] = useState<StudentDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<StudentDetail>(`/api/teacher/students/${params.id}`).then(setS).catch((e) => setError(e.message));
  }, [params.id]);

  if (error) return <p className="p-10 text-center text-sm text-red-600">{error}</p>;
  if (!s) return <PageSkeleton />;

  const latest = s.assessments[0];

  return (
    <div className="space-y-8">
      <Link href="/teacher/students" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Back to students
      </Link>

      <PageHeader
        eyebrow={`Student · ${s.userId}`}
        title={s.name}
        subtitle={`${s.email} · joined ${new Date(s.createdAt).toLocaleDateString()}`}
        icon={<GraduationCap className="h-6 w-6" />}
        gradient="bg-gradient-brand"
        right={
          <div className="flex items-center gap-3">
            <Badge tone={s.level === "PROFICIENT" ? "success" : s.level === "ADVANCED" ? "primary" : s.level ? "warning" : "default"}>{s.level ?? "NO LEVEL"}</Badge>
            <div className="rounded-xl bg-white px-4 py-2 text-center shadow-card">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">Overall</p>
              <p className="font-display text-2xl font-extrabold text-ink-900">{latest?.overall ?? "—"}</p>
            </div>
          </div>
        }
      />

      {latest && (
        <Card>
          <CardHeader title="Latest assessment" subtitle={`${latest.type} · ${latest.completedAt ? new Date(latest.completedAt).toLocaleDateString() : "in progress"}`} icon="🎯" />
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
            {latest.results.map((r) => (
              <div key={r.metric}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-semibold text-ink-700">{r.metric}</span>
                  <span className="font-mono font-bold">{r.score}</span>
                </div>
                <ProgressBar value={r.score} color={SKILL_COLOR[r.metric] ?? "bg-gradient-brand"} />
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Assessment history" subtitle={`${s.assessments.length} completed assessments`} icon="📈" />
          <div className="divide-y divide-ink-50">
            {s.assessments.length === 0 && <p className="p-5 text-center text-sm text-ink-400">No assessments yet.</p>}
            {s.assessments.map((a) => (
              <div key={a.id} className="flex items-center justify-between p-4">
                <div>
                  <Badge tone="default">{a.type}</Badge>
                  <p className="mt-1 text-xs text-ink-400">{a.completedAt ? new Date(a.completedAt).toLocaleString() : "In progress"}</p>
                </div>
                <span className="font-mono text-lg font-extrabold text-ink-900">{a.overall ?? "—"}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent mistakes" subtitle="Most frequent, from all activity" icon="🔍" />
          <div className="divide-y divide-ink-50">
            {s.mistakes.length === 0 && <p className="p-5 text-center text-sm text-ink-400">No mistakes recorded.</p>}
            {s.mistakes.map((m) => (
              <div key={m.type + m.message} className="p-4">
                <div className="flex items-center justify-between">
                  <Badge tone="warning">{m.type}</Badge>
                  <span className="font-mono text-xs text-ink-400">×{m.occurrences}</span>
                </div>
                <p className="mt-2 text-sm font-medium text-ink-800">{m.message}</p>
                {m.correction && <p className="mt-0.5 text-xs text-emerald-600">✓ {m.correction}</p>}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent practice" subtitle="Latest completed practice sessions" icon="🎤" />
        <div className="divide-y divide-ink-50">
          {s.practiceSessions.length === 0 && <p className="p-5 text-center text-sm text-ink-400">No practice sessions yet.</p>}
          {s.practiceSessions.map((p) => (
            <div key={p.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Badge tone="primary">{p.skill}</Badge>
                <div>
                  <p className="text-sm font-bold text-ink-800">{p.topic ?? p.mode}</p>
                  <p className="text-xs text-ink-400">{p.completedAt ? new Date(p.completedAt).toLocaleString() : "—"}</p>
                </div>
              </div>
              <span className="font-mono text-lg font-extrabold text-ink-900">{p.overallScore ?? "—"}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Assignment submissions" subtitle={`${s.assignmentSubmissions.length} total`} icon="📋" />
        <div className="divide-y divide-ink-50">
          {s.assignmentSubmissions.length === 0 && <p className="p-5 text-center text-sm text-ink-400">No submissions yet.</p>}
          {s.assignmentSubmissions.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Badge tone="primary">{sub.skill}</Badge>
                <p className="text-sm font-bold text-ink-800">{sub.title}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={sub.status === "GRADED" ? "success" : "default"}>{sub.status}</Badge>
                <span className="font-mono font-extrabold text-ink-900">{sub.score ?? "—"}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}