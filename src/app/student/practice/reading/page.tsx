"use client";

import { useEffect, useMemo, useState } from "react";
import { api, API_URL_RAW } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Waveform } from "@/components/ui/waveform";
import { PageHeader } from "@/components/page-header";
import { useRecorder } from "@/components/practice/use-recorder";
import { BookOpen, Mic, Square, RefreshCw, Sparkles, Loader2, ArrowRight } from "lucide-react";

const MAX_SPEAK = 180;

interface ReadingContent {
  id: string;
  title: string;
  difficulty: string;
  text: string;
}

interface ReadDiff {
  status: "match" | "missed" | "added" | "mismatch";
  expectedWord?: string;
  transcriptWord?: string;
}

interface EvalResult {
  transcript?: string;
  compare?: { expectedWords: number; matched: number; missed: string[]; added: string[]; misread: string[]; accuracy: number; diff: ReadDiff[] };
  fluency?: { wordsPerMinute: number; pauseCount: number; fillerCount: number; hesitationScore: number; sentenceFlow: string };
  pronunciation?: { issues: { word: string; confidence: number; suggestion?: string }[]; score: number };
  scores?: { metric: string; score: number; detail?: string }[];
  overall?: number;
  mistakes?: { type: string; message: string; correction?: string }[];
  strengths?: string[];
  weaknesses?: string[];
  summary?: string;
}

interface DisplayWord {
  word: string;
  status: "ok" | "missed" | "misread" | "added";
  addedWord?: string;
}

function scoreColor(score: number) {
  return score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-gradient-brand" : "bg-amber-500";
}

function token(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem("lsrw_token");
}

const FONT_SIZES = [
  { label: "A-", cls: "text-base" },
  { label: "A", cls: "text-lg" },
  { label: "A+", cls: "text-2xl" },
];

export default function ReadingPractice() {
  const [content, setContent] = useState<ReadingContent | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [fontIdx, setFontIdx] = useState(1);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingContent, setLoadingContent] = useState(true);
  const recorder = useRecorder(MAX_SPEAK);

  async function newRound() {
    setLoadingContent(true);
    setError("");
    setResult(null);
    recorder.reset();
    try {
      const res = await api<{ sessionId: string; difficulty: string; source: string; text: string; instruction: string }>(
        "/api/practice/reading/start",
        { method: "POST", body: {} }
      );
      setSessionId(res.sessionId);
      setContent({ id: res.sessionId, title: "Read & Repeat", difficulty: res.difficulty, text: res.text });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create your practice activity. Please try again.");
    } finally {
      setLoadingContent(false);
    }
  }

  useEffect(() => {
    newRound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function evaluate() {
    if (!recorder.audioUrl || !sessionId || !content) return;
    setLoading(true);
    setError("");
    try {
      const blob = await fetch(recorder.audioUrl).then((r) => r.blob());
      const t = token();
      const res = await fetch(`${API_URL_RAW}/api/practice/reading/evaluate?sessionId=${sessionId}`, {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const words: DisplayWord[] = useMemo(() => {
    const diff = result?.compare?.diff;
    if (!diff) return [];
    const out: DisplayWord[] = [];
    for (let i = 0; i < diff.length; i++) {
      const d = diff[i];
      if (d.status === "match") {
        out.push({ word: d.expectedWord!, status: "ok" });
      } else if (d.status === "missed") {
        const next = diff[i + 1];
        if (next?.status === "added") {
          out.push({ word: d.expectedWord!, status: "misread", addedWord: next.transcriptWord });
          i++;
        } else {
          out.push({ word: d.expectedWord!, status: "missed" });
        }
      } else if (d.status === "added") {
        out.push({ word: "(extra)", status: "added", addedWord: d.transcriptWord });
      }
    }
    return out;
  }, [result]);

  const mm = String(Math.floor(recorder.elapsed / 60)).padStart(2, "0");
  const ss = String(recorder.elapsed % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Reading Practice"
        title="Read It Aloud"
        subtitle="Read the passage out loud clearly. The AI compares what you said with the exact text."
        icon={<BookOpen className="h-6 w-6" />}
        gradient="bg-gradient-mint"
      />

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {loadingContent ? (
        <Card className="p-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-emerald-600" />
          <p className="mt-3 text-sm font-semibold text-ink-500">Loading your reading passage…</p>
        </Card>
      ) : content ? (
        !result ? (
          <>
            <Card className="p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge tone="primary">{content.difficulty}</Badge>
                  <span className="text-sm font-bold text-ink-700">{content.title}</span>
                </div>
                <div className="flex items-center gap-1 rounded-xl bg-ink-100 p-1">
                  {FONT_SIZES.map((f, i) => (
                    <button
                      key={f.label}
                      onClick={() => setFontIdx(i)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${fontIdx === i ? "bg-white text-ink-900 shadow-soft" : "text-ink-500 hover:text-ink-700"}`}
                      aria-label={`Font size ${f.label}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className={`mt-5 leading-relaxed text-ink-800 ${FONT_SIZES[fontIdx].cls}`}>{content.text}</p>
              <p className="mt-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
                👉 Read this passage aloud. Speak every word — the AI checks pronunciation and accuracy.
              </p>
            </Card>

            <Card className="p-8">
              <div className="flex flex-col items-center">
                <button
                  onClick={recorder.recording ? recorder.stop : recorder.start}
                  className={`group relative flex h-24 w-24 items-center justify-center rounded-full transition-all ${
                    recorder.recording ? "bg-gradient-mint shadow-glow" : "bg-gradient-brand shadow-lift hover:-translate-y-1"
                  }`}
                  aria-label={recorder.recording ? "Stop recording" : "Start reading"}
                >
                  {recorder.recording && <span className="absolute inset-0 rounded-full bg-emerald-500 animate-pulse-ring" />}
                  {recorder.recording ? <Square className="relative h-8 w-8 text-white" /> : <Mic className="relative h-9 w-9 text-white" />}
                </button>
                <p className="mt-4 text-sm font-bold uppercase tracking-widest text-ink-500">
                  {recorder.recording ? "Tap when you finish reading" : "Tap to start reading aloud"}
                </p>
                {recorder.recording && (
                  <div className="mt-2 flex items-center gap-2 rounded-full bg-ink-100 px-4 py-1.5">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    <span className="font-mono text-sm font-bold text-ink-700">{mm}:{ss}</span>
                  </div>
                )}
              </div>

              {recorder.recording && (
                <div className="mt-6 rounded-xl bg-emerald-50 px-4 py-3 animate-fade-in-up">
                  <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Reading…</p>
                  <Waveform active className="mt-2 h-6" color="#10B981" />
                </div>
              )}

              {recorder.error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{recorder.error}</p>}

              {recorder.audioUrl && !recorder.recording && (
                <div className="mt-6 space-y-4 animate-fade-in-up">
                  <audio src={recorder.audioUrl} controls className="w-full" />
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={recorder.reset}><RefreshCw className="h-4 w-4" /> Read Again</Button>
                    <Button variant="gradient" className="flex-1 sm:flex-none bg-gradient-mint" onClick={evaluate} disabled={loading}>
                      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><Sparkles className="h-4 w-4" /> Check My Reading</>}
                    </Button>
                  </div>
                </div>
              )}

              {loading && (
                <div className="mt-6 rounded-2xl bg-emerald-50 p-6 text-center animate-fade-in-up">
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-emerald-600" />
                    <p className="font-bold text-emerald-700">Comparing your reading with the text…</p>
                  </div>
                  <p className="mt-1 text-xs text-emerald-500">Checking word accuracy, pronunciation and reading speed.</p>
                </div>
              )}
            </Card>
          </>
        ) : (
          /* RESULT */
          <div className="space-y-6 animate-fade-in-up">
            <Card className="p-6">
              <div className="flex flex-wrap items-center gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-mint text-white"><Sparkles className="h-6 w-6" /></span>
                <div>
                  <h3 className="font-display text-xl font-extrabold text-ink-900">Reading Accuracy: {result.overall ?? result.compare?.accuracy ?? 0}%</h3>
                  <p className="text-sm text-ink-500">{result.summary || "Here is how your reading compared to the text."}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                {[
                  ["Words correct", `${result.compare?.matched ?? 0}/${result.compare?.expectedWords ?? 0}`],
                  ["Missed", result.compare?.missed.length ?? 0],
                  ["Misread", result.compare?.misread.length ?? 0],
                  ["Added", result.compare?.added.length ?? 0],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded-xl bg-ink-50 px-4 py-3 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{k}</p>
                    <p className="mt-0.5 font-mono text-lg font-bold text-ink-800">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {(result.scores ?? []).map((s) => (
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

            <Card className="p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-ink-400">Word-by-word</h3>
                <div className="flex items-center gap-3 text-[11px] font-semibold text-ink-500">
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> correct</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-500" /> missed</span>
                  <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-500" /> misread</span>
                </div>
              </div>
              <div className={`leading-loose text-ink-800 ${FONT_SIZES[fontIdx].cls}`}>
                {words.map((w, i) => (
                  <span key={i} className="mr-2 inline-block">
                    {w.status === "ok" && <span className="text-ink-800">{w.word}</span>}
                    {w.status === "missed" && <span className="rounded bg-amber-100 px-1 text-amber-700 line-through">{w.word}</span>}
                    {w.status === "misread" && (
                      <span className="rounded bg-rose-100 px-1 text-rose-700">
                        {w.addedWord} <span className="text-rose-400">→</span> {w.word}
                      </span>
                    )}
                    {w.status === "added" && <span className="rounded bg-violet-100 px-1 text-violet-600">+{w.addedWord}</span>}
                  </span>
                ))}
              </div>
            </Card>

            <Card className="p-6">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wide text-ink-400">What you read</h3>
                {result.fluency && <Badge tone="ai">{result.fluency.wordsPerMinute} WPM</Badge>}
              </div>
              <p className="rounded-xl bg-ink-50 p-4 text-sm leading-relaxed text-ink-700">{result.transcript || "No speech detected."}</p>
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

            {result.mistakes && result.mistakes.length > 0 && (
              <Card className="p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-400">To Practice</h3>
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

            <div className="flex gap-3">
              <Button variant="gradient" className="flex-1 bg-gradient-mint" onClick={newRound}>
                <RefreshCw className="h-4 w-4" /> Next Passage
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => window.location.assign("/student/practice")}>More Practice</Button>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}