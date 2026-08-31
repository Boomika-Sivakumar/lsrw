import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card, ProgressBar } from "../../components/ui";

interface ReportData {
  user?: { full_name?: string; user_id?: string };
  scores?: Record<string, number>;
  overall?: number;
  level?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommendations?: Array<{ title: string; detail?: string; activity?: string }>;
  recent_mistakes?: Array<{ category: string; text: string; corrected_text: string; explanation: string }>;
}

export function TeacherStudentDetail() {
  const { id } = useParams();
  const [dash, setDash] = useState<Record<string, unknown> | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get(`/teachers/students/${id}`)
      .then((res) => setDash(res.data))
      .catch((err) => setError(errorMessage(err)));
    api
      .get(`/teachers/students/${id}/report`)
      .then((res) => setReport(res.data))
      .catch(() => {});
  }, [id]);

  if (error) return <div className="text-rose-600">{error}</div>;
  if (!dash) return <Spinner label="Loading student…" />;

  const user = dash.user as { full_name?: string; user_id?: string };
  const scores = (dash.scores as Record<string, number>) || {};
  const assessments = (dash.assessments as Array<Record<string, unknown>>) || [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{user.full_name}</h1>
          <div className="text-sm text-slate-400">
            <span className="font-mono text-brand-600">{user.user_id}</span> · Level <Badge tone="violet">{dash.level as string}</Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <a className="btn btn-outline" href={`/api/teachers/students/${id}/report/export`} download>Export Report</a>
          <Link to="/teacher/students" className="btn btn-outline">← Back</Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Overall"><div className="text-2xl font-bold text-brand-700">{(dash.overall as number) ?? "—"}</div></Card>
        <Card title="Target"><div className="text-2xl font-bold">{dash.target_level as string}</div></Card>
        <Card title="Activities"><div className="text-2xl font-bold">{dash.total_activities as number}</div></Card>
        <Card title="Goal Gap">
          <div className="text-xl font-bold text-amber-600">
            {(dash.skill_gaps as Array<Record<string, unknown>>)?.length || 0}
          </div>
          <div className="text-xs text-slate-400">skills below target</div>
        </Card>
      </div>

      <Card title="Skill Scores">
        {Object.keys(scores).length ? (
          <div className="space-y-2">
            {Object.entries(scores).map(([name, value]) => (
              <div key={name}>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span className="capitalize">{name}</span>
                  <span className="font-medium">{Math.round(value)}</span>
                </div>
                <ProgressBar value={value} />
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">No scores yet.</p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Strengths">
          <div className="flex flex-wrap gap-2">
            {(dash.strengths as string[] || []).map((s) => <Badge key={s} tone="green">{s}</Badge>)}
            {!((dash.strengths as string[]) || []).length && <span className="text-sm text-slate-400">—</span>}
          </div>
        </Card>
        <Card title="Weaknesses">
          <div className="flex flex-wrap gap-2">
            {(dash.weaknesses as string[] || []).map((w) => <Badge key={w} tone="rose">{w}</Badge>)}
            {!((dash.weaknesses as string[]) || []).length && <span className="text-sm text-slate-400">—</span>}
          </div>
        </Card>
      </div>

      {report && report.scores && (
        <Card title="Full Report">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(report.scores).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-slate-50 p-3 text-center">
                <div className="text-xs capitalize text-slate-500">{k}</div>
                <div className="text-lg font-semibold">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <div className="mb-2 text-sm font-semibold">Recommendations</div>
            <div className="space-y-2">
              {(report.recommendations || []).map((r, i) => (
                <div key={i} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">{r.title}</span>
                  {r.detail && <span className="ml-2 text-slate-500">{r.detail}</span>}
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card title="Assessment History">
        {assessments.length ? (
          <div className="space-y-2">
            {assessments.map((a) => (
              <div key={a.id as number} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-slate-700">{a.title as string}</span>
                  <span className="ml-2 text-xs text-slate-400">{a.started_at as string}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone="blue">{a.kind as string}</Badge>
                  <Badge>{a.status as string}</Badge>
                  <span className="font-semibold">{(a.overall_score as number) ?? "—"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">No assessments yet.</p>
        )}
      </Card>
    </div>
  );
}