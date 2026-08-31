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
import {
  Headphones,
  Mic,
  BookOpen,
  Play,
  Pause,
  RotateCcw,
  Square,
  Loader2,
  Sparkles,
  RefreshCw,
  ArrowRight,
  CheckCircle2,
  Volume2,
  VolumeX,
} from "lucide-react";

type Skill = "LISTENING" | "SPEAKING" | "READING";

interface RoundResult {
  skill: Skill;
  overall: number;
  scores: { metric: string; score: number; detail?: string }[];
  transcript: string;
  summary: string;
  mistakes: { type: string; message: string; correction?: string }[];
  strengths: string[];
  weaknesses: string[];
}

interface RoundState {
  skill: Skill;
  sessionId: string;
  // Listening
  title?: string;
  script?: string;
  audioUrl?: string | null;
  // Speaking
  topic?: string;
  // Reading
  text?: string;
  instruction?: string;
  difficulty?: string;
}

const ROUND_ORDER: Skill[] = ["LISTENING", "SPEAKING", "READING"];

const SKILL_META: Record<Skill, { icon: typeof Mic; title: string; gradient: string; chip: string; bar: string; tone: "primary" | "ai" | "success" | "warning" }> = {
  LISTENING: { icon: Headphones, title: "Listening", gradient: "bg-gradient-sky", chip: "bg-sky-50 text-sky-600", bar: "bg-sky-500", tone: "primary" },
  SPEAKING: { icon: Mic, title: "Speaking", gradient: "bg-gradient-rose", chip: "bg-violet-50 text-violet-600", bar: "bg-violet-500", tone: "ai" },
  READING: { icon: BookOpen, title: "Reading", gradient: "bg-gradient-mint", chip: "bg-emerald-50 text-emerald-600", bar: "bg-emerald-500", tone: "success" },
};

function token(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem("lsrw_token");
}

function scoreColor(score: number) {
  return score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-gradient-brand" : "bg-amber-500";
}

function mmss(s: number) {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${m}:${ss}`;
}

export default function MockInterviewPage() {
  const [phase, setPhase] = useState<"intro" | "round" | "done">("intro");
  const [roundIdx, setRoundIdx] = useState(0);
  const [round, setRound] = useState<RoundState | null>(null);
  const [loadingRound, setLoadingRound] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [progress, setProgress] = useState(0);
  const [audioFailed, setAudioFailed] = useState(false);

  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState("");
  const [result, setResult] = useState<RoundResult | null>(null);

  const [results, setResults] = useState<RoundResult[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const recorder = useRecorder();

  const skill = ROUND_ORDER[roundIdx];
  const meta = SKILL_META[skill];

  // --- load a round ---
  const loadRound = useCallback(async (idx: number) => {
    setLoadingRound(true);
    setLoadError("");
    setResult(null);
    setEvalError("");
    setAudioFailed(false);
    setPlaying(false);
    setProgress(0);
    recorder.reset();
    const s = ROUND_ORDER[idx];
    try {
      if (s === "LISTENING") {
        const res = await api<{ sessionId: string; difficulty: string; content: { title: string; script: string; instruction: string } }>(
          "/api/practice/listening/start",
          { method: "POST", body: {} }
        );
        const r: RoundState = {
          skill: s,
          sessionId: res.sessionId,
          title: res.content.title,
          script: res.content.script,
          instruction: res.content.instruction,
          difficulty: res.difficulty,
        };
        setRound(r);
        await loadListeningAudio(res.content.script, r);
      } else if (s === "SPEAKING") {
        const res = await api<{ sessionId: string; difficulty: string; topic: string; instruction: string }>(
          "/api/practice/speaking/start",
          { method: "POST", body: {} }
        );
        setRound({ skill: s, sessionId: res.sessionId, topic: res.topic, instruction: res.instruction, difficulty: res.difficulty });
      } else {
        const res = await api<{ sessionId: string; difficulty: string; text: string; instruction: string }>(
          "/api/practice/reading/start",
          { method: "POST", body: {} }
        );
        setRound({ skill: s, sessionId: res.sessionId, text: res.text, instruction: res.instruction, difficulty: res.difficulty });
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not start this round. Please try again.");
    } finally {
      setLoadingRound(false);
    }
  }, [recorder]);

  async function loadListeningAudio(text: string, r: RoundState) {
    const t = token();
    try {
      const res = await fetch(`${API_URL_RAW}/api/practice/listening/audio?text=${encodeURIComponent(text)}`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!res.ok) throw new Error("TTS unavailable");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setRound((prev) => (prev ? { ...prev, audioUrl: url } : prev));
      setAudioFailed(false);
    } catch {
      setAudioFailed(true);
    }
  }

  function startInterview() {
    setResults([]);
    setRoundIdx(0);
    setPhase("round");
    loadRound(0);
  }

  function togglePlay() {
    // Preferred: Deepgram AI audio
    if (round?.audioUrl) {
      const audio = audioRef.current;
      if (!audio) return;
      if (playing) audio.pause();
      else void audio.play();
      return;
    }
    // Fallback: browser speech synthesis (when AI audio is unavailable)
    if (!("speechSynthesis" in window)) {
      setEvalError("Audio playback is unavailable in this browser. Use Chrome/Edge for the best experience.");
      return;
    }
    if (playing) {
      window.speechSynthesis.pause();
      setPlaying(false);
      return;
    }
    const utterance = new SpeechSynthesisUtterance(round?.script ?? round?.text ?? "");
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onend = () => setPlaying(false);
    speechRef.current = utterance;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
  }

  async function evaluateRound() {
    if (!round || !recorder.audioUrl) return;
    setEvaluating(true);
    setEvalError("");
    try {
      const blob = await fetch(recorder.audioUrl).then((r) => r.blob());
      const t = token();
      const endpoint =
        round.skill === "LISTENING"
          ? `${API_URL_RAW}/api/practice/listening/evaluate?sessionId=${round.sessionId}`
          : round.skill === "SPEAKING"
          ? `${API_URL_RAW}/api/practice/speaking/evaluate?sessionId=${round.sessionId}`
          : `${API_URL_RAW}/api/practice/reading/evaluate?sessionId=${round.sessionId}`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": blob.type || "audio/webm", ...(t ? { Authorization: `Bearer ${t}` } : {}) },
        body: blob,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Evaluation failed. Is the speech/AI API configured?");
      const rr: RoundResult = {
        skill: round.skill,
        overall: json.overall ?? 0,
        scores: json.scores ?? [],
        transcript: json.transcript ?? "",
        summary: json.summary ?? "",
        mistakes: json.mistakes ?? [],
        strengths: json.strengths ?? [],
        weaknesses: json.weaknesses ?? [],
      };
      setResult(rr);
    } catch (err) {
      setEvalError(err instanceof Error ? err.message : "Evaluation failed. Please try again.");
    } finally {
      setEvaluating(false);
    }
  }

  function nextRound() {
    const completed = result ? [...results, result] : results;
    setResults(completed);
    if (roundIdx + 1 >= ROUND_ORDER.length) {
      setPhase("done");
    } else {
      const next = roundIdx + 1;
      setRoundIdx(next);
      loadRound(next);
    }
  }

  function restart() {
    setPhase("intro");
    setRoundIdx(0);
    setRound(null);
    setResult(null);
    setResults([]);
  }

  // cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (round?.audioUrl) URL.revokeObjectURL(round.audioUrl);
      recorder.reset();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- DONE SCREEN ----
  if (phase === "done") {
    const overall = results.length ? Math.round(results.reduce((s, r) => s + r.overall, 0) / results.length) : 0;
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card className="relative overflow-hidden p-8 text-center">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gradient-rose opacity-10 blur-3xl" />
          <span className="text-5xl">🎉</span>
          <h2 className="mt-4 font-display text-2xl font-extrabold text-ink-900">Mock Interview Complete!</h2>
          <p className="mt-1 text-sm text-ink-500">You completed {results.length} AI-analyzed rounds across Listening, Speaking &amp; Reading.</p>
          <div className="mx-auto mt-6 inline-flex h-32 w-32 items-center justify-center rounded-full bg-gradient-brand text-white shadow-lift">
            <div>
              <p className="font-display text-4xl font-extrabold">{overall}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide">out of 100</p>
            </div>
          </div>
          <p className="mt-3 text-sm text-ink-500">Overall communication score</p>

          <div className="mt-8 space-y-3 text-left">
            {results.map((r) => {
              const m = SKILL_META[r.skill];
              return (
                <div key={r.skill} className="rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-white ${m.gradient}`}>
                        <m.icon className="h-4 w-4" />
                      </span>
                      <span className="font-bold text-ink-900">{m.title}</span>
                    </div>
                    <span className="font-display text-xl font-extrabold text-ink-900">{r.overall}%</span>
                  </div>
                  <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                    <div className={`h-full rounded-full ${m.bar}`} style={{ width: `${r.overall}%` }} />
                  </div>
                  {r.summary && <p className="mt-2 text-xs leading-relaxed text-ink-500">{r.summary}</p>}
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex gap-3">
            <Button variant="gradient" className="flex-1" onClick={restart}><RefreshCw className="h-4 w-4" /> Restart Interview</Button>
            <Button variant="outline" className="flex-1" onClick={() => (window.location.href = "/student/practice")}>More Practice</Button>
          </div>
        </Card>
      </div>
    );
  }

  // ---- INTRO SCREEN ----
  if (phase === "intro") {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <PageHeader
          eyebrow="AI Mock Interview"
          title="Full LSRW Communication Interview"
          subtitle="Answer AI-generated questions across Listening, Speaking & Reading. Each answer is analyzed by AI and scored out of 100."
          icon={<Sparkles className="h-6 w-6" />}
          gradient="bg-gradient-brand"
        />
        <Card className="p-8 text-center">
          <div className="flex justify-center gap-3">
            {ROUND_ORDER.map((s) => {
              const m = SKILL_META[s];
              return (
                <span key={s} className={`flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-soft ${m.gradient}`}>
                  <m.icon className="h-7 w-7" />
                </span>
              );
            })}
          </div>
          <h2 className="mt-5 font-display text-2xl font-extrabold text-ink-900">3 rounds · ~3–5 minutes</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-500">
            Round 1 — Listen to an AI audio clip and speak what you understood.
            Round 2 — Speak on an AI-generated topic.
            Round 3 — Read an AI sentence aloud.
            Every round is scored by AI.
          </p>
          <Button variant="gradient" size="lg" className="mt-6" onClick={startInterview}>
            <Sparkles className="h-5 w-5" /> Start Mock Interview
          </Button>
          <p className="mt-3 text-xs text-ink-400">Microphone &amp; audio playback required. Use Chrome/Edge for best experience.</p>
        </Card>
      </div>
    );
  }

  // ---- ROUND SCREEN ----
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow={`Round ${roundIdx + 1} of ${ROUND_ORDER.length} · ${meta.title}`}
        title={round?.topic ?? round?.title ?? "Get ready…"}
        subtitle={round?.instruction ?? "Listen / speak / read as instructed, then submit to AI."}
        icon={<meta.icon className="h-6 w-6" />}
        gradient={meta.gradient}
        right={<Badge tone={meta.tone}>{skill}</Badge>}
      />

      {loadError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{loadError}</p>}
      {evalError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{evalError}</p>}

      {/* progress stepper */}
      <div className="flex items-center gap-2">
        {ROUND_ORDER.map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full ${i < roundIdx ? "bg-emerald-500" : i === roundIdx ? meta.bar : "bg-ink-100"}`} />
          </div>
        ))}
      </div>

      {loadingRound || !round ? (
        <Card className="p-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-sky-600" />
          <p className="mt-3 text-sm font-semibold text-ink-500">Generating your AI {meta.title.toLowerCase()} question…</p>
        </Card>
      ) : !result ? (
        <Card className="relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full opacity-10 blur-3xl bg-gradient-brand" />

          {/* LISTENING: audio player */}
          {skill === "LISTENING" && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-ink-400">AI Audio</p>
                  <p className="font-display text-lg font-extrabold text-ink-900">{round.title}</p>
                  <p className="text-xs text-ink-400">Listen carefully — then say what you understood.</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="md" className="p-2" onClick={() => setMuted((m) => { const n = !m; if (audioRef.current) audioRef.current.volume = n ? 0 : volume; return n; })} aria-label={muted ? "Unmute" : "Mute"}>
                    {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                  </Button>
                  <input type="range" min={0} max={1} step={0.05} value={muted ? 0 : volume} onChange={(e) => { const v = Number(e.target.value); setVolume(v); setMuted(v === 0); if (audioRef.current) audioRef.current.volume = v; }} className="w-20 accent-sky-600" aria-label="Volume" />
                  <Button variant="gradient" size="lg" onClick={togglePlay} className="bg-gradient-sky" disabled={!round.audioUrl && !audioFailed}>
                    {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
                    {playing ? "Pause" : round.audioUrl ? "Play Audio" : audioFailed ? "Play (Browser Voice)" : "Loading…"}
                  </Button>
                </div>
              </div>
              <div className="mt-5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                <div className="h-full rounded-full bg-gradient-sky transition-all duration-200" style={{ width: `${progress}%` }} />
              </div>
              {audioFailed && (
                <p className="mt-3 rounded-xl bg-sky-50 px-4 py-2.5 text-sm font-medium text-sky-700">
                  AI audio is unavailable — enable Deepgram TTS, or read the script below and answer aloud.
                </p>
              )}
              {round.script && audioFailed && (
                <p className="mt-3 rounded-xl bg-ink-50 p-4 text-sm leading-relaxed text-ink-700">{round.script}</p>
              )}
              {round.audioUrl && (
                <audio
                  ref={audioRef}
                  src={round.audioUrl}
                  onTimeUpdate={(e) => { const a = e.currentTarget; if (a.duration) setProgress((a.currentTime / a.duration) * 100); }}
                  onPlay={() => setPlaying(true)}
                  onPause={() => setPlaying(false)}
                  onEnded={() => setPlaying(false)}
                  className="hidden"
                />
              )}
            </div>
          )}

          {/* SPEAKING: topic */}
          {skill === "SPEAKING" && (
            <div className="rounded-2xl bg-violet-50 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-500">AI Topic</p>
              <p className="mt-1 font-display text-lg font-bold text-ink-900">{round.topic}</p>
              <p className="mt-1 text-sm text-ink-600">{round.instruction}</p>
            </div>
          )}

          {/* READING: text */}
          {skill === "READING" && (
            <div className="rounded-2xl bg-emerald-50 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Read this aloud</p>
              <p className="mt-1 font-display text-lg font-bold text-ink-900">{round.text}</p>
              <p className="mt-1 text-sm text-ink-600">{round.instruction}</p>
            </div>
          )}

          <div className="mt-6 flex flex-col items-center">
            <button
              onClick={recorder.recording ? recorder.stop : recorder.start}
              className={`group relative flex h-24 w-24 items-center justify-center rounded-full transition-all ${recorder.recording ? "bg-gradient-rose shadow-glow" : "bg-gradient-brand shadow-lift hover:-translate-y-1"}`}
              aria-label={recorder.recording ? "Stop recording" : "Start recording"}
            >
              {recorder.recording && <span className="absolute inset-0 rounded-full bg-rose-500 animate-pulse-ring" />}
              {recorder.recording ? <Square className="relative h-8 w-8 text-white" /> : <Mic className="relative h-9 w-9 text-white" />}
            </button>
            <p className="mt-4 text-sm font-bold uppercase tracking-widest text-ink-500">{recorder.recording ? "Tap to stop" : "Tap to record & answer"}</p>
            {recorder.recording && (
              <div className="mt-2 flex items-center gap-2 rounded-full bg-ink-100 px-4 py-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                <span className="font-mono text-sm font-bold text-ink-700">{mmss(recorder.elapsed)}</span>
              </div>
            )}
          </div>

          {recorder.recording && <div className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-center animate-fade-in-up"><Waveform active className="h-6" color="#F43F5E" /></div>}
          {recorder.error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{recorder.error}</p>}

          {recorder.audioUrl && !recorder.recording && (
            <div className="mt-6 space-y-4 animate-fade-in-up">
              <audio src={recorder.audioUrl} controls className="w-full" />
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" onClick={recorder.reset}><RefreshCw className="h-4 w-4" /> Record Again</Button>
                <Button variant="gradient" onClick={evaluateRound} disabled={evaluating} className="flex-1 sm:flex-none">
                  {evaluating ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><Sparkles className="h-4 w-4" /> Submit to AI</>}
                </Button>
              </div>
            </div>
          )}

          {evaluating && (
            <div className="mt-6 rounded-2xl bg-violet-50 p-6 text-center animate-fade-in-up">
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="h-5 w-5 animate-spin text-violet-600" />
                <p className="font-bold text-violet-700">🤖 AI is analyzing your answer…</p>
              </div>
            </div>
          )}
        </Card>
      ) : (
        /* RESULT */
        <div className="space-y-6 animate-fade-in-up">
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-white ${meta.gradient}`}><meta.icon className="h-6 w-6" /></span>
              <div>
                <h3 className="font-display text-xl font-extrabold text-ink-900">Your {meta.title} Score: {result.overall}%</h3>
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

          {result.transcript && (
            <Card className="p-6">
              <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-400">What you said</h3>
              <p className="rounded-xl bg-ink-50 p-4 text-sm leading-relaxed text-ink-700">{result.transcript}</p>
            </Card>
          )}

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

          <div className="flex items-center justify-end gap-3">
            {roundIdx + 1 < ROUND_ORDER.length ? (
              <Button variant="gradient" onClick={nextRound}>
                Next Round <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="gradient" onClick={nextRound}>
                See Final Score <CheckCircle2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
