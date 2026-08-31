"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, API_URL_RAW } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Waveform } from "@/components/ui/waveform";
import { PageHeader } from "@/components/page-header";
import { useRecorder } from "@/components/practice/use-recorder";
import { Play, Pause, RotateCcw, Volume2, VolumeX, Headphones, Mic, Square, Loader2, Sparkles, RefreshCw, Eye, EyeOff } from "lucide-react";

interface ListeningContent {
  id: string;
  title: string;
  difficulty: string;
  script: string;
}

interface Score {
  metric: string;
  score: number;
  detail?: string;
}

interface EvalResult {
  transcript: string;
  scores: Score[];
  overall: number;
  mistakes: { type: string; message: string; correction?: string }[];
  strengths: string[];
  weaknesses: string[];
  summary: string;
}

function scoreColor(score: number) {
  return score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-gradient-brand" : "bg-amber-500";
}

function token(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem("lsrw_token");
}

export default function ListeningPractice() {
  const [content, setContent] = useState<ListeningContent | null>(null);
  const [loadingContent, setLoadingContent] = useState(true);
  const [sessionId, setSessionId] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [aiAudio, setAiAudio] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showScript, setShowScript] = useState(false);
  const [result, setResult] = useState<EvalResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluateError, setEvaluateError] = useState("");
  const [loadingNext, setLoadingNext] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorder = useRecorder();

  async function loadAudio(text: string) {
    const t = token();
    try {
      const res = await fetch(`${API_URL_RAW}/api/practice/listening/audio?text=${encodeURIComponent(text)}`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!res.ok) throw new Error("TTS unavailable");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setAiAudio(true);
      return;
    } catch {
      setAudioUrl(null);
      setAiAudio(false);
    }
  }

  async function newRound() {
    setLoadingContent(true);
    setResult(null);
    recorder.reset();
    setEvaluateError("");
    setShowScript(false);
    setProgress(0);
    setPlaying(false);
    try {
      const res = await api<{ sessionId: string; difficulty: string; source: string; content: { title: string; script: string; instruction: string } }>(
        "/api/practice/listening/start",
        { method: "POST", body: {} }
      );
      setSessionId(res.sessionId);
      setContent({ id: res.sessionId, title: res.content.title, script: res.content.script, difficulty: res.difficulty });
      await loadAudio(res.content.script);
    } catch (err) {
      setEvaluateError(err instanceof Error ? err.message : "Failed to create your practice activity. Please try again.");
    } finally {
      setLoadingContent(false);
    }
  }

  useEffect(() => {
    newRound();
    return () => {
      window.speechSynthesis?.cancel();
      if (speechTimer.current) clearInterval(speechTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function togglePlay() {
    if (aiAudio && audioUrl) {
      const audio = audioRef.current;
      if (!audio) return;
      if (playing) {
        audio.pause();
      } else {
        void audio.play();
      }
      return;
    }
    if (playing) {
      window.speechSynthesis?.pause();
      if (speechTimer.current) clearInterval(speechTimer.current);
      setPlaying(false);
      return;
    }
    if (!("speechSynthesis" in window)) {
      setEvaluateError("Your browser doesn't support audio playback. Use Chrome/Edge for best experience.");
      return;
    }
    const utterance = new SpeechSynthesisUtterance(content?.script ?? "");
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => {
      setPlaying(false);
      setProgress(100);
      if (speechTimer.current) clearInterval(speechTimer.current);
    };
    speechRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
    const durationMs = (content?.script ?? "").split(" ").length * 480;
    speechTimer.current = setInterval(() => {
      setProgress((p) => Math.min(100, p + 100 / (durationMs / 250)));
    }, 250);
  }

  function replay() {
    if (aiAudio && audioUrl) {
      const audio = audioRef.current;
      if (audio) {
        audio.currentTime = 0;
        void audio.play();
      }
      return;
    }
    setProgress(0);
    if (!playing) togglePlay();
  }

  async function evaluate() {
    if (!recorder.audioUrl || !sessionId || !content) return;
    setEvaluating(true);
    setEvaluateError("");
    try {
      const blob = await fetch(recorder.audioUrl).then((r) => r.blob());
      const t = token();
      const res = await fetch(`${API_URL_RAW}/api/practice/listening/evaluate?sessionId=${sessionId}`, {
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
      setEvaluateError(err instanceof Error ? err.message : "Evaluation failed. Please try again.");
    } finally {
      setEvaluating(false);
    }
  }

  async function nextRound() {
    setLoadingNext(true);
    await newRound();
    setLoadingNext(false);
  }

  const mm = String(Math.floor(recorder.elapsed / 60)).padStart(2, "0");
  const ss = String(recorder.elapsed % 60).padStart(2, "0");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Listening Practice"
        title="Listen · Understand · Speak"
        subtitle="Listen to the audio, then say out loud what you understood. The AI checks your comprehension."
        icon={<Headphones className="h-6 w-6" />}
        gradient="bg-gradient-sky"
      />

      {evaluateError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{evaluateError}</p>}

      {loadingContent ? (
        <Card className="p-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-600" />
          <p className="mt-3 text-sm font-semibold text-ink-500">Loading your listening practice…</p>
        </Card>
      ) : content ? (
        <>
          {/* AUDIO PLAYER */}
          <Card className="relative overflow-hidden p-6">
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-sky opacity-10 blur-3xl" />
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge tone="primary">{content.difficulty}</Badge>
                  {!aiAudio && <Badge tone="warning">Browser voice</Badge>}
                </div>
                <p className="mt-2 font-display text-lg font-extrabold text-ink-900">{content.title}</p>
                <p className="text-xs text-ink-400">Listen carefully — you will speak about what you heard.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="md"
                  className="p-2"
                  onClick={() =>
                    setMuted((m) => {
                      const next = !m;
                      if (audioRef.current) audioRef.current.volume = next ? 0 : volume;
                      return next;
                    })
                  }
                  aria-label={muted ? "Unmute" : "Mute"}
                >
                  {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                </Button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={muted ? 0 : volume}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setVolume(v);
                    setMuted(v === 0);
                    if (audioRef.current) audioRef.current.volume = v;
                  }}
                  className="w-24 accent-sky-600"
                  aria-label="Volume"
                />
                <Button variant="ghost" size="md" className="p-2" onClick={replay} aria-label="Replay">
                  <RotateCcw className="h-5 w-5" />
                </Button>
                <Button variant="gradient" size="lg" onClick={togglePlay} className="bg-gradient-sky shadow-sky-500/25">
                  {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                  {playing ? "Pause" : "Play Audio"}
                </Button>
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-center justify-between text-[11px] font-semibold text-ink-400">
                <span>{playing ? "Playing…" : "Ready"}</span>
                <span className="font-mono">{Math.round(progress)}%</span>
              </div>
              <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-gradient-sky transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
            {playing && !aiAudio && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700 animate-fade-in-up">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-500 opacity-75" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-sky-600" />
                </span>
                Listening — follow along…
              </div>
            )}
            {aiAudio && audioUrl && (
              <audio
                ref={audioRef}
                src={audioUrl}
                onTimeUpdate={(e) => {
                  const a = e.currentTarget;
                  if (a.duration) setProgress((a.currentTime / a.duration) * 100);
                }}
                onPlay={() => {
                  setPlaying(true);
                  window.speechSynthesis?.cancel();
                }}
                onPause={() => setPlaying(false)}
                onEnded={() => setPlaying(false)}
                className="hidden"
              />
            )}
          </Card>

          {!result ? (
            <Card className="p-6 sm:p-8">
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink-400">Now — what did you hear?</h3>
              <p className="mt-1.5 text-sm text-ink-500">
                Click the microphone and say out loud everything you remember from the audio. Try to mention the key facts.
              </p>

              {/* mic */}
              <div className="mt-8 flex flex-col items-center">
                <button
                  onClick={recorder.recording ? recorder.stop : recorder.start}
                  className={`group relative flex h-24 w-24 items-center justify-center rounded-full transition-all ${
                    recorder.recording ? "bg-gradient-rose shadow-glow" : "bg-gradient-brand shadow-lift hover:-translate-y-1"
                  }`}
                  aria-label={recorder.recording ? "Stop recording" : "Start recording"}
                >
                  {recorder.recording && <span className="absolute inset-0 rounded-full bg-rose-500 animate-pulse-ring" />}
                  {recorder.recording ? <Square className="relative h-8 w-8 text-white" /> : <Mic className="relative h-9 w-9 text-white" />}
                </button>
                <p className="mt-4 text-sm font-bold uppercase tracking-widest text-ink-500">{recorder.recording ? "Tap to stop" : "Tap to record"}</p>
                {recorder.recording && (
                  <div className="mt-2 flex items-center gap-2 rounded-full bg-ink-100 px-4 py-1.5">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    <span className="font-mono text-sm font-bold text-ink-700">{mm}:{ss}</span>
                  </div>
                )}
              </div>

              {recorder.recording && (
                <div className="mt-6 rounded-xl bg-rose-50 px-4 py-3 animate-fade-in-up">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-600">Recording your answer…</p>
                  <Waveform active className="mt-2 h-6" color="#F43F5E" />
                </div>
              )}

              {recorder.error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{recorder.error}</p>}

              {recorder.audioUrl && !recorder.recording && (
                <div className="mt-6 space-y-4 animate-fade-in-up">
                  <audio src={recorder.audioUrl} controls className="w-full" />
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={recorder.reset}><RefreshCw className="h-4 w-4" /> Record Again</Button>
                    <Button variant="gradient" onClick={evaluate} disabled={evaluating} className="flex-1 sm:flex-none">
                      {evaluating ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><Sparkles className="h-4 w-4" /> Check My Answer</>}
                    </Button>
                  </div>
                </div>
              )}

              {evaluating && (
                <div className="mt-6 rounded-2xl bg-sky-50 p-6 text-center animate-fade-in-up">
                  <div className="flex items-center justify-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
                    <p className="font-bold text-sky-700">Comparing what you said with the audio…</p>
                  </div>
                  <p className="mt-1 text-xs text-sky-500">Evaluating comprehension, fluency and pronunciation.</p>
                </div>
              )}
            </Card>
          ) : (
            /* RESULT */
            <div className="space-y-6 animate-fade-in-up">
              <Card className="p-6">
                <div className="flex flex-wrap items-center gap-4">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-sky text-white"><Sparkles className="h-6 w-6" /></span>
                  <div>
                    <h3 className="font-display text-xl font-extrabold text-ink-900">Your Listening Score: {result.overall}%</h3>
                    <p className="text-sm text-ink-500">{result.summary}</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-3">
                  {result.scores.map((s) => (
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
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-400">What you said</h3>
                <p className="rounded-xl bg-ink-50 p-4 text-sm leading-relaxed text-ink-700">{result.transcript || "No speech was recognized — try speaking a little closer to the microphone."}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge tone="success">✓ {result.strengths.length ? result.strengths.join("; ") : "Good attempt"}</Badge>
                  {result.weaknesses.length > 0 && <Badge tone="warning">⚠ {result.weaknesses.join("; ")}</Badge>}
                </div>
              </Card>

              {result.mistakes.length > 0 && (
                <Card className="p-6">
                  <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-400">To Improve</h3>
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

              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-ink-400">Audio Script</h3>
                  <Button variant="ghost" size="sm" onClick={() => setShowScript((s) => !s)}>
                    {showScript ? <><EyeOff className="h-4 w-4" /> Hide</> : <><Eye className="h-4 w-4" /> Show script</>}
                  </Button>
                </div>
                {showScript && (
                  <p className="mt-3 rounded-xl bg-ink-50 p-4 text-sm leading-relaxed text-ink-700 animate-fade-in-up">{content.script}</p>
                )}
              </Card>

              <div className="flex gap-3">
                <Button variant="gradient" className="flex-1" onClick={nextRound} disabled={loadingNext}>
                  {loadingNext ? <><Loader2 className="h-4 w-4 animate-spin" /> Loading…</> : <><RefreshCw className="h-4 w-4" /> Next Practice</>}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => window.location.assign("/student/practice")}>More Practice</Button>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}