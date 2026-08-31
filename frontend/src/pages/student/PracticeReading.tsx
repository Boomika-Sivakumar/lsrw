import { useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card } from "../../components/ui";
import { useRecorder } from "../../audio/recorder";
import { useToast } from "../../hooks/useToast";
import type { AnalysisResult } from "../../types";
import { AnalysisResults } from "../../components/results/AnalysisResults";

interface ReadingItem {
  title: string;
  text: string;
  questions: Array<{ type: string; q: string; answer: string; options?: string[] }>;
}

export function PracticeReading() {
  const [content, setContent] = useState<ReadingItem[] | null>(null);
  const [active, setActive] = useState<ReadingItem | null>(null);
  const [mode, setMode] = useState<"comprehension" | "readaloud">("comprehension");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { recording, transcript, supportError, start, stop } = useRecorder();
  const { toast } = useToast();

  useEffect(() => {
    api
      .post("/practice/reading", { skill: "reading", mode: "generate" })
      .then((res) => setContent(res.data.content))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <div className="text-rose-600">{error}</div>;
  if (!content) return <Spinner label="Loading reading material…" />;

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <AnalysisResults result={result} />
        <button className="btn btn-outline" onClick={() => { setResult(null); setAnswers({}); }}>Read Another</button>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold">Reading Practice</h1>
        <div className="flex gap-2">
          <Badge tone="blue">Comprehension</Badge>
          <Badge tone="violet">Read Aloud</Badge>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {content.map((item) => (
            <button key={item.title} className="card p-5 text-left transition hover:border-brand-300" onClick={() => setActive(item)}>
              <div className="mb-2 text-2xl">📖</div>
              <div className="font-medium text-slate-700">{item.title}</div>
              <div className="mt-1 text-xs text-slate-400">{item.questions.length} questions</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const submitComprehension = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = active.questions.map((q, i) => ({
        question: q.q,
        answer: answers[q.q] || "",
        expected: q.answer,
        correct: q.answer,
        type: q.type,
      }));
      const { data } = await api.post("/practice/reading", {
        skill: "reading",
        mode: "submit",
        topic: active.title,
        answers: payload,
      });
      setResult(data);
      toast("Reading exercise scored!");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const stopReadAloud = async () => {
    const res = await stop();
    if (!res.transcript.trim()) {
      setError("No speech detected. Please read the passage aloud.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/practice/reading", {
        skill: "reading",
        mode: "readaloud",
        topic: active.title,
        transcript: res.transcript,
        expected_text: active.text,
        duration_ms: res.durationMs,
      });
      setResult(data);
      toast("Read-aloud analyzed!");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Card title={active.title}>
        <div className="mb-4 flex gap-2">
          <button className={`btn ${mode === "comprehension" ? "btn-primary" : "btn-outline"}`} onClick={() => setMode("comprehension")}>Comprehension</button>
          <button className={`btn ${mode === "readaloud" ? "btn-primary" : "btn-outline"}`} onClick={() => setMode("readaloud")}>Read Aloud</button>
        </div>
        <div className="mb-4 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">{active.text}</div>

        {mode === "comprehension" && (
          <>
            <div className="space-y-4">
              {active.questions.map((q, i) => (
                <div key={i}>
                  <div className="mb-1 text-sm font-medium">{i + 1}. {q.q}</div>
                  {q.type === "mcq" && q.options ? (
                    <div className="space-y-1">
                      {q.options.map((opt, oi) => (
                        <label key={oi} className="flex items-center gap-2 text-sm">
                          <input type="radio" name={`r-${i}`} checked={answers[q.q] === String(oi)} onChange={() => setAnswers((p) => ({ ...p, [q.q]: String(oi) }))} />
                          {opt}
                        </label>
                      ))}
                    </div>
                  ) : q.type === "truefalse" ? (
                    <div className="flex gap-4">
                      {["true", "false"].map((opt) => (
                        <label key={opt} className="flex items-center gap-2 text-sm">
                          <input type="radio" name={`r-${i}`} checked={answers[q.q] === opt} onChange={() => setAnswers((p) => ({ ...p, [q.q]: opt }))} />
                          {opt === "true" ? "True" : "False"}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input className="input" placeholder="Your answer" value={answers[q.q] || ""} onChange={(e) => setAnswers((p) => ({ ...p, [q.q]: e.target.value }))} />
                  )}
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-3">
              <button className="btn btn-primary" onClick={submitComprehension} disabled={loading}>{loading ? "Scoring…" : "Submit"}</button>
              <button className="btn btn-outline" onClick={() => setActive(null)}>Back</button>
            </div>
          </>
        )}

        {mode === "readaloud" && (
          <div className="text-center">
            <p className="mb-3 text-sm text-slate-600">Read the passage aloud. Your voice will be analyzed for pronunciation, accuracy and speed.</p>
            {!recording ? (
              <button className="btn btn-primary" onClick={async () => { setError(null); await start(); }}>🎤 Start Reading</button>
            ) : (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                <p className="mb-2 font-medium text-rose-600">● Reading…</p>
                {transcript && <p className="mb-3 text-sm text-slate-700">"{transcript}"</p>}
                <button className="btn btn-danger" onClick={stopReadAloud} disabled={loading}>{loading ? "Analyzing…" : "Stop & Analyze"}</button>
              </div>
            )}
            {supportError && <p className="mt-2 text-xs text-amber-600">{supportError}</p>}
            {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
          </div>
        )}
      </Card>
    </div>
  );
}
