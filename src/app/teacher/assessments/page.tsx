"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";

interface AssessmentRow {
  id: string;
  type: string;
  overall: number | null;
  level: string | null;
  completedAt: string | null;
  student: { id: string; name: string; userId: string };
  results: { metric: string; score: number }[];
}

export default function TeacherAssessmentsPage() {
  const [rows, setRows] = useState<AssessmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<AssessmentRow[]>("/api/teacher/assessments").then(setRows).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Teacher" title="Assessments" subtitle="All completed assessments across the class." icon={<ClipboardCheck className="h-6 w-6" />} gradient="bg-gradient-brand" />

      <Card>
        <CardHeader title={`Assessment history (${rows.length})`} subtitle="Latest first" icon="🧾" />
        <div className="overflow-x-auto p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="py-3 pl-4 pr-4">Student</th>
                <th className="py-3 pr-4">Type</th>
                <th className="py-3 pr-4">Level</th>
                <th className="py-3 pr-4">Overall</th>
                <th className="py-3 pr-4">Completed</th>
                <th className="py-3 pr-4">Top metric</th>
                <th className="py-3">Weakest</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => {
                const sorted = [...a.results].sort((x, y) => y.score - x.score);
                return (
                  <tr key={a.id} className="border-b border-ink-50 transition-colors hover:bg-primary-50/50">
                    <td className="py-3 pl-4 pr-4">
                      <p className="font-bold text-ink-800">{a.student.name}</p>
                      <p className="font-mono text-xs text-primary-600">{a.student.userId}</p>
                    </td>
                    <td className="py-3 pr-4"><Badge tone="default">{a.type}</Badge></td>
                    <td className="py-3 pr-4">
                      <Badge tone={a.level === "PROFICIENT" ? "success" : a.level === "ADVANCED" ? "primary" : a.level ? "warning" : "default"}>{a.level ?? "—"}</Badge>
                    </td>
                    <td className="py-3 pr-4 font-mono font-extrabold text-ink-900">{a.overall ?? "—"}</td>
                    <td className="py-3 pr-4 text-ink-600">{a.completedAt ? new Date(a.completedAt).toLocaleDateString() : "—"}</td>
                    <td className="py-3 pr-4 font-mono text-ink-600">{sorted[0] ? `${sorted[0].metric} ${sorted[0].score}` : "—"}</td>
                    <td className="py-3 font-mono text-ink-400">{sorted.at(-1) ? `${sorted.at(-1)!.metric} ${sorted.at(-1)!.score}` : "—"}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-sm text-ink-400">No completed assessments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}