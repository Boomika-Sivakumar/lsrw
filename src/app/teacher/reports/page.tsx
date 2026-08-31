"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Download } from "lucide-react";

interface ReportRow {
  id: string;
  type: string;
  title: string;
  summary: string;
  createdAt: string;
  exportedAt: string | null;
  student: { id: string; name: string; userId: string };
}

export default function TeacherReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<ReportRow[]>("/api/teacher/reports").then(setRows).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Teacher" title="Reports" subtitle="Generated reports for students — assessment, session and group discussion." icon={<FileText className="h-6 w-6" />} gradient="bg-gradient-brand" />

      <Card>
        <CardHeader title={`Reports (${rows.length})`} subtitle="Latest first" icon="📄" />
        <div className="divide-y divide-ink-50">
          {rows.length === 0 && <p className="p-6 text-center text-sm text-ink-400">No reports generated yet.</p>}
          {rows.map((r) => (
            <div key={r.id} className="flex items-start justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge tone="primary">{r.type}</Badge>
                  <span className="font-mono text-xs text-ink-400">{r.student.userId}</span>
                </div>
                <p className="text-sm font-bold text-ink-900">{r.title}</p>
                <p className="text-sm text-ink-500">{r.student.name}</p>
                <p className="mt-1 line-clamp-2 text-xs text-ink-400">{r.summary}</p>
                <p className="mt-1 text-[11px] text-ink-400">{new Date(r.createdAt).toLocaleString()}{r.exportedAt ? ` · exported ${new Date(r.exportedAt).toLocaleString()}` : ""}</p>
              </div>
              <div className="flex flex-none flex-col items-end gap-1">
                <span className="rounded-lg bg-ink-50 p-2 text-ink-400" title="PDF export">
                  <Download className="h-4 w-4" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}