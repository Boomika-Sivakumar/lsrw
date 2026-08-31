"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity } from "lucide-react";

interface ResultRow {
  id: string;
  skill: string;
  mode: string;
  topic: string | null;
  difficulty: string;
  overallScore: number | null;
  completedAt: string | null;
  student: { id: string; name: string; userId: string };
  results: { metric: string; score: number }[];
}

export default function TeacherResultsPage() {
  const [rows, setRows] = useState<ResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [skill, setSkill] = useState("");

  useEffect(() => {
    setLoading(true);
    api<ResultRow[]>(`/api/teacher/results${skill ? `?skill=${skill}` : ""}`)
      .then(setRows)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [skill]);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Teacher" title="Results" subtitle="Completed practice sessions and AI evaluation scores across the class." icon={<Activity className="h-6 w-6" />} gradient="bg-gradient-brand" />

      <div className="flex flex-wrap gap-2">
        {["", "READING", "LISTENING", "SPEAKING", "WRITING"].map((s) => (
          <button key={s} onClick={() => setSkill(s)} className={`rounded-full px-4 py-1.5 text-xs font-bold transition-colors ${skill === s ? "bg-primary-600 text-white" : "bg-ink-100 text-ink-500 hover:bg-ink-200"}`}>
            {s || "All skills"}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader title={`Practice results (${rows.length})`} subtitle="Latest first" icon="📊" />
        <div className="overflow-x-auto p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="py-3 pl-4 pr-4">Student</th>
                <th className="py-3 pr-4">Skill</th>
                <th className="py-3 pr-4">Mode</th>
                <th className="py-3 pr-4">Topic</th>
                <th className="py-3 pr-4">Score</th>
                <th className="py-3 pr-4">Completed</th>
                <th className="py-3">Metrics</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-ink-50 transition-colors hover:bg-primary-50/50">
                  <td className="py-3 pl-4 pr-4">
                    <p className="font-bold text-ink-800">{r.student.name}</p>
                    <p className="font-mono text-xs text-primary-600">{r.student.userId}</p>
                  </td>
                  <td className="py-3 pr-4"><Badge tone="primary">{r.skill}</Badge></td>
                  <td className="py-3 pr-4"><span className="font-mono text-xs uppercase tracking-wide text-ink-500">{r.mode.replace(/_/g, " ")}</span></td>
                  <td className="py-3 pr-4 max-w-[220px] truncate text-ink-600">{r.topic ?? "—"}</td>
                  <td className="py-3 pr-4 font-mono font-extrabold text-ink-900">{r.overallScore ?? "—"}</td>
                  <td className="py-3 pr-4 text-ink-600">{r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "—"}</td>
                  <td className="py-3 pr-4">
                    <div className="flex flex-wrap gap-1">
                      {r.results.map((m) => (
                        <span key={m.metric} className="rounded bg-ink-100 px-2 py-0.5 text-[10px] font-bold text-ink-600">
                          {m.metric} {m.score}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-sm text-ink-400">No practice results yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}