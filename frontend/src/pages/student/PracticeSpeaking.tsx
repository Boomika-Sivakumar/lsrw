import { useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Badge, Card } from "../../components/ui";
import { useRecorder } from "../../audio/recorder";
import { useToast } from "../../hooks/useToast";
import type { AnalysisResult } from "../../types";
import { AnalysisResults } from "../../components/results/AnalysisResults";

export function PracticeSpeaking() {
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("intermediate");
  const [suggested, setSuggested] = useState<string[]>([]);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { recording, transcript, supportError, start, stop } = useRecorder();
  const { toast } = useToast();

  const suggest = async () => {
    const { data } = await api.post("/ai/generate-topic", { skill: "speaking" });
    setSuggested(data.topics);
  };

  const analyze = async (text: string, durationMs: number) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/practice/speaking", {
        skill: "speaking",
        topic,
        difficulty,
        transcript: text,
        duration_ms: durationMs,
      });
      setResult(data);
      toast("Speaking analyzed!");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const stopAndAnalyze = async () => {
    const res = await stop();
    if (!res.transcript.trim()) {
      setError("No speech detected. Please speak clearly or type an answer.");
      return;
    }
    await analyze(res.transcript, res.durationMs);
  };

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <AnalysisResults result={result} />
        <button className="btn btn-outline" onClick={() => setResult(null)}>Practice Again</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Speaking Practice</h1>
      <Card title="Setup">
        <div className="space-y-4">
          <div>
            <label className="label">Topic</label>
            <div className="flex gap-2">
              <input className="input" placeholder="e.g. Describe your hometown" value={topic} onChange={(e) => setTopic(e.target.value)} />
              <button className="btn btn-outline shrink-0" onClick={suggest}>✨ Suggest</button>
            </div>
            {suggested.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {suggested.map((t) => (
                  <button key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 hover:bg-slate-200" onClick={() => setTopic(t)}>
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label">Difficulty</label>
            <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
              <option>beginner</option>
              <option>intermediate</option>
              <option>advanced</option>
            </select>
          </div>
        </div>
      </Card>

      {!topic && <p className="text-sm text-slate-400">Choose a topic to begin.</p>}

      {topic && !recording && (
        <Card>
          <div className="text-center">
            <p className="mb-3 text-sm text-slate-600">
              Speak about <b>"{topic}"</b> for 1–2 minutes.
            </p>
            <button className="btn btn-primary" onClick={async () => { setError(null); await start(); }}>🎤 Start Recording</button>
            {supportError && <p className="mt-2 text-xs text-amber-600">{supportError}</p>}
          </div>
        </Card>
      )}

      {topic && recording && (
        <Card>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
            <div className="mb-2 font-medium text-rose-600">● Recording… speak now</div>
            {transcript && <p className="mb-4 text-sm text-slate-700">"{transcript}"</p>}
            <button className="btn btn-danger" onClick={stopAndAnalyze} disabled={loading}>
              {loading ? "Analyzing…" : "Stop & Analyze"}
            </button>
          </div>
        </Card>
      )}

      {error && <div className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      {topic && (
        <Card title="Or type instead">
          <TypeToSpeak onAnalyze={analyze} disabled={loading} />
        </Card>
      )}
    </div>
  );
}

function TypeToSpeak({ onAnalyze, disabled }: { onAnalyze: (text: string, ms: number) => void; disabled: boolean }) {
  const [text, setText] = useState("");
  return (
    <div className="space-y-3">
      <textarea className="input min-h-[120px]" placeholder="Type your spoken answer here…" value={text} onChange={(e) => setText(e.target.value)} />
      <button className="btn btn-primary" disabled={disabled || !text.trim()} onClick={() => onAnalyze(text, text.split(" ").length * 400)}>
        Analyze
      </button>
    </div>
  );
}
