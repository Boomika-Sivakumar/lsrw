import { useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card } from "../../components/ui";
import { BeforeAfterChart, ProgressLine, SkillBars, SkillTrend } from "../../components/charts";

interface ProgressData {
  daily: Array<{ date: string; scores: Record<string, number>; activities: number }>;
  skill_history: Array<{ date: string; scores: Record<string, number>; overall: number; source: string }>;
  skill_timeline: Record<string, Array<{ date: string; score: number }>>;
  before_after: {
    available: boolean;
    initial?: { scores: Record<string, number>; overall: number; level: string };
    current?: { scores: Record<string, number>; overall: number; level: string };
  };
}

export function StudentProgress() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/students/me/progress")
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <div className="text-rose-600">{error}</div>;
  if (!data) return <Spinner label="Loading progress…" />;

  const ba = data.before_after;
  const beforeAfterChart =
    ba.available && ba.initial && ba.current
      ? Object.keys({ ...ba.initial.scores, ...ba.current.scores }).map((k) => ({
          name: k,
          before: ba.initial!.scores[k] ?? 0,
          after: ba.current!.scores[k] ?? 0,
        }))
      : [];

  const lineData = data.skill_history.map((s) => ({ date: s.date?.slice(0, 10) || "", overall: s.overall }));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold">My Progress</h1>

      {ba.available && ba.initial && ba.current && (
        <Card title={`Before vs After — Improvement ${Math.round((ba.current.overall - ba.initial.overall) * 10) / 10 > 0 ? `+${(ba.current.overall - ba.initial.overall).toFixed(1)}` : (ba.current.overall - ba.initial.overall).toFixed(1)} points`}>
          <div className="mb-3 grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-slate-50 p-3">
              <div className="text-xs text-slate-500">Initial</div>
              <div className="text-2xl font-bold text-slate-600">{ba.initial.overall}</div>
              <div className="text-xs text-slate-400">{ba.initial.level}</div>
            </div>
            <div className="rounded-lg bg-brand-50 p-3">
              <div className="text-xs text-slate-500">Current</div>
              <div className="text-2xl font-bold text-brand-700">{ba.current.overall}</div>
              <div className="text-xs text-slate-400">{ba.current.level}</div>
            </div>
            <div className="rounded-lg bg-emerald-50 p-3">
              <div className="text-xs text-slate-500">Change</div>
              <div className="text-2xl font-bold text-emerald-600">
                {Math.round((ba.current.overall - ba.initial.overall) * 10) / 10 > 0 ? "+" : ""}
                {(ba.current.overall - ba.initial.overall).toFixed(1)}
              </div>
              <div className="text-xs text-slate-400">points</div>
            </div>
          </div>
          <BeforeAfterChart data={beforeAfterChart} />
        </Card>
      )}
      {!ba.available && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Complete both an initial and a final assessment to unlock the before-vs-after comparison.
        </div>
      )}

      <Card title="Overall Trend">
        {lineData.length ? <ProgressLine data={lineData} /> : <p className="py-8 text-center text-sm text-slate-400">No history yet.</p>}
      </Card>

      <Card title="Skill Timeline">
        {Object.keys(data.skill_timeline || {}).some((s) => (data.skill_timeline[s]?.length ?? 0) > 0) ? (
          <SkillTrend data={data.skill_timeline} />
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">Complete more activities to see per-skill trends.</p>
        )}
      </Card>

      <Card title="Daily Activity">
        {data.daily.length ? (
          <div className="space-y-2">
            {data.daily.slice(-14).reverse().map((d, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-600">{d.date?.slice(0, 10)}</span>
                <span className="flex items-center gap-2">
                  <Badge tone="blue">{d.activities} activities</Badge>
                  <span className="font-medium">{Math.round(Object.values(d.scores).reduce((a, b) => a + b, 0) / Math.max(Object.keys(d.scores).length, 1))}%</span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">No activity recorded yet.</p>
        )}
      </Card>

      {data.skill_history.length > 0 && (
        <Card title="Latest Skill Scores">
          <SkillBars data={Object.entries(data.skill_history[data.skill_history.length - 1].scores || {}).map(([name, value]) => ({ name, value }))} />
        </Card>
      )}
    </div>
  );
}