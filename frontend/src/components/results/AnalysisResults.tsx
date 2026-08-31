import type { AnalysisResult } from "../../types";
import { Badge, Card } from "../ui";

export function AnalysisResults({ result }: { result: AnalysisResult }) {
  const scores = Object.entries(result.scores);
  return (
    <div className="space-y-4">
      <Card>
        <div className="mb-4 flex items-center gap-6">
          <div className="text-center">
            <div className="text-4xl font-bold text-brand-700">{Math.round(result.overall)}</div>
            <div className="text-xs text-slate-500">Overall Score</div>
          </div>
          <div className="flex-1">
            <div className="mb-2 text-sm font-medium">Feedback</div>
            <p className="text-sm text-slate-600">{result.feedback}</p>
          </div>
        </div>
        {result.word_count !== undefined && (
          <div className="mb-3 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>Words: <b>{result.word_count}</b></span>
            {result.wpm !== undefined && <span>Speed: <b>{result.wpm} wpm</b></span>}
            {result.accuracy !== undefined && <span>Accuracy: <b>{result.accuracy}%</b></span>}
            {result.fillers && <span>Fillers: <b>{result.fillers.length}</b></span>}
          </div>
        )}
      </Card>

      <Card title="Scores">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {scores.map(([k, v]) => (
            <div key={k} className="rounded-lg bg-slate-50 p-3 text-center">
              <div className="text-xs capitalize text-slate-500">{k.replace(/_/g, " ")}</div>
              <div className="text-xl font-semibold text-slate-700">{Math.round(v)}</div>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Strengths">
          <div className="flex flex-wrap gap-2">
            {(result.strengths || []).map((s, i) => <Badge key={i} tone="green">{s}</Badge>)}
            {!result.strengths?.length && <p className="text-sm text-slate-400">None recorded</p>}
          </div>
        </Card>
        <Card title="Weaknesses">
          <div className="flex flex-wrap gap-2">
            {(result.weaknesses || []).map((w, i) => <Badge key={i} tone="rose">{w}</Badge>)}
            {!result.weaknesses?.length && <p className="text-sm text-slate-400">None recorded</p>}
          </div>
        </Card>
      </div>

      {(result.corrections || []).length > 0 && (
        <Card title="Corrections">
          <div className="space-y-3">
            {result.corrections?.map((c, i) => (
              <div key={i} className="rounded-lg bg-slate-50 p-3 text-sm">
                <div className="text-slate-500"><span className="font-medium">Original:</span> {c.original || c.problem}</div>
                <div className="text-emerald-700"><span className="font-medium">Corrected:</span> {c.corrected}</div>
                {c.explanation && <div className="mt-1 text-xs text-slate-500">{c.explanation}</div>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {result.corrected_text && (
        <Card title="Corrected Version">
          <p className="whitespace-pre-wrap text-sm text-slate-700">{result.corrected_text}</p>
        </Card>
      )}

      {(result.mistakes || []).length > 0 && (
        <Card title="Mistakes">
          <div className="space-y-2">
            {result.mistakes?.map((m, i) => (
              <div key={i} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3 text-sm">
                <div>
                  <div className="text-slate-700">{m.text}</div>
                  {m.explanation && <div className="text-xs text-slate-500">{m.explanation}</div>}
                </div>
                <Badge tone="amber">{m.category}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="Recommendations">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
          {(result.recommendations || []).map((r, i) => <li key={i}>{r}</li>)}
          {!result.recommendations?.length && <li>No recommendations yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
