import { useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card } from "../../components/ui";
import { useToast } from "../../hooks/useToast";

interface AssessmentRow {
  id: number;
  title: string;
  kind: string;
  status: string;
  overall_score: number | null;
  level: string | null;
  started_at: string | null;
}

export function StudentReports() {
  const [assessments, setAssessments] = useState<AssessmentRow[]>([]);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    api
      .get("/assessments")
      .then((res) => setAssessments(res.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const open = async (id: number) => {
    const { data } = await api.get(`/assessments/${id}/report`);
    setSelected(data);
  };

  if (error) return <div className="text-rose-600">{error}</div>;
  if (loading) return <Spinner />;

  if (selected) {
    const scores = Object.entries((selected.scores as Record<string, number>) || {});
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{selected.title as string}</h1>
          <button className="btn btn-outline" onClick={() => setSelected(null)}>← Back</button>
        </div>
        <Card>
          <div className="mb-4 flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-brand-700">{selected.overall_score as number}</div>
              <div className="text-xs text-slate-500">Overall</div>
            </div>
            <div>
              <Badge tone="violet">{selected.level as string}</Badge>
              <p className="mt-2 text-sm text-slate-600">{selected.summary as string}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {scores.map(([k, v]) => (
              <div key={k} className="rounded-lg bg-slate-50 p-3 text-center">
                <div className="text-xs capitalize text-slate-500">{k}</div>
                <div className="text-lg font-semibold">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-sm font-semibold">Strengths</div>
              <div className="flex flex-wrap gap-1">
                {(selected.strengths as string[]).map((s) => <Badge key={s} tone="green">{s}</Badge>)}
              </div>
            </div>
            <div>
              <div className="mb-1 text-sm font-semibold">Weaknesses</div>
              <div className="flex flex-wrap gap-1">
                {(selected.weaknesses as string[]).map((w) => <Badge key={w} tone="rose">{w}</Badge>)}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">My Reports</h1>
      {assessments.filter((a) => a.status === "scored").length === 0 && (
        <p className="text-sm text-slate-400">No scored assessments yet. Take the assessment to generate a report.</p>
      )}
      <div className="space-y-3">
        {assessments
          .filter((a) => a.status === "scored")
          .map((a) => (
            <Card key={a.id}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-800">{a.title}</div>
                  <div className="mt-1 flex gap-2 text-xs text-slate-400">
                    <Badge tone="blue">{a.kind}</Badge>
                    <span>{a.started_at?.slice(0, 10)}</span>
                    <Badge tone="violet">{a.level}</Badge>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-brand-700">{a.overall_score}</span>
                  <button className="btn btn-primary" onClick={() => open(a.id)}>View</button>
                </div>
              </div>
            </Card>
          ))}
      </div>
    </div>
  );
}