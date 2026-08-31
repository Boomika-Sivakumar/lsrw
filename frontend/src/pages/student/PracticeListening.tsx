import { useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card } from "../../components/ui";
import { stopSpeaking } from "../../audio/tts";
import { AudioButton } from "../../components/AudioButton";
import { useToast } from "../../hooks/useToast";
import type { AnalysisResult } from "../../types";
import { AnalysisResults } from "../../components/results/AnalysisResults";

interface ScriptItem {
  title: string;
  script: string;
  questions: Array<{ q: string; answer: string }>;
}

export function PracticeListening() {
  const [content, setContent] = useState<ScriptItem[] | null>(null);
  const [active, setActive] = useState<ScriptItem | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    api
      .post("/practice/listening", { skill: "listening", mode: "generate" })
      .then((res) => setContent(res.data.content))
      .catch((err) => setError(errorMessage(err)));
    return () => stopSpeaking();
  }, []);

  if (error) return <div className="text-rose-600">{error}</div>;
  if (!content) return <Spinner label="Loading listening exercises…" />;

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <AnalysisResults result={result} />
        <button className="btn btn-outline" onClick={() => { setResult(null); setAnswers({}); }}>Try Another</button>
      </div>
    );
  }

  if (active) {
    const submit = async () => {
      setLoading(true);
      setError(null);
      try {
        const payload = active.questions.map((q) => ({ question: q.q, answer: answers[q.q] || "", expected: q.answer }));
        const { data } = await api.post("/practice/listening", {
          skill: "listening",
          mode: "submit",
          topic: active.title,
          answers: payload,
        });
        setResult(data);
        toast("Listening exercise scored!");
      } catch (err) {
        setError(errorMessage(err));
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Card title={active.title}>
          <AudioButton text={active.script} className="btn btn-primary mb-3" />
          <p className="mb-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-400">
            Audio is read aloud by your browser. Play it once or twice, then answer.
          </p>
          <div className="space-y-4">
            {active.questions.map((q, i) => (
              <div key={i}>
                <div className="mb-1 text-sm font-medium text-slate-700">{i + 1}. {q.q}</div>
                <input className="input" placeholder="Your answer" value={answers[q.q] || ""} onChange={(e) => setAnswers((p) => ({ ...p, [q.q]: e.target.value }))} />
              </div>
            ))}
          </div>
          {error && <div className="mt-3 text-sm text-rose-600">{error}</div>}
          <div className="mt-4 flex gap-3">
            <button className="btn btn-primary" onClick={submit} disabled={loading}>{loading ? "Scoring…" : "Submit Answers"}</button>
            <button className="btn btn-outline" onClick={() => setActive(null)}>Back</button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Listening Practice</h1>
      <div className="grid gap-4 sm:grid-cols-3">
        {content.map((s) => (
          <button key={s.title} className="card p-5 text-left transition hover:border-brand-300" onClick={() => setActive(s)}>
            <div className="mb-2 text-2xl">👂</div>
            <div className="font-medium text-slate-700">{s.title}</div>
            <div className="mt-1 text-xs text-slate-400">{s.questions.length} questions</div>
            <Badge tone="blue" >Listening</Badge>
          </button>
        ))}
      </div>
    </div>
  );
}
