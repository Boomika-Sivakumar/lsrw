import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card } from "../../components/ui";
import { LevelDistribution } from "../../components/charts";

interface InsightStudent {
  student_id: number;
  username: string;
  full_name: string;
  user_id: string;
  level: string;
  overall: number;
  narrative: string;
  focus_areas: string[];
  suggested_interventions: string[];
  recent_mistakes: Array<{ category: string; text: string; occurrences: number }>;
}

interface InsightsData {
  generated_at: string | null;
  class_narrative: string;
  class_average: number;
  level_distribution: Record<string, number>;
  at_risk_count: number;
  students: InsightStudent[];
}

export function TeacherInsights() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/teachers/insights")
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <div className="text-rose-600">{error}</div>;
  if (!data) return <Spinner label="Generating AI insights…" />;

  const atRisk = data.students.filter((s) => s.overall && s.overall < 60);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">AI Insights</h1>
          <p className="text-sm text-slate-500">
            AI-generated narratives and suggested interventions for every student.
            {data.generated_at && ` Generated at ${new Date(data.generated_at).toLocaleString()}.`}
          </p>
        </div>
      </div>

      <div className="card border-l-4 border-brand-500 bg-brand-50/50 p-5">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand-600">Class narrative</div>
        <p className="mt-1 text-sm text-slate-700">{data.class_narrative}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Class Average">
          <div className="text-3xl font-bold text-brand-700">{data.class_average}</div>
        </Card>
        <Card title="At Risk">
          <div className={`text-3xl font-bold ${data.at_risk_count > 0 ? "text-rose-600" : "text-emerald-600"}`}>
            {data.at_risk_count}
          </div>
          <p className="text-xs text-slate-400">students below 60 overall</p>
        </Card>
        <Card title="Level Distribution">
          <LevelDistribution data={data.level_distribution} />
        </Card>
      </div>

      {atRisk.length > 0 && (
        <div className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
          ⚠️ Students needing attention: {atRisk.map((s) => s.full_name).join(", ")}
        </div>
      )}

      <div className="space-y-4">
        {data.students.map((s) => (
          <Card key={s.student_id} title={s.full_name} subtitle={`${s.user_id} · ${s.level} · overall ${s.overall}`}>
            <div className="space-y-3">
              <p className="text-sm text-slate-700">{s.narrative}</p>
              <div className="flex flex-wrap gap-2">
                {s.focus_areas.map((f) => (
                  <Badge key={f} tone="amber">{f}</Badge>
                ))}
              </div>
              {s.suggested_interventions.length > 0 && (
                <div className="rounded-lg bg-slate-50 p-3">
                  <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Suggested interventions</div>
                  <ul className="space-y-1">
                    {s.suggested_interventions.map((intv, i) => (
                      <li key={i} className="text-sm text-slate-600">▸ {intv}</li>
                    ))}
                  </ul>
                </div>
              )}
              {s.recent_mistakes.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {s.recent_mistakes.map((m, i) => (
                    <span key={i} className="rounded-full bg-rose-50 px-2 py-0.5 text-xs text-rose-600">
                      {m.category} ×{m.occurrences}: {m.text}
                    </span>
                  ))}
                </div>
              )}
              <Link to={`/teacher/students/${s.student_id}`} className="text-xs font-medium text-brand-600 hover:underline">
                View full profile →
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}