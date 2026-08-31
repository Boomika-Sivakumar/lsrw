"use client";

import { useEffect, useRef, useState } from "react";
import { api, API_URL_RAW } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Badge } from "@/components/ui/badge";
import { Waveform } from "@/components/ui/waveform";
import { PageHeader } from "@/components/page-header";
import { useRecorder } from "@/components/practice/use-recorder";
import { Mic, Square, RefreshCw, Sparkles, Loader2, Lightbulb, ArrowRight } from "lucide-react";

const PREP_SECONDS = 30;
const SPEAK_SECONDS = 120;

interface Score {
  metric: string;
  score: number;
  detail?: string;
}

interface Fluency {
  wordsPerMinute: number;
  pauseCount: number;
  fillerCount: number;
  hesitationScore: number;
  sentenceFlow: string;
}

interface Pronunciation {
  issues: { word: string; confidence: number; suggestion?: string }[];
  score: number;
}

interface EvalResult {
  transcript?: string;
  fluency?: Fluency;
  pronunciation?: Pronunciation;
  scores?: Score[];
  overall?: number;
  mistakes?: { type: string; message: string; correction?: string }[];
  strengths?: string[];
  weaknesses?: string[];
  summary?: string;
}

function scoreColor(score: number) {
  return score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-gradient-rose" : "bg-amber-500";
}

function token(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem("lsrw_token");
}

type Phase = "PREP" | "SPEAK" | "REVIEW" | "RESULT";

export default function SpeakingPractice() {
  const [topic, setTopic] = useState("");
  const [phase, setPhase] = useState<Phase>("PREP");
  const [prepSeconds, setPrepSeconds] = useState(PREP_SECONDS);
  const [speakSeconds, setSpeakSeconds] = useState(SPEAK_SECONDS);
  const [prepLeft, setPrepLeft] = useState(PREP_SECONDS);
  const [speakLeft, setSpeakLeft] = useState(SPEAK_SECONDS);
  const [sessionId, setSessionId] = useState("");
  const [result, setResult] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRecorder(SPEAK_SECONDS);
  const prepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  async function newRound() {
    setError("");
    setResult(null);
    recorder.reset();
    setPhase("PREP");
    setPrepLeft(PREP_SECONDS);
    setSpeakLeft(SPEAK_SECONDS);
    try {
      const res = await api<{ sessionId: string; difficulty: string; source: string; topic: string; instruction: string; preparationSeconds: number; speakingSeconds: number }>(
        "/api/practice/speaking/start",
        { method: "POST", body: {} }
      );
      setSessionId(res.sessionId);
      setTopic(res.topic);
      setPrepSeconds(res.preparationSeconds ?? PREP_SECONDS);
      setSpeakSeconds(res.speakingSeconds ?? SPEAK_SECONDS);
      setPrepLeft(res.preparationSeconds ?? PREP_SECONDS);
      setSpeakLeft(res.speakingSeconds ?? SPEAK_SECONDS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start your practice session. Please try again.");
    }
  }

  useEffect(() => {
    newRound();
    return () => {
      if (prepTimer.current) clearInterval(prepTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "PREP") return;
    prepTimer.current = setInterval(() => {
      setPrepLeft((s) => {
        if (s <= 1) {
          if (prepTimer.current) clearInterval(prepTimer.current);
          setPhase("SPEAK");
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (prepTimer.current) clearInterval(prepTimer.current);
    };
  }, [phase]);

  useEffect(() => {
    if (phase !== "SPEAK") return;
    setSpeakLeft((s) => Math.max(0, speakSeconds - recorder.elapsed));
  }, [phase, recorder.elapsed, speakSeconds]);

  function startSpeaking() {
    if (prepTimer.current) clearInterval(prepTimer.current);
    setPhase("SPEAK");
    void recorder.start();
  }

  function stopSpeaking() {
    recorder.stop();
    setPhase("REVIEW");
  }

  async function evaluate() {
    if (!recorder.audioUrl || !sessionId || !topic) return;
    setLoading(true);
    setError("");
    try {
      const blob = await fetch(recorder.audioUrl).then((r) => r.blob());
      const t = token();
      const res = await fetch(`${API_URL_RAW}/api/practice/speaking/evaluate?sessionId=${sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": blob.type || "audio/webm",
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
        },
        body: blob,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Evaluation failed. Is the speech API configured?");
      setResult(json as EvalResult);
      setPhase("RESULT");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function practiceAgain() {
    recorder.reset();
    setResult(null);
    setError("");
    setPhase("SPEAK");
    setSpeakLeft(speakSeconds);
    void recorder.start();
  }

  const scores = result?.scores?.length
    ? result.scores
    : result?.fluency && result?.pronunciation
      ? [
          { metric: "FLUENCY", score: Math.max(0, 100 - (result.fluency.hesitationScore ?? 0)), detail: `WPM ${result.fluency.wordsPerMinute}` },
          { metric: "PRONUNCIATION", score: result.pronunciation.score ?? 0, detail: `${result.pronunciation.issues.length} low-confidence words` },
        ]
      : [];
  const overall = result?.overall ?? (scores.length ? Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length) : 0);
  const liveScores = scores.filter((s) => ["FLUENCY", "CONFIDENCE", "PRONUNCIATION"].includes(s.metric.toUpperCase()));

  const mm = String(Math.floor(recorder.elapsed / 60)).padStart(2, "0");
  const ss = String(recorder.elapsed % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Speaking Practice"
        title="Topic · Think · Speak"
        subtitle="Read your topic, take 30 seconds to think, then speak for up to two minutes. The AI evaluates your response."
        icon={<Mic className="h-6 w-6" />}
        gradient="bg-gradient-rose"
      />

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {/* TOPIC CARD */}
      <Card className="relative overflow-hidden border-rose-200/60 bg-gradient-to-br from-rose-50 to-violet-50 p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-rose opacity-15 blur-2xl" />
        <div className="flex items-center gap-2">
          <Badge tone="primary">Speaking</Badge>
          <span className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Your topic</span>
        </div>
        <p className="mt-3 font-display text-xl font-extrabold leading-snug text-ink-900">"{topic}"</p>
        {phase !== "RESULT" && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ink-500">
            <Lightbulb className="h-3.5 w-3.5" /> Outline your ideas, then speak naturally. Don&apos;t worry about perfection.
          </p>
        )}
      </Card>

      {phase === "PREP" && (
        <Card className="p-8 text-center animate-fade-in-up">
          <p className="text-sm font-bold uppercase tracking-widest text-ink-400">Prepare your ideas</p>
          <div className="mt-6 flex items-center justify-center">
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full border-4 border-rose-200">
              <span className="font-mono text-4xl font-extrabold text-ink-900">{prepLeft}</span>
            </div>
          </div>
          <p className="mt-4 text-xs text-ink-400">Think about what you want to say. Speaking starts automatically after the countdown.</p>
          <Button variant="gradient" size="xl" className="mt-6 bg-gradient-rose" onClick={startSpeaking}>
            I&apos;M READY — <ArrowRight className="h-5 w-5" /> START SPEAKING
          </Button>
        </Card>
      )}

      {phase === "SPEAK" && (
        <Card className="p-8 animate-fade-in-up">
          <div className="mx-auto max-w-md">
            <div className="flex items-center justify-between text-sm font-bold">
              <span className="text-ink-500">Speak naturally…</span>
              <span className={`font-mono ${recorder.elapsed >= speakSeconds - 10 ? "text-red-600" : "text-ink-700"}`}>{mm}:{ss}</span>
            </div>
            <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full bg-gradient-rose transition-all duration-1000"
                style={{ width: `${(recorder.elapsed / speakSeconds) * 100}%` }}
              />
            </div>
          </div>

          <div className="mt-8 flex flex-col items-center">
            <button
              onClick={stopSpeaking}
              className="group relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-rose shadow-glow transition-all"
              aria-label="Stop recording"
            >
              <span className="absolute inset-0 rounded-full bg-rose-500 animate-pulse-ring" />
              <Square className="relative h-8 w-8 text-white" />
            </button>
            <p className="mt-4 text-sm font-bold uppercase tracking-widest text-ink-500">Tap to finish</p>
          </div>

          <div className="mt-6 rounded-xl bg-rose-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Recording your answer…</p>
            <Waveform active className="mt-2 h-6" color="#F43F5E" />
          </div>
        </Card>
      )}

      {phase === "REVIEW" && (
        <Card className="p-6 sm:p-8 animate-fade-in-up">
          <h3 className="text-sm font-bold uppercase tracking-wide text-ink-400">Review your recording</h3>
          {recorder.audioUrl && <audio src={recorder.audioUrl} controls className="mt-4 w-full" />}
          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => { recorder.reset(); setPhase("SPEAK"); setSpeakLeft(speakSeconds); }}>
              <RefreshCw className="h-4 w-4" /> Record Again
            </Button>
            <Button variant="gradient" className="flex-1 sm:flex-none bg-gradient-rose" onClick={evaluate} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing speech…</> : <><Sparkles className="h-4 w-4" /> Analyze Speech</>}
            </Button>
          </div>
          {loading && (
            <div className="mt-6 rounded-2xl bg-violet-50 p-6 text-center">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                <p className="font-bold text-violet-700">AI is analyzing your communication…</p>
              </div>
              <p className="mt-1 text-xs text-violet-500">Evaluating fluency, pronunciation, grammar, confidence & more.</p>
            </div>
          )}
        </Card>
      )}

      {phase === "RESULT" && result && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-rose text-white shadow-soft"><Sparkles className="h-5 w-5" /></span>
            <h2 className="font-display text-xl font-extrabold text-ink-900">AI Speech Analysis — {overall}%</h2>
          </div>

          {liveScores.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-400">Performance</h3>
              <div className="grid gap-4 sm:grid-cols-3">
                {liveScores.map((s) => (
                  <div key={s.metric}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-semibold text-ink-700">{s.metric.charAt(0) + s.metric.slice(1).toLowerCase()}</span>
                      <span className="font-mono font-bold text-ink-900">{s.score}%</span>
                    </div>
                    <ProgressBar value={s.score} color={scoreColor(s.score)} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink-400">Transcript</h3>
              {result.fluency && <Badge tone="ai">{result.fluency.wordsPerMinute} WPM</Badge>}
            </div>
            <p className="rounded-xl bg-ink-50 p-4 text-sm leading-relaxed text-ink-700">
              {result.transcript || "No speech detected — try speaking a little closer to the microphone."}
            </p>
            {result.fluency && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                {[
                  ["Pauses", result.fluency.pauseCount],
                  ["Fillers", result.fluency.fillerCount],
                  ["Flow", result.fluency.sentenceFlow],
                  ["Hesitation", result.fluency.hesitationScore],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-xl bg-ink-50 px-3 py-2.5 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{k}</p>
                    <p className="mt-0.5 font-mono text-sm font-bold text-ink-800">{v}</p>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {scores.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-400">Full AI Analysis</h3>
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {scores.map((s) => (
                  <div key={s.metric}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-semibold text-ink-700">{s.metric.charAt(0) + s.metric.slice(1).toLowerCase()}</span>
                      <span className="font-mono font-bold text-ink-900">{s.score}%</span>
                    </div>
                    <ProgressBar value={s.score} color={scoreColor(s.score)} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {result.mistakes && result.mistakes.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-400">Mistakes & Corrections</h3>
              <ul className="space-y-2.5">
                {result.mistakes.map((m, i) => (
                  <li key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm">
                    <Badge tone="warning">{m.type}</Badge>
                    <span className="text-ink-700">{m.message}</span>
                    {m.correction && <span className="font-semibold text-emerald-700">→ {m.correction}</span>}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {result.pronunciation && result.pronunciation.issues.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-400">Pronunciation</h3>
              <div className="flex flex-wrap gap-2">
                {result.pronunciation.issues.map((p, i) => (
                  <Badge key={i} tone={p.confidence >= 80 ? "success" : p.confidence >= 60 ? "warning" : "danger"}>
                    {p.word} · {p.confidence}%
                  </Badge>
                ))}
              </div>
            </Card>
          )}

          <Card className="relative overflow-hidden border-violet-200/70 bg-violet-50/60 p-6">
            <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-rose opacity-20 blur-2xl" />
            <h3 className="text-sm font-bold uppercase tracking-wide text-violet-700">🤖 AI Feedback</h3>
            {result.summary ? (
              <p className="mt-3 text-sm leading-relaxed text-ink-800">{result.summary}</p>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-ink-800">
                AI feedback is unavailable right now, but your transcript and fluency metrics were recorded.
              </p>
            )}
            {result.strengths && result.strengths.length > 0 && (
              <p className="mt-3 text-sm font-medium text-emerald-700">✓ Strengths: {result.strengths.join("; ")}</p>
            )}
            {result.weaknesses && result.weaknesses.length > 0 && (
              <p className="mt-1 text-sm font-medium text-amber-700">⚠ To improve: {result.weaknesses.join("; ")}</p>
            )}
          </Card>

          <div className="flex gap-3">
            <Button variant="gradient" className="flex-1 bg-gradient-rose" onClick={practiceAgain}>
              <RefreshCw className="h-4 w-4" /> Practice Again
            </Button>
            <Button variant="outline" className="flex-1" onClick={newRound}>
              <ArrowRight className="h-4 w-4" /> Next Topic
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}