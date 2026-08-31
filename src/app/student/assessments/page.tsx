"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { ALL_METRICS } from "@/lib/shared";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ScoreRing } from "@/components/ui/score-ring";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { metricLabel } from "@/lib/insights";
import { Target, Loader2, History, Sparkles } from "lucide-react";

interface AssessmentResult {
  assessmentId: string;
  overall: number;
  level: string;
  scores: { metric: string; score: number; detail?: string }[];
  completedAt: string;
}

type HistoryRow = { id: string; type: string; overall: number | null; level: string | null; completedAt: string | null };

export default function AssessmentPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [current, setCurrent] = useState<{ id: string; type: string } | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [result, setResult] = useState<AssessmentResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    api<HistoryRow[]>("/api/assessments/history").then(setHistory).catch(console.error);
  }, [user, loading, router]);

  if (!user) return null;

  async function startInitial() {
    setBusy(true);
    try {
      const res = await api<{ id: string; type: string }>("/api/assessments", { method: "POST", body: { type: "INITIAL" } });
      setCurrent(res);
      setResult(null);
      setScores({});
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!current) return;
    setBusy(true);
    try {
      const payload = Object.entries(scores).map(([metric, score]) => ({ metric, score }));
      const res = await api<AssessmentResult>(`/api/assessments/${current.id}/submit`, {
        method: "POST",
        body: { results: payload },
      });
      setResult(res);
      setCurrent(null);
      setHistory((prev) => [
        { id: res.assessmentId, type: current.type, overall: res.overall, level: res.level, completedAt: res.completedAt },
        ...prev,
      ]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="AI Assessment"
        title="LSRW Assessment"
        subtitle="Complete all four skills — the AI detects your communication level, strengths, weaknesses and learning path."
        icon={<Target className="h-6 w-6" />}
        gradient="bg-gradient-brand"
      />

      {!current && !result && (
        <Card className="relative overflow-hidden p-10 text-center">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-brand opacity-10 blur-3xl" />
          <span className="text-5xl">🎯</span>
          <h2 className="mt-4 font-display text-2xl font-extrabold text-ink-900">Start your AI Assessment</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
            A full LSRW evaluation across Listening, Speaking, Reading and Writing. Get your level,
            detailed scores, strengths, weaknesses and a personalized recommendation.
          </p>
          <Button variant="gradient" size="xl" className="mt-7" onClick={startInitial} disabled={busy}>
            {busy ? <><Loader2 className="h-5 w-5 animate-spin" /> Creating assessment…</> : <><Sparkles className="h-5 w-5" /> Start Initial Assessment</>}
          </Button>
        </Card>
      )}

      {current && !result && (
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-extrabold text-ink-900">{current.type} Assessment</h2>
            <Badge tone="primary">In progress</Badge>
          </div>
          <p className="mt-1 text-sm text-ink-500">Score each communication metric (0–100). In the full build each metric is scored automatically from your task performance.</p>

          <div className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">
            {ALL_METRICS.map((m) => {
              const v = scores[m] ?? 50;
              return (
                <div key={m}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink-700">{metricLabel(m)}</span>
                    <span className="font-mono font-bold text-primary-600">{v}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={v}
                    onChange={(e) => setScores((prev) => ({ ...prev, [m]: Number(e.target.value) }))}
                    className="w-full accent-primary-600"
                    aria-label={`${metricLabel(m)} score`}
                  />
                </div>
              );
            })}
          </div>

          <Button variant="gradient" size="lg" className="mt-7" full onClick={submit} disabled={busy}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Computing report…</> : "Submit & Get Report"}
          </Button>
        </Card>
      )}

      {result && (
        <div className="space-y-6 animate-fade-in-up">
          <Card className="relative overflow-hidden p-8">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-gradient-brand opacity-10 blur-3xl" />
            <div className="flex flex-col items-center gap-8 sm:flex-row">
              <ScoreRing value={result.overall} size={170} from="#6366F1" to="#8B5CF6">
                <span className="font-display text-4xl font-extrabold text-ink-900">{result.overall}</span>
                <span className="text-xs font-semibold text-ink-400">/ 100</span>
              </ScoreRing>
              <div className="text-center sm:text-left">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink-400">Your Communication Level</p>
                <p className="mt-1 font-display text-4xl font-extrabold capitalize text-primary-600">{result.level}</p>
                <p className="mt-2 max-w-sm text-sm text-ink-500">
                  The AI built your personalized profile. Check your dashboard and learning path for what to practice next.
                </p>
                <div className="mt-4 flex gap-3">
                  <Button variant="gradient" onClick={() => window.location.assign("/dashboard")}>Go to Dashboard</Button>
                  <Button variant="outline" onClick={() => window.location.assign("/progress")}>View Progress</Button>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Detailed Scores" subtitle="Per-metric breakdown of this assessment" icon="📊" />
            <div className="grid gap-x-10 gap-y-4 p-6 sm:grid-cols-2">
              {result.scores.map((s) => (
                <div key={s.metric}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-semibold text-ink-700">{metricLabel(s.metric)}</span>
                    <span className="font-mono font-bold text-ink-900">{s.score}</span>
                  </div>
                  <ProgressBar value={s.score} color={s.score >= 80 ? "bg-emerald-500" : s.score >= 60 ? "bg-gradient-brand" : "bg-amber-500"} />
                  {s.detail && <p className="mt-0.5 text-[11px] text-ink-400">{s.detail}</p>}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* HISTORY */}
      <Card>
        <CardHeader title="Assessment History" subtitle="All your past assessments" icon={<History className="h-4 w-4 text-primary-600" />} />
        <div className="p-5">
          {history.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ink-200 p-8 text-center text-sm text-ink-400">No assessments yet. Start your first one above.</p>
          ) : (
            <ul className="space-y-2.5">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between rounded-xl bg-ink-50 px-4 py-3 transition-colors hover:bg-primary-50">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">🎯</span>
                    <div>
                      <p className="text-sm font-bold text-ink-800">{h.type}</p>
                      {h.completedAt && <p className="text-[11px] text-ink-400">{new Date(h.completedAt).toLocaleString()}</p>}
                    </div>
                  </div>
                  <Badge tone={h.overall && h.overall >= 80 ? "success" : h.overall && h.overall >= 60 ? "primary" : "warning"}>
                    {h.overall ?? "—"}% · {h.level ?? "—"}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}