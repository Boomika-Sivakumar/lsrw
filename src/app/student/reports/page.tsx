"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ScoreRing } from "@/components/ui/score-ring";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { metricLabel, deriveStrengths, deriveWeaknesses } from "@/lib/insights";
import { FileDown, Share2, Sparkles } from "lucide-react";

interface ReportData {
  assessments: { id: string; type: string; overall: number; level: string; completedAt: string; results: { metric: string; score: number }[] }[];
  mistakes: { type: string; message: string; correction?: string; occurrences: number }[];
  recommendations: { skill: string; suggestion: string; activities: string[]; priority: string }[];
}

interface DashData {
  level: string | null;
  overall: number;
  scores: Record<string, number>;
  recentSessions: unknown[];
}

const LSRW_ORDER = ["LISTENING", "SPEAKING", "READING", "WRITING"];

export default function ReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [dash, setDash] = useState<DashData | null>(null);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    api<ReportData>("/api/users/me/report").then(setReport).catch(console.error);
    api<DashData>("/api/users/me/dashboard").then(setDash).catch(console.error);
  }, [user, loading, router]);

  if (!user) return null;
  if (loading || !report || !dash) return <PageSkeleton />;

  const strengths = deriveStrengths(dash.scores);
  const weaknesses = deriveWeaknesses(dash.scores);

  function downloadPDF() {
    window.print();
  }

  async function share() {
    const url = window.location.href;
    const me = user!;
    const d = dash!;
    try {
      if (navigator.share) {
        await navigator.share({ title: "LSRW Report", text: `${me.name} (${me.userId}) — ${d.overall}/100`, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      /* cancelled */
    }
  }

  return (
    <div className="space-y-8 print:space-y-4">
      <div className="print:hidden">
        <PageHeader
          eyebrow="Reports"
          title="Communication Report"
          subtitle="Your full AI-generated performance report — printable and shareable."
          icon={<FileDown className="h-6 w-6" />}
          gradient="bg-gradient-brand"
          right={
            <div className="flex gap-2">
              <button onClick={downloadPDF} className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5">
                <FileDown className="h-4 w-4" /> Download PDF
              </button>
              <button onClick={share} className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-5 py-2.5 text-sm font-bold text-ink-700 transition-colors hover:border-primary-400">
                <Share2 className="h-4 w-4" /> {shared ? "Copied!" : "Share Report"}
              </button>
            </div>
          }
        />
      </div>

      {/* PRINT HEADER */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-extrabold">LSRW COMMUNICATION ASSESSMENT</h1>
        <p className="mt-1 text-sm">User ID: {user.userId} · {user.name} · {new Date().toLocaleDateString()}</p>
      </div>

      {/* OVERALL */}
      <Card className="p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row">
          <ScoreRing value={dash.overall} size={170} from="#6366F1" to="#8B5CF6">
            <span className="font-display text-4xl font-extrabold text-ink-900">{dash.overall}</span>
            <span className="text-xs font-semibold text-ink-400">/ 100</span>
          </ScoreRing>
          <div className="text-center sm:text-left">
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-ink-400">Overall Score</p>
            <p className="mt-1 font-display text-4xl font-extrabold capitalize text-primary-600">{dash.level ?? "—"}</p>
            <p className="mt-1 font-mono text-sm font-bold text-ink-500">User ID: {user.userId}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {LSRW_ORDER.map((m) => (
            <div key={m} className="rounded-2xl bg-ink-50 p-4 text-center">
              <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{metricLabel(m)}</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-ink-900">{dash.scores[m] ?? 0}%</p>
            </div>
          ))}
        </div>
      </Card>

      {/* STRENGTHS / WEAKNESSES */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-emerald-700">✨ Strengths</h3>
          <ul className="mt-3 space-y-2">
            {strengths.length ? strengths.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm text-ink-700"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] text-emerald-700">✓</span> Strong {s.toLowerCase()}</li>
            )) : <li className="text-sm text-ink-400">Keep practicing — strengths appear after more sessions.</li>}
          </ul>
        </Card>
        <Card className="p-6">
          <h3 className="text-sm font-bold uppercase tracking-wide text-amber-700">⚠️ Weaknesses</h3>
          <ul className="mt-3 space-y-2">
            {weaknesses.length ? weaknesses.map((s) => (
              <li key={s} className="flex items-center gap-2 text-sm text-ink-700"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[10px] text-amber-700">⚠</span> {s}</li>
            )) : <li className="text-sm text-ink-400">No major weaknesses detected. Excellent!</li>}
          </ul>
        </Card>
      </div>

      {/* MISTAKES */}
      <Card>
        <CardHeader title="Detected Mistakes" subtitle="From your practice sessions and assessments" icon="🔍" />
        <div className="p-5">
          {report.mistakes.length === 0 ? (
            <p className="text-sm text-ink-400">No mistakes recorded yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {report.mistakes.slice(0, 12).map((m, i) => (
                <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm">
                  <Badge tone="warning">{m.type}</Badge>
                  <span className="text-ink-700">{m.message}</span>
                  {m.correction && <span className="font-semibold text-emerald-700">→ {m.correction}</span>}
                  <span className="ml-auto text-xs font-semibold text-ink-400">×{m.occurrences}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      {/* RECOMMENDATIONS */}
      <Card>
        <CardHeader title="AI Recommendations" subtitle="Personalized next steps" icon={<Sparkles className="h-4 w-4 text-violet-600" />} />
        <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {report.recommendations.length === 0 ? (
            <p className="text-sm text-ink-400 sm:col-span-2">Complete sessions to receive AI recommendations.</p>
          ) : (
            report.recommendations.map((r, i) => (
              <div key={i} className="rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{r.skill}</p>
                  <Badge tone={r.priority === "HIGH" ? "danger" : r.priority === "MEDIUM" ? "warning" : "success"}>{r.priority}</Badge>
                </div>
                <p className="mt-2 text-sm font-medium text-ink-800">{r.suggestion}</p>
                {r.activities.length > 0 && (
                  <p className="mt-2 text-xs text-ink-500">Activities: {r.activities.join(", ")}</p>
                )}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* ASSESSMENT HISTORY (print detail) */}
      <Card>
        <CardHeader title="Assessment History" subtitle="Your assessments with per-metric scores" icon="🎯" />
        <div className="p-5">
          {report.assessments.length === 0 ? (
            <p className="text-sm text-ink-400">No assessments yet.</p>
          ) : (
            <div className="space-y-4">
              {report.assessments.slice(0, 3).map((a) => (
                <div key={a.id} className="rounded-xl border border-ink-100 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-ink-800">{a.type} · {a.level}</p>
                    <p className="font-mono text-sm font-bold text-primary-600">{a.overall}/100</p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-ink-400">{new Date(a.completedAt).toLocaleString()}</p>
                  <div className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {a.results.map((r) => (
                      <div key={r.metric}>
                        <div className="mb-0.5 flex justify-between text-xs">
                          <span className="font-medium text-ink-600">{metricLabel(r.metric)}</span>
                          <span className="font-mono font-bold text-ink-800">{r.score}</span>
                        </div>
                        <ProgressBar value={r.score} color={r.score >= 80 ? "bg-emerald-500" : r.score >= 60 ? "bg-gradient-brand" : "bg-amber-500"} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}