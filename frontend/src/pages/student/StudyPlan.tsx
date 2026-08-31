import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card } from "../../components/ui";
import { useToast } from "../../hooks/useToast";

interface StudyPlan {
  available: boolean;
  id?: number;
  weeks: Array<{ week: number; focus: string; activities: string[] }>;
  based_on?: { level?: string; weaknesses?: string[]; goals?: string[] };
  created_at?: string | null;
}

export function StudyPlanPage() {
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api
      .get("/students/me/study-plan")
      .then((res) => setPlan(res.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const regenerate = async () => {
    setRegenerating(true);
    setError(null);
    try {
      const { data } = await api.post<StudyPlan>("/students/me/study-plan/regenerate");
      setPlan(data);
      toast("Personalized study plan regenerated");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) return <Spinner label="Loading your study plan…" />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Personalized Study Plan</h1>
          <p className="text-sm text-slate-500">
            A weekly plan built from your skill scores, weaknesses, and goals.
          </p>
        </div>
        <button className="btn btn-outline" onClick={regenerate} disabled={regenerating}>
          {regenerating ? "Building plan…" : "Regenerate plan"}
        </button>
      </div>

      {error && <div className="text-sm text-rose-600">{error}</div>}

      {!plan?.available || plan.weeks.length === 0 ? (
        <Card>
          <p className="py-10 text-center text-sm text-slate-400">
            No study plan yet. Complete an assessment to generate your personalized plan.
          </p>
        </Card>
      ) : (
        <>
          {plan.based_on && (plan.based_on.level || plan.based_on.weaknesses?.length) && (
            <Card title="Based on">
              <div className="flex flex-wrap gap-2 text-xs">
                {plan.based_on.level && <Badge tone="violet">Level: {plan.based_on.level}</Badge>}
                {(plan.based_on.weaknesses || []).map((w) => (
                  <Badge key={w} tone="rose">{w}</Badge>
                ))}
                {(plan.based_on.goals || []).map((g) => (
                  <Badge key={g} tone="blue">{g.replace(/-/g, " ")}</Badge>
                ))}
              </div>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {plan.weeks.map((w) => (
              <Card key={w.week} title={`Week ${w.week} — ${w.focus}`}>
                <ul className="space-y-2">
                  {w.activities.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                      <span className="mt-0.5 text-brand-500">▸</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <div className="rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-700">
            💡 Tip: Follow one week at a time and revisit your plan after each assessment — it updates as you improve.
          </div>
        </>
      )}
    </div>
  );
}