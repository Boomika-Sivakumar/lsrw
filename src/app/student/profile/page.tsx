"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { UserRound } from "lucide-react";

interface Profile {
  userId: string;
  name: string;
  email: string;
  role: string;
  level: string | null;
  createdAt: string;
  goals: { goal: string; targetLevel: string | null }[];
  latestAssessment: { type: string; overall: number | null; level: string | null; completedAt: string | null; results: { metric: string; score: number }[] } | null;
  recentSessions: { skill: string; mode: string; overallScore: number | null; completedAt: string | null }[];
  assignmentSubmissions: { assignmentId: string; title: string; skill: string; status: string; score: number | null; submittedAt: string }[];
}

const SKILL_COLOR: Record<string, string> = { SPEAKING: "bg-gradient-brand", LISTENING: "bg-gradient-sky", READING: "bg-gradient-violet", WRITING: "bg-gradient-rose" };

export default function StudentProfilePage() {
  const [p, setP] = useState<Profile | null>(null);

  useEffect(() => {
    api<Profile>("/api/students/profile").then(setP).catch(console.error);
  }, []);

  if (!p) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Student"
        title={p.name}
        subtitle={`${p.email} · joined ${new Date(p.createdAt).toLocaleDateString()}`}
        icon={<UserRound className="h-6 w-6" />}
        gradient="bg-gradient-rose"
        right={
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand shadow-lift">
              <span className="font-display text-xl font-black text-white">{p.userId.slice(0, 2)}</span>
            </div>
            <div>
              <p className="font-mono text-sm font-bold text-primary-600">{p.userId}</p>
              <Badge tone={p.level === "PROFICIENT" ? "success" : p.level === "ADVANCED" ? "primary" : p.level ? "warning" : "default"}>{p.level ?? "UNRATED"}</Badge>
            </div>
          </div>
        }
      />

      {p.latestAssessment && (
        <Card>
          <CardHeader title="Latest assessment" subtitle={`${p.latestAssessment.type} · ${p.latestAssessment.completedAt ? new Date(p.latestAssessment.completedAt).toLocaleDateString() : "—"} · overall ${p.latestAssessment.overall ?? "—"}`} icon="🎯" />
          <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
            {p.latestAssessment.results.map((r) => (
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
          <CardHeader title="Learning goals" subtitle={`${p.goals.length} goal(s) set`} icon="🎯" />
          <div className="divide-y divide-ink-50">
            {p.goals.length === 0 && <p className="p-5 text-center text-sm text-ink-400">No goals set yet.</p>}
            {p.goals.map((g, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <p className="text-sm font-bold text-ink-800">{g.goal}</p>
                {g.targetLevel && <Badge tone="primary">→ {g.targetLevel}</Badge>}
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <CardHeader title="Recent practice" subtitle="Last 5 completed sessions" icon="🎤" />
          <div className="divide-y divide-ink-50">
            {p.recentSessions.length === 0 && <p className="p-5 text-center text-sm text-ink-400">No sessions yet.</p>}
            {p.recentSessions.map((s, i) => (
              <div key={i} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Badge tone="primary">{s.skill}</Badge>
                  <span className="font-mono text-xs uppercase tracking-wide text-ink-400">{s.mode.replace(/_/g, " ")}</span>
                </div>
                <span className="font-mono font-extrabold text-ink-900">{s.overallScore ?? "—"}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Assignment submissions" subtitle={`${p.assignmentSubmissions.length} total`} icon="📋" />
        <div className="divide-y divide-ink-50">
          {p.assignmentSubmissions.length === 0 && <p className="p-5 text-center text-sm text-ink-400">No submissions yet.</p>}
          {p.assignmentSubmissions.map((s) => (
            <div key={s.assignmentId} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <Badge tone="primary">{s.skill}</Badge>
                <p className="text-sm font-bold text-ink-800">{s.title}</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={s.status === "SUBMITTED" ? "default" : "success"}>{s.status}</Badge>
                <span className="font-mono font-extrabold text-ink-900">{s.score ?? "—"}</span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}