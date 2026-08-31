"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api, API_URL_RAW } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { ProgressBar } from "@/components/ui/progress-bar";
import { useRecorder } from "@/components/practice/use-recorder";
import { Loader2, Mic, Square, RefreshCw, Play, Sparkles, ChevronLeft, ChevronRight, CheckCircle2, Send, Volume2, Hourglass, BookOpen, PenLine } from "lucide-react";

interface Question {
  id: string;
  questionNumber: number;
  type: string;
  prompt: string;
  script?: string | null;
  expectedAnswer?: string | null;
  criteria?: string[] | null;
}

interface MySubmission {
  id: string;
  status: string;
  score: number | null;
  content: unknown;
  feedback: unknown;
  submittedAt: string;
  gradedAt: string | null;
}

interface Detail {
  id: string;
  skill: string;
  title: string;
  description: string | null;
  difficulty: string;
  deadline: string | null;
  criteria: string[] | null;
  questions: Question[];
  mySubmission: MySubmission | null;
}

interface Evaluation {
  overallScore?: number;
  metrics?: { metric: string; score: number }[];
  perQuestion?: { questionNumber: number; scores: { metric: string; score: number }[]; overallScore: number; feedback: string; strengths: string[]; improvements: string[] }[];
  feedback?: string;
  strengths?: string[];
  improvements?: string[];
}

interface Answer {
  questionNumber: number;
  text?: string;
  transcript?: string;
}

function token(): string | null {
  return typeof window === "undefined" ? null : window.localStorage.getItem("lsrw_token");
}

function scoreColor(score: number) {
  return score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-gradient-brand" : "bg-amber-500";
}

export default function StudentAssignmentPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const router = useRouter();

  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"do" | "pending" | "result">("do");

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, Answer>>({});
  const [submitting, setSubmitting] = useState(false);
  const [reEvaluating, setReEvaluating] = useState(false);
  const [error, setError] = useState("");
  const [evalResult, setEvalResult] = useState<Evaluation | null>(null);

  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);

  const recorder = useRecorder(180);
  const [transcribing, setTranscribing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api<Detail>(`/api/students/assignments/${id}`);
      setDetail(d);
      const sub = d.mySubmission;
      setMode(sub ? (sub.score != null ? "result" : "pending") : "do");
      if (sub && sub.score != null) setEvalResult(sub.feedback as Evaluation | null);
      const initial: Record<number, Answer> = {};
      if (sub && sub.content && typeof sub.content === "object") {
        const content = sub.content as { answers?: Answer[] };
        for (const a of content.answers ?? []) initial[a.questionNumber] = a;
      }
      setAnswers(initial);
    } catch (e) {
      toast("error", e instanceof Error ? e.message : "Failed to load assignment");
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  async function playQuestionAudio(q: Question) {
    if (!q.script) return;
    setError("");
    try {
      const t = token();
      const res = await fetch(`${API_URL_RAW}/api/practice/listening/audio?text=${encodeURIComponent(q.script)}`, {
        headers: t ? { Authorization: `Bearer ${t}` } : {},
      });
      if (!res.ok) throw new Error("TTS unavailable");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      setTimeout(() => audioRef.current?.play(), 50);
      return;
    } catch {
      if (speechRef.current) window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(q.script);
      speechRef.current = u;
      window.speechSynthesis.speak(u);
    }
  }

  function stopAudio() {
    window.speechSynthesis.cancel();
    audioRef.current?.pause();
  }

  function updateAnswer(qn: number, patch: Partial<Answer>) {
    setAnswers((prev) => ({ ...prev, [qn]: { ...prev[qn], questionNumber: qn, ...patch } }));
  }

  async function transcribeCurrent() {
    const q = detail?.questions[current];
    if (!q || !recorder.audioUrl) return;
    setTranscribing(true);
    setError("");
    try {
      const t = token();
      const blob = await fetch(recorder.audioUrl).then((r) => r.blob());
      const res = await fetch(`${API_URL_RAW}/api/students/assignments/${id}/audio`, {
        method: "POST",
        headers: {
          "Content-Type": blob.type || "audio/webm",
          ...(t ? { Authorization: `Bearer ${t}` } : {}),
        },
        body: blob,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Speech recognition failed. Please try again.");
      updateAnswer(q.questionNumber, { transcript: json.transcript });
      toast("success", "Transcript ready");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Speech recognition is temporarily unavailable.");
    } finally {
      setTranscribing(false);
      recorder.reset();
    }
  }

  async function submit() {
    if (!detail) return;
    setSubmitting(true);
    setError("");
    try {
      const payload = detail.questions
        .map((q) => answers[q.questionNumber])
        .filter(Boolean)
        .map((a) => ({ questionNumber: a.questionNumber, text: a.text ?? "", transcript: a.transcript ?? "" }));
      const res = await api<{ submitted: boolean; evaluated: boolean; result?: Evaluation }>(`/api/students/assignments/${detail.id}/submit`, {
        method: "POST",
        body: { answers: payload },
      });
      if (res.evaluated && res.result) {
        setEvalResult(res.result);
        setMode("result");
      } else {
        setMode("pending");
      }
      toast("success", "Assignment submitted");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function retryEvaluate() {
    if (!detail) return;
    setReEvaluating(true);
    setError("");
    try {
      const res = await api<{ result: Evaluation }>(`/api/students/assignments/${detail.id}/evaluate`, { method: "POST", body: {} });
      setEvalResult(res.result);
      setMode("result");
      toast("success", "Evaluation complete");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Evaluation failed. Please try again.");
    } finally {
      setReEvaluating(false);
    }
  }

  if (loading) return <PageSkeleton />;
  if (!detail) return <p className="p-8 text-ink-500">Assignment not found.</p>;

  const skill = detail.skill;
  const questions = detail.questions;
  const q = questions[current];
  const doneCount = questions.filter((x) => {
    const a = answers[x.questionNumber];
    return a && (a.text?.trim() || a.transcript?.trim());
  }).length;

  const headerIcon =
    skill === "SPEAKING" ? <Mic className="h-6 w-6" /> :
    skill === "LISTENING" ? <Volume2 className="h-6 w-6" /> :
    skill === "READING" ? <BookOpen className="h-6 w-6" /> : <PenLine className="h-6 w-6" />;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader eyebrow={`${skill} Assignment`} title={detail.title} subtitle={detail.description ?? "Answer each question below."} icon={headerIcon} gradient="bg-gradient-brand" />

      <div className="flex flex-wrap gap-2">
        <Badge tone="primary">{skill}</Badge>
        <Badge tone={detail.difficulty === "HARD" ? "warning" : detail.difficulty === "MEDIUM" ? "default" : "success"}>{detail.difficulty}</Badge>
        {detail.deadline && <span className="text-sm font-semibold text-ink-500">Due {new Date(detail.deadline).toLocaleDateString()}</span>}
      </div>

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {/* PENDING */}
      {mode === "pending" && (
        <Card className="p-10 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600"><Hourglass className="h-7 w-7" /></span>
          <h2 className="mt-4 font-display text-2xl font-extrabold text-ink-900">Submission received</h2>
          <p className="mt-2 text-sm text-ink-500">Your answers have been recorded. AI evaluation is temporarily unavailable — try again now or check back shortly.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button variant="gradient" onClick={retryEvaluate} disabled={reEvaluating}>
              {reEvaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Check for result
            </Button>
            <Button variant="outline" onClick={() => router.push("/student/assignments")}>Back to assignments</Button>
          </div>
        </Card>
      )}

      {/* RESULT */}
      {mode === "result" && evalResult && (
        <div className="space-y-6">
          <Card className="relative overflow-hidden p-8 text-center">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-gradient-brand opacity-15 blur-2xl" />
            <p className="text-xs font-bold uppercase tracking-widest text-ink-400">Overall Score</p>
            <div className="mx-auto mt-3 flex h-32 w-32 items-center justify-center rounded-full border-8 border-primary-100">
              <span className="font-display text-5xl font-extrabold text-primary-600">{evalResult.overallScore ?? 0}%</span>
            </div>
            <div className="mx-auto mt-5 max-w-md">
              <ProgressBar value={evalResult.overallScore ?? 0} color={scoreColor(evalResult.overallScore ?? 0)} />
            </div>
            {detail.mySubmission && <p className="mt-4 text-sm text-ink-500">Submitted {new Date(detail.mySubmission.submittedAt).toLocaleString()}</p>}
          </Card>

          {evalResult.metrics && evalResult.metrics.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-400">Performance by Criterion</h3>
              <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                {evalResult.metrics.map((m) => (
                  <div key={m.metric}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-semibold text-ink-700">{m.metric.charAt(0) + m.metric.slice(1).toLowerCase()}</span>
                      <span className="font-mono font-bold text-ink-900">{m.score}%</span>
                    </div>
                    <ProgressBar value={m.score} color={scoreColor(m.score)} />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {evalResult.perQuestion && evalResult.perQuestion.length > 0 && (
            <Card className="p-6">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-ink-400">Question Feedback</h3>
              <div className="space-y-3">
                {evalResult.perQuestion.map((pq) => (
                  <div key={pq.questionNumber} className="rounded-xl border border-ink-100 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-ink-900">Question {pq.questionNumber}</p>
                      <span className="font-mono text-sm font-extrabold text-primary-600">{pq.overallScore}%</span>
                    </div>
                    {pq.scores.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {pq.scores.map((s) => <Badge key={s.metric} tone={s.score >= 70 ? "success" : s.score >= 50 ? "warning" : "danger"}>{s.metric}: {s.score}%</Badge>)}
                      </div>
                    )}
                    {pq.feedback && <p className="mt-2 text-sm text-ink-600">{pq.feedback}</p>}
                    {pq.strengths.length > 0 && <p className="mt-1 text-xs text-emerald-700">Strengths: {pq.strengths.join("; ")}</p>}
                    {pq.improvements.length > 0 && <p className="mt-1 text-xs text-amber-700">Improve: {pq.improvements.join("; ")}</p>}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {evalResult.feedback && (
            <Card className="relative overflow-hidden border-violet-200/70 bg-violet-50/60 p-6">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-brand opacity-20 blur-2xl" />
              <h3 className="text-sm font-bold uppercase tracking-wide text-violet-700">AI Feedback</h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-800">{evalResult.feedback}</p>
              {evalResult.strengths && evalResult.strengths.length > 0 && (
                <p className="mt-3 text-sm font-medium text-emerald-700">Strengths: {evalResult.strengths.join("; ")}</p>
              )}
              {evalResult.improvements && evalResult.improvements.length > 0 && (
                <p className="mt-1 text-sm font-medium text-amber-700">To improve: {evalResult.improvements.join("; ")}</p>
              )}
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="gradient" className="flex-1" onClick={() => router.push("/student/assignments")}>
              <CheckCircle2 className="h-4 w-4" /> Done
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => router.push("/student/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      )}

      {/* DO — per-question flow */}
      {mode === "do" && q && (
        <div className="space-y-5">
          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between text-sm font-bold">
              <span className="text-ink-500">Question {current + 1} of {questions.length}</span>
              <span className="text-ink-400">{doneCount}/{questions.length} answered</span>
            </div>
            <ProgressBar value={questions.length ? (doneCount / questions.length) * 100 : 0} color="bg-gradient-brand" />
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2">
              <Badge tone="primary">Q{q.questionNumber}</Badge>
              <Badge tone="ai">{q.type}</Badge>
            </div>
            <p className="mt-3 font-display text-lg font-extrabold leading-snug text-ink-900">{q.prompt}</p>

            {skill === "LISTENING" && q.script && (
              <div className="mt-4 rounded-2xl bg-ink-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Listen carefully, then answer</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => playQuestionAudio(q)}><Play className="h-4 w-4" /> Play Audio</Button>
                  <Button size="sm" variant="ghost" onClick={stopAudio}><RefreshCw className="h-4 w-4" /> Stop</Button>
                </div>
                <audio ref={audioRef} src={audioUrl ?? undefined} className="mt-3 hidden" />
              </div>
            )}

            {skill === "READING" && q.script && (
              <div className="mt-4 rounded-2xl bg-ink-50 p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Read the passage, then answer</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">{q.script}</p>
              </div>
            )}

            {skill === "SPEAKING" && (
              <div className="mt-4 rounded-2xl bg-rose-50/60 p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-rose-600">Record your spoken answer</p>
                {recorder.recording ? (
                  <div className="mt-3 flex items-center gap-3">
                    <button onClick={() => recorder.stop()} className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-rose text-white shadow-glow" aria-label="Stop">
                      <Square className="h-5 w-5" />
                    </button>
                    <span className="text-sm font-bold text-rose-600">Recording… ({recorder.elapsed}s)</span>
                  </div>
                ) : recorder.audioUrl ? (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <audio src={recorder.audioUrl} controls className="h-10 min-w-40 flex-1" />
                    <Button size="sm" variant="outline" onClick={() => recorder.reset()}><RefreshCw className="h-4 w-4" /> Redo</Button>
                    <Button size="sm" variant="gradient" onClick={transcribeCurrent} disabled={transcribing}>
                      {transcribing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Transcribe
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button onClick={() => recorder.start()} className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-rose text-white shadow-glow" aria-label="Record">
                      <Mic className="h-6 w-6" />
                    </button>
                    <span className="text-sm text-ink-500">Tap the mic and speak your answer.</span>
                  </div>
                )}
                {recorder.error && <p className="mt-2 text-xs font-medium text-red-600">{recorder.error}</p>}
              </div>
            )}

            <div className="mt-5">
              <label className="block text-sm font-semibold text-ink-700">
                {skill === "SPEAKING" ? "Your answer (transcript)" : skill === "WRITING" ? "Write your answer" : "Your answer"}
              </label>
              <textarea
                value={answers[q.questionNumber]?.transcript || answers[q.questionNumber]?.text || ""}
                onChange={(e) => updateAnswer(q.questionNumber, skill === "SPEAKING" ? { transcript: e.target.value } : { text: e.target.value })}
                rows={skill === "WRITING" ? 8 : 4}
                placeholder={skill === "SPEAKING" ? "Your transcript will appear here…" : "Type your answer here…"}
                className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-3 text-sm outline-none focus:border-primary-500"
              />
              {q.criteria && q.criteria.length > 0 && (
                <p className="mt-1.5 text-xs text-ink-400">Evaluated on: {q.criteria.join(", ")}</p>
              )}
            </div>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="outline" onClick={() => setCurrent((c) => Math.max(0, c - 1))} disabled={current === 0}><ChevronLeft className="h-4 w-4" /> Previous</Button>
            {current < questions.length - 1 ? (
              <Button variant="gradient" onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}>Next <ChevronRight className="h-4 w-4" /></Button>
            ) : (
              <Button variant="gradient" onClick={submit} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Submit Assignment
              </Button>
            )}
          </div>
        </div>
      )}

      {/* DO — no questions */}
      {mode === "do" && (!q || questions.length === 0) && (
        <Card className="p-10 text-center">
          <p className="text-3xl">No questions</p>
          <p className="mt-2 text-sm text-ink-500">This assignment has no questions yet. Please check back later.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push("/student/assignments")}>Back to assignments</Button>
        </Card>
      )}
    </div>
  );
}