import { useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Card, ProgressBar } from "../../components/ui";
import { LevelDistribution, SkillBars } from "../../components/charts";

interface Analytics {
  class_average: number;
  averages: Record<string, number>;
  strongest_skill: string;
  weakest_skill: string;
  common_mistakes: Array<{ category: string; text: string; count: number }>;
  level_distribution: Record<string, number>;
  student_count: number;
}

export function TeacherAnalytics() {
  const [data, setData] = useState<Analytics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/teachers/analytics")
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <div className="text-rose-600">{error}</div>;
  if (!data) return <Spinner label="Loading analytics…" />;

  const skills = Object.entries(data.averages).filter(([, v]) => v > 0);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Class Analytics</h1>
        <a className="btn btn-outline" href="/api/teachers/analytics/export" download>Export CSV</a>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card title="Class Average"><div className="text-2xl font-bold text-brand-700">{data.class_average}</div></Card>
        <Card title="Students"><div className="text-2xl font-bold">{data.student_count}</div></Card>
        <Card title="Strongest"><div className="text-lg font-semibold capitalize text-emerald-600">{data.strongest_skill || "—"}</div></Card>
        <Card title="Weakest"><div className="text-lg font-semibold capitalize text-rose-600">{data.weakest_skill || "—"}</div></Card>
      </div>

      <Card title="Level Distribution">
        <LevelDistribution data={data.level_distribution} />
      </Card>

      <Card title="Average Skill Scores">
        {skills.length ? (
          <div className="space-y-2">
            {skills.map(([name, value]) => (
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

      <Card title="Common Class Mistakes">
        {data.common_mistakes.length ? (
          <div className="space-y-2">
            {data.common_mistakes.map((m, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <div>
                  <span className="font-medium text-slate-700">{m.text}</span>
                  <span className="ml-2 text-xs text-slate-400">({m.category})</span>
                </div>
                <span className="font-medium">×{m.count}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-6 text-center text-sm text-slate-400">No mistakes recorded yet.</p>
        )}
      </Card>
    </div>
  );
}