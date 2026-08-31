import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card, Modal } from "../../components/ui";

interface StudentRow {
  id: number;
  username: string;
  full_name: string;
  user_id: string;
  email: string;
  overall: number | null;
  level: string;
}

interface ReportData {
  user?: { full_name?: string; user_id?: string };
  scores?: Record<string, number>;
  overall?: number;
  level?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: Array<{ title: string }>;
}

export function TeacherReports() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selected, setSelected] = useState<ReportData | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/teachers/students")
      .then((res) => setStudents(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  const open = async (s: StudentRow) => {
    setActiveId(s.id);
    const { data } = await api.get<ReportData>(`/teachers/students/${s.id}/report`);
    setSelected(data);
  };

  if (error) return <div className="text-rose-600">{error}</div>;
  if (!students.length) return <Spinner label="Loading reports…" />;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h1 className="text-2xl font-bold">Student Reports</h1>

      <Modal open={!!selected} title={selected?.user?.full_name || "Report"} onClose={() => setSelected(null)}>
        {selected && (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-brand-700">{selected.overall}</div>
                <div className="text-xs text-slate-500">Overall</div>
              </div>
              <div>
                <Badge tone="violet">{selected.level}</Badge>
                <div className="mt-1 font-mono text-xs text-slate-400">{selected.user?.user_id}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {Object.entries(selected.scores || {}).map(([k, v]) => (
                <div key={k} className="rounded-lg bg-slate-50 p-2 text-center">
                  <div className="text-xs capitalize text-slate-500">{k}</div>
                  <div className="font-semibold">{v}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-sm font-semibold">Strengths</div>
                <div className="flex flex-wrap gap-1">
                  {(selected.strengths || []).map((s) => <Badge key={s} tone="green">{s}</Badge>)}
                </div>
              </div>
              <div>
                <div className="mb-1 text-sm font-semibold">Weaknesses</div>
                <div className="flex flex-wrap gap-1">
                  {(selected.weaknesses || []).map((w) => <Badge key={w} tone="rose">{w}</Badge>)}
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold">Recommendations</div>
              {(selected.recommendations || []).map((r, i) => (
                <div key={i} className="rounded bg-slate-50 px-3 py-1.5 text-sm text-slate-600">{r.title}</div>
              ))}
            </div>
            <div className="flex gap-2">
              <a className="btn btn-outline flex-1" href={`/api/teachers/students/${activeId}/report/export`} download>Export Report</a>
              <Link className="btn btn-outline flex-1" to={`/teacher/students/${activeId}`}>Full Detail</Link>
            </div>
          </div>
        )}
      </Modal>

      <div className="space-y-3">
        {students.map((s) => (
          <Card key={s.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-800">{s.full_name}</div>
                <div className="mt-1 text-xs text-slate-400 font-mono">{s.user_id}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone="violet">{s.level}</Badge>
                <span className="font-semibold">{s.overall ?? "—"}</span>
                <button className="btn btn-primary" onClick={() => open(s)}>View</button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}