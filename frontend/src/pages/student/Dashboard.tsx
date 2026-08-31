import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card, ProgressBar, ScoreRing } from "../../components/ui";
import { BeforeAfterChart, MistakeHeatmap, ProgressLine, SkillRadar } from "../../components/charts";
import { useToast } from "../../hooks/useToast";
import type { Scores } from "../../types";

interface DashboardData {
  user: { full_name: string; user_id: string | null; role: string };
  overall: number;
  level: string;
  target_level: string;
  goals: string[];
  scores: Scores;
  strengths: string[];
  weaknesses: string[];
  skill_gaps: Record<string, string>;
  recent_mistakes: Array<{ category: string; text: string; corrected_text: string; explanation: string; occurrences: number }>;
  recommendations: Array<{ category: string; title: string; detail: string; activity: string }>;
  assessments: Array<{ id: number; title: string; kind: string; status: string; overall_score: number | null }>;
  total_activities: number;
  charts: { daily: Array<{ date: string; overall: number }>; weekly: Array<{ date: string; overall: number }>; monthly: Array<{ date: string; overall: number }> };
  before_after?: unknown;
}

export function StudentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [heatmap, setHeatmap] = useState<{ weeks: string[]; categories: string[]; grid: Record<string, Record<string, number>> } | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    api
      .get("/students/me/dashboard")
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)));
    api
      .get("/students/me/mistakes/heatmap")
      .then((res) => setHeatmap(res.data))
      .catch(() => {});
  }, []);

  if (error) return <div className="text-rose-600">{error}</div>;
  if (!data) return <Spinner label="Loading dashboard…" />;

  const skillRows = Object.entries(data.scores).map(([name, value]) => ({ name, value }));
  const radar = Object.entries(data.scores).map(([skill, score]) => ({ skill, score }));
  const hasChart = data.charts.weekly.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Welcome, {data.user.full_name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-slate-500">
            User ID: <span className="font-semibold text-brand-600">{data.user.user_id}</span> · Level:{" "}
            <Badge tone="violet">{data.level}</Badge> · Target: {data.target_level}
          </p>
        </div>
        <Link to="/student/assessment" className="btn btn-primary">
          Take Assessment
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="card flex flex-col items-center justify-center p-5">
          <ScoreRing value={data.overall} />
          <div className="mt-2 text-sm font-medium text-slate-600">Overall Communication</div>
        </div>
        <Card title="Strengths">
          {data.strengths.length ? (
            data.strengths.map((s) => <Badge key={s} tone="green">{s}</Badge>)
          ) : (
            <p className="text-sm text-slate-400">Complete an assessment to see strengths.</p>
          )}
        </Card>
        <Card title="Weaknesses">
          {data.weaknesses.length ? (
            data.weaknesses.map((w) => <Badge key={w} tone="rose">{w}</Badge>)
          ) : (
            <p className="text-sm text-slate-400">No major weaknesses detected yet.</p>
          )}
        </Card>
        <Card title="Activity">
          <div className="text-2xl font-bold text-brand-700">{data.total_activities}</div>
          <p className="text-sm text-slate-500">recorded activities</p>
          {data.goals.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {data.goals.slice(0, 3).map((g) => (
                <Badge key={g}>{g.replace(/-/g, " ")}</Badge>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Skill Scores">
          <SkillBars data={skillRows} />
        </Card>
        <Card title="Skill Radar">
          {radar.length ? <SkillRadar data={radar} /> : <p className="text-sm text-slate-400">No scores yet.</p>}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Weekly Progress">
          {hasChart ? (
            <ProgressLine data={data.charts.weekly} />
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No progress data yet. Take the initial assessment!</p>
          )}
        </Card>
        <Card title="Mistake Heatmap" subtitle="Last 12 weeks">
          {heatmap && heatmap.categories.some((c) => Object.values(heatmap.grid).some((row) => (row[c] ?? 0) > 0)) ? (
            <MistakeHeatmap weeks={heatmap.weeks} categories={heatmap.categories} grid={heatmap.grid} />
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No mistakes recorded yet. Keep practicing!</p>
          )}
          {data.recent_mistakes.length > 0 && (
            <details className="mt-3">
              <summary className="cursor-pointer text-xs font-medium text-brand-600">View recent mistakes</summary>
              <div className="mt-2 space-y-2">
                {data.recent_mistakes.map((m, i) => (
                  <div key={i} className="rounded-lg bg-slate-50 p-3">
                    <div className="mb-1 flex justify-between">
                      <Badge tone="amber">{m.category}</Badge>
                      <span className="text-xs text-slate-400">×{m.occurrences}</span>
                    </div>
                    <p className="text-sm text-slate-700">{m.text}</p>
                    {m.corrected_text && <p className="mt-1 text-sm text-emerald-600">→ {m.corrected_text}</p>}
                  </div>
                ))}
              </div>
            </details>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Recommendations">
          {data.recommendations.length ? (
            <div className="space-y-3">
              {data.recommendations.map((r, i) => (
                <div key={i} className="rounded-lg border border-slate-100 p-3">
                  <div className="text-sm font-medium text-slate-700">{r.title}</div>
                  <div className="text-xs text-slate-500">{r.detail}</div>
                  <div className="mt-1 text-xs text-brand-600">▶ {r.activity}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">No recommendations yet.</p>
          )}
        </Card>
        <Card title="Skill Gaps vs Target">
          {Object.keys(data.skill_gaps).length ? (
            <div className="space-y-2">
              {Object.entries(data.skill_gaps)
                .filter(([, v]) => v !== "None")
                .map(([skill, gap]) => (
                  <div key={skill} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-slate-600">{skill}</span>
                    <Badge tone={gap === "High" ? "rose" : gap === "Medium" ? "amber" : "blue"}>{gap}</Badge>
                  </div>
                ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-400">Complete an assessment to analyze skill gaps.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function SkillBars({ data }: { data: Array<{ name: string; value: number }> }) {
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.name}>
          <div className="mb-1 flex justify-between text-xs text-slate-500">
            <span className="capitalize">{d.name}</span>
            <span className="font-medium">{Math.round(d.value)}</span>
          </div>
          <ProgressBar value={d.value} />
        </div>
      ))}
    </div>
  );
}
