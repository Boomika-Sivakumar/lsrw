"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ClipboardList, Plus, FileText, CheckCircle2, PenSquare, Send, ArrowUpRight } from "lucide-react";

interface Assignment {
  id: string;
  skill: string;
  title: string;
  description: string | null;
  difficulty: string;
  deadline: string | null;
  status: string;
  aiGenerated: boolean;
  createdAt: string;
  publishedAt: string | null;
  questionCount: number;
  submissionCount: number;
  gradedCount: number;
}

interface Stats {
  total: number;
  published: number;
  drafts: number;
  submissions: number;
  graded: number;
  averageScore: number | null;
}

const SKILL_EMOJI: Record<string, string> = { LISTENING: "🎧", SPEAKING: "🎤", READING: "📖", WRITING: "✍️" };

export default function TeacherAssignmentsPage() {
  const { toast } = useToast();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, s] = await Promise.all([api<Assignment[]>("/api/teacher/assignments"), api<Stats>("/api/teacher/assignments/stats")]);
      setAssignments(a);
      setStats(s);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <PageSkeleton />;

  const statCards = [
    { label: "Total Assignments", value: stats?.total ?? 0, icon: <FileText className="h-5 w-5" />, tone: "bg-gradient-brand" },
    { label: "Published", value: stats?.published ?? 0, icon: <CheckCircle2 className="h-5 w-5" />, tone: "bg-emerald-500" },
    { label: "Drafts", value: stats?.drafts ?? 0, icon: <PenSquare className="h-5 w-5" />, tone: "bg-amber-500" },
    { label: "Submissions", value: stats?.submissions ?? 0, icon: <Send className="h-5 w-5" />, tone: "bg-violet-500" },
    { label: "Average Score", value: stats?.averageScore != null ? `${stats.averageScore}%` : "—", icon: <ClipboardList className="h-5 w-5" />, tone: "bg-sky-500" },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageHeader eyebrow="Teacher" title="Assignments" subtitle="Create, manage and evaluate student assignments." icon={<ClipboardList className="h-6 w-6" />} gradient="bg-gradient-brand" />
        <Link href="/teacher/assignments/create">
          <Button variant="gradient" size="lg"><Plus className="h-4 w-4" /> Create Assignment</Button>
        </Link>
      </div>

      {/* STATS */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${c.tone}`}>{c.icon}</span>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{c.label}</p>
                <p className="font-display text-2xl font-extrabold text-ink-900">{c.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* ASSIGNMENT LIST */}
      <Card>
        <div className="flex items-center justify-between border-b border-ink-100 px-6 py-4">
          <div>
            <h3 className="font-display text-lg font-extrabold text-ink-900">Your Assignments</h3>
            <p className="text-sm text-ink-500">Drafts are only visible to you. Published assignments appear for assigned students.</p>
          </div>
          <span className="rounded-xl bg-ink-50 px-3 py-1.5 text-sm font-bold text-ink-600">{assignments.length}</span>
        </div>

        {assignments.length === 0 ? (
          <div className="rounded-2xl p-12 text-center">
            <p className="text-4xl">📋</p>
            <p className="mt-3 font-bold text-ink-800">No assignments yet</p>
            <p className="text-sm text-ink-500">Create your first assignment to get started.</p>
            <Link href="/teacher/assignments/create" className="mt-4 inline-block">
              <Button variant="gradient"><Plus className="h-4 w-4" /> Create Assignment</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-ink-50">
            {assignments.map((a) => {
              const pct = a.submissionCount > 0 ? Math.round((a.submissionCount / Math.max(1, a.submissionCount + a.gradedCount)) * 100) : 0;
              return (
                <Link key={a.id} href={`/teacher/assignments/${a.id}`} className="block px-6 py-4 transition-colors hover:bg-ink-50/60">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <Badge tone="primary">{SKILL_EMOJI[a.skill] ?? ""} {a.skill}</Badge>
                        <Badge tone={a.difficulty === "HARD" ? "warning" : a.difficulty === "MEDIUM" ? "default" : "success"}>{a.difficulty}</Badge>
                        {a.aiGenerated && <Badge tone="ai">AI</Badge>}
                        <Badge tone={a.status === "PUBLISHED" ? "success" : "warning"}>{a.status}</Badge>
                        <span className="text-xs text-ink-400">📝 {a.questionCount} questions</span>
                        {a.deadline && <span className="text-xs text-ink-400">⏰ Due {new Date(a.deadline).toLocaleDateString()}</span>}
                      </div>
                      <p className="text-sm font-bold text-ink-900">{a.title}</p>
                      {a.description && <p className="mt-0.5 text-sm text-ink-500">{a.description}</p>}
                      <div className="mt-2 flex items-center gap-2 text-xs font-semibold text-ink-500">
                        <ProgressBar value={pct} color={a.status === "PUBLISHED" ? "bg-gradient-brand" : "bg-ink-300"} className="w-32" />
                        <span>{a.submissionCount} submitted · {a.gradedCount} graded</span>
                      </div>
                    </div>
                    <div className="flex flex-none items-center gap-1 text-primary-600">
                      {a.status === "PUBLISHED" ? "View submissions" : "Continue editing"}
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}