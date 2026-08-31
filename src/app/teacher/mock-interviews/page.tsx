"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic } from "lucide-react";

interface MockRow {
  id: string;
  skill: string;
  mode: string;
  topic: string | null;
  overallScore: number | null;
  completedAt: string | null;
  student: { id: string; name: string; userId: string };
  results: { metric: string; score: number }[];
}

export default function TeacherMockInterviewsPage() {
  const [rows, setRows] = useState<MockRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<MockRow[]>("/api/teacher/results?mode=MOCK_INTERVIEW").then(setRows).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Teacher" title="Mock Interviews" subtitle="Completed AI mock interview sessions and scores." icon={<Mic className="h-6 w-6" />} gradient="bg-gradient-brand" />

      <Card>
        <CardHeader title={`Mock interview sessions (${rows.length})`} subtitle="Latest first" icon="🎤" />
        <div className="divide-y divide-ink-50">
          {rows.length === 0 && <p className="p-6 text-center text-sm text-ink-400">No mock interview sessions yet.</p>}
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <Badge tone="primary">{r.skill}</Badge>
                  <span className="font-mono text-xs text-ink-400">{r.student.userId}</span>
                </div>
                <p className="text-sm font-bold text-ink-800">{r.student.name}</p>
                <p className="text-xs text-ink-400">{r.topic ?? "—"} · {r.completedAt ? new Date(r.completedAt).toLocaleString() : "—"}</p>
              </div>
              <div className="text-right">
                <p className="font-display text-2xl font-extrabold text-ink-900">{r.overallScore ?? "—"}</p>
                <div className="mt-1 flex gap-1">
                  {r.results.slice(0, 3).map((m) => (
                    <span key={m.metric} className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-bold text-ink-600">{m.score}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}