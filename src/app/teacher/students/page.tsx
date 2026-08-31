"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Users, ArrowRight } from "lucide-react";

interface StudentRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  level: string | null;
  overall: number | null;
  scores: Record<string, number>;
  assessmentCount: number;
}

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<StudentRow[]>("/api/teacher/students").then(setStudents).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Teacher" title="Students" subtitle="All enrolled students with their latest assessment scores." icon={<Users className="h-6 w-6" />} gradient="bg-gradient-brand" />

      <Card>
        <CardHeader title={`Student roster (${students.length})`} subtitle="Click a student to view full detail" icon="👥" />
        <div className="overflow-x-auto p-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-wide text-ink-400">
                <th className="py-3 pl-4 pr-4">User ID</th>
                <th className="py-3 pr-4">Name</th>
                <th className="py-3 pr-4">Level</th>
                <th className="py-3 pr-4">Overall</th>
                <th className="py-3 pr-4">Assessments</th>
                <th className="py-3 pr-4 w-48">Speaking</th>
                <th className="py-3 pr-4">Listening</th>
                <th className="py-3" />
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-ink-50 transition-colors hover:bg-primary-50/50">
                  <td className="py-3 pl-4 pr-4 font-mono font-bold text-primary-600">{s.userId}</td>
                  <td className="py-3 pr-4 font-medium text-ink-800">{s.name}</td>
                  <td className="py-3 pr-4">
                    <Badge tone={s.level === "PROFICIENT" ? "success" : s.level === "ADVANCED" ? "primary" : s.level ? "warning" : "default"}>{s.level ?? "—"}</Badge>
                  </td>
                  <td className="py-3 pr-4 font-mono font-bold text-ink-900">{s.overall ?? "—"}</td>
                  <td className="py-3 pr-4 text-ink-600">{s.assessmentCount}</td>
                  <td className="py-3 pr-4">
                    <ProgressBar value={s.scores.SPEAKING ?? 0} color="bg-gradient-brand" />
                  </td>
                  <td className="py-3 pr-4">
                    <ProgressBar value={s.scores.LISTENING ?? 0} color="bg-gradient-sky" />
                  </td>
                  <td className="py-3 pr-4">
                    <Link href={`/teacher/students/${s.id}`} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-primary-600 hover:bg-primary-50">
                      View <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </td>
                </tr>
              ))}
              {students.length === 0 && (
                <tr><td colSpan={8} className="py-8 text-center text-sm text-ink-400">No students yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}