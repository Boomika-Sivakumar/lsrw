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
import { ClipboardList, ArrowUpRight, Hourglass, CheckCircle2, Clock } from "lucide-react";

interface MySubmission {
  id: string;
  status: string;
  score: number | null;
  submittedAt: string;
  gradedAt: string | null;
}

interface AssignmentItem {
  id: string;
  skill: string;
  title: string;
  description: string | null;
  difficulty: string;
  deadline: string | null;
  criteria: string[] | null;
  createdAt: string;
  publishedAt: string | null;
  questionCount: number;
  mySubmission: MySubmission | null;
}

const SKILL_EMOJI: Record<string, string> = { LISTENING: "🎧", SPEAKING: "🎤", READING: "📖", WRITING: "✍️" };
const TABS = ["ALL", "PENDING", "IN PROGRESS", "COMPLETED"] as const;
type Tab = (typeof TABS)[number];

function tabOf(a: AssignmentItem): Exclude<Tab, "ALL"> {
  if (!a.mySubmission) return "PENDING";
  if (a.mySubmission.score == null) return "IN PROGRESS";
  return "COMPLETED";
}

export default function StudentAssignmentsPage() {
  const { toast } = useToast();
  const [items, setItems] = useState<AssignmentItem[]>([]);
  const [tab, setTab] = useState<Tab>("ALL");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await api<AssignmentItem[]>("/api/students/assignments"));
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <PageSkeleton />;

  const counts = {
    ALL: items.length,
    PENDING: items.filter((a) => tabOf(a) === "PENDING").length,
    "IN PROGRESS": items.filter((a) => tabOf(a) === "IN PROGRESS").length,
    COMPLETED: items.filter((a) => tabOf(a) === "COMPLETED").length,
  };
  const filtered = tab === "ALL" ? items : items.filter((a) => tabOf(a) === tab);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Student" title="Assignments" subtitle="Complete AI-powered assignments and get instant feedback." icon={<ClipboardList className="h-6 w-6" />} gradient="bg-gradient-brand" />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${tab === t ? "bg-gradient-brand text-white" : "bg-white text-ink-500 ring-1 ring-ink-200 hover:bg-ink-50"}`}>
            {t} <span className="ml-1 opacity-70">({counts[t]})</span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-4xl">📭</p>
          <p className="mt-3 font-bold text-ink-800">No assignments here</p>
          <p className="text-sm text-ink-500">New assignments from your teacher will appear here.</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((a) => {
            const t = tabOf(a);
            const sub = a.mySubmission;
            const badge = t === "PENDING" ? <Badge tone="default"><Hourglass className="h-3 w-3" /> Pending</Badge>
              : t === "IN PROGRESS" ? <Badge tone="warning"><Clock className="h-3 w-3" /> Awaiting result</Badge>
              : <Badge tone="success"><CheckCircle2 className="h-3 w-3" /> Completed</Badge>;
            return (
              <Link key={a.id} href={`/student/assignments/${a.id}`}>
                <Card className="group flex h-full flex-col p-5 transition-all hover:shadow-lg">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="primary">{SKILL_EMOJI[a.skill]} {a.skill}</Badge>
                      <Badge tone={a.difficulty === "HARD" ? "warning" : a.difficulty === "MEDIUM" ? "default" : "success"}>{a.difficulty}</Badge>
                    </div>
                    {badge}
                  </div>
                  <h3 className="mt-3 font-display text-lg font-extrabold text-ink-900">{a.title}</h3>
                  {a.description && <p className="mt-1 text-sm text-ink-500 line-clamp-2">{a.description}</p>}
                  <div className="mt-4 flex items-center justify-between border-t border-ink-100 pt-3">
                    <span className="text-xs font-semibold text-ink-400">📝 {a.questionCount} questions{a.deadline ? ` · ⏰ Due ${new Date(a.deadline).toLocaleDateString()}` : ""}</span>
                    <span className="flex items-center gap-1 text-sm font-bold text-primary-600 group-hover:underline">
                      {t === "PENDING" ? "Start" : t === "IN PROGRESS" ? "View status" : sub?.score != null ? `${sub.score}%` : "View"}
                      <ArrowUpRight className="h-4 w-4" />
                    </span>
                  </div>
                  {t === "IN PROGRESS" && (
                    <Button size="sm" className="mt-3" variant="soft">Result is being evaluated — check back soon</Button>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}