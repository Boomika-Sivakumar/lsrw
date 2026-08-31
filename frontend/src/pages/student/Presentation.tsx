import { useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Card } from "../../components/ui";
import { useRecorder } from "../../audio/recorder";
import { useToast } from "../../hooks/useToast";
import { formatDuration } from "../../audio/tts";
import type { AnalysisResult } from "../../types";
import { AnalysisResults } from "../../components/results/AnalysisResults";

export function PresentationPage() {
  const [topics, setTopics] = useState<string[]>([]);
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState(120);
  const [difficulty, setDifficulty] = useState("intermediate");
  const [elapsed, setElapsed] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { recording, transcript, supportError, start, stop } = useRecorder();
  const { toast } = useToast();

  useEffect(() => {
    api.get("/practice/presentation/topics").then((res) => setTopics(res.data.topics)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!recording) {
      setElapsed(0);
      return;
    }
    const iv = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(iv);
  }, [recording]);

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <AnalysisResults result={result} />
        <button className="btn btn-outline" onClick={() => setResult(null)}>New Presentation</button>
      </div>
    );
  }

  const stopAndAnalyze = async () => {
    const res = await stop();
    if (!res.transcript.trim()) {
      setError("No speech detected. Please present aloud.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/practice/presentation", {
        topic,
        duration_seconds: duration,
        difficulty,
        transcript: res.transcript,
      });
      setResult(data);
      toast("Presentation analyzed!");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Presentation Practice</h1>
      <Card title="Setup">
        <div className="space-y-4">
          <div>
            <label className="label">Topic</label>
            <input className="input" placeholder="Your presentation topic" value={topic} onChange={(e) => setTopic(e.target.value)} list="presentation-topics" />
            <datalist id="presentation-topics">
              {topics.map((t) => <option key={t} value={t} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Duration</label>
              <select className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
                <option value={60}>1 minute</option>
                <option value={120}>2 minutes</option>
                <option value={180}>3 minutes</option>
                <option value={300}>5 minutes</option>
              </select>
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
        </div>
      </Card>

      {topic && !recording && (
        <Card>
          <div className="text-center">
            <p className="mb-3 text-sm text-slate-600">
              Present on <b>"{topic}"</b> for {formatDuration(duration)}.
            </p>
            <button className="btn btn-primary" onClick={async () => { setError(null); await start(); }}>🎤 Start Presentation</button>
            {supportError && <p className="mt-2 text-xs text-amber-600">{supportError}</p>}
          </div>
        </Card>
      )}

      {topic && recording && (
        <Card>
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
            <div className="mb-2 font-medium text-rose-600">● Presenting… {formatDuration(elapsed)}</div>
            {transcript && <p className="mb-4 max-h-28 overflow-y-auto text-sm text-slate-700">"{transcript}"</p>}
            <button className="btn btn-danger" onClick={stopAndAnalyze} disabled={loading}>
              {loading ? "Analyzing…" : "Stop & Analyze"}
            </button>
          </div>
        </Card>
      )}

      {error && <div className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}
    </div>
  );
}