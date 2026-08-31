import { Badge, Card } from "../ui";

interface DiscussionReportData {
  discussion: {
    topic: string;
    session_code: string;
    status: string;
    group_score?: Record<string, unknown>;
  };
  group_report?: Record<string, unknown> | null;
  summary?: { major_ideas?: string[]; agreements?: string[]; disagreements?: string[]; conclusion?: string };
  individual_reports?: Record<string, Record<string, number | string>>;
}

export function DiscussionReport({ data }: { data: DiscussionReportData }) {
  const group = (data.group_report || {}) as Record<string, number | string[]>;
  const strengths = Array.isArray(group.group_strengths) ? (group.group_strengths as string[]) : [];
  const weaknesses = Array.isArray(group.group_weaknesses) ? (group.group_weaknesses as string[]) : [];
  const scores = Object.entries(group).filter(
    ([k]) => !["group_strengths", "group_weaknesses", "participant_count", "total_interruptions"].includes(k)
  ) as Array<[string, number]>;
  const individuals = data.individual_reports || {};

  return (
    <div className="space-y-6">
      <Card title={data.discussion.topic}>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge tone="violet">{data.discussion.session_code}</Badge>
          <Badge>{data.discussion.status}</Badge>
          <span className="text-slate-500">Group Score:</span>
          <span className="text-xl font-bold text-brand-700">{Math.round(Number(group.overall_quality ?? group.group_score ?? 0))}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {scores.map(([k, v]) => (
            <div key={k} className="rounded-lg bg-slate-50 p-3 text-center">
              <div className="text-xs capitalize text-slate-500">{k.replace(/_/g, " ")}</div>
              <div className="text-lg font-semibold">{Math.round(Number(v))}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {strengths.map((s) => <Badge key={s} tone="green">{s}</Badge>)}
          {weaknesses.map((w) => <Badge key={w} tone="rose">{w}</Badge>)}
        </div>
      </Card>

      {data.summary && (
        <Card title="AI Discussion Summary">
          <div className="space-y-3 text-sm">
            <div>
              <div className="font-semibold text-slate-600">Major Ideas</div>
              <ul className="list-inside list-disc text-slate-600">
                {(data.summary.major_ideas || []).map((i, idx) => <li key={idx}>{i}</li>)}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-emerald-700">Agreements</div>
              <ul className="list-inside list-disc text-slate-600">
                {(data.summary.agreements || []).map((i, idx) => <li key={idx}>{i}</li>)}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-rose-700">Disagreements</div>
              <ul className="list-inside list-disc text-slate-600">
                {(data.summary.disagreements || []).map((i, idx) => <li key={idx}>{i}</li>)}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-slate-600">Conclusion</div>
              <p className="text-slate-600">{data.summary.conclusion}</p>
            </div>
          </div>
        </Card>
      )}

      <Card title="Individual Participant Reports">
        {Object.keys(individuals).length === 0 && <p className="text-sm text-slate-400">No individual reports yet.</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          {Object.entries(individuals).map(([uid, rep]) => (
            <div key={uid} className="rounded-lg border border-slate-100 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-brand-700">{uid}</span>
                <Badge tone="violet">{Math.round(Number(rep.speaking))}%</Badge>
              </div>
              <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                {["listening", "fluency", "grammar", "vocabulary", "confidence", "participation", "turn_taking", "active_listening"].map((k) => (
                  <div key={k} className="flex justify-between border-b border-slate-50 py-0.5">
                    <span className="capitalize text-slate-500">{k.replace(/_/g, " ")}</span>
                    <span className="font-medium text-slate-700">{rep[k]}</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 text-xs text-slate-500">
                Speech: {Number(rep.speaking_time)}s · Responses: {rep.response_count} · Interruptions: {rep.interruptions_made}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}