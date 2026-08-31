"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { PenLine, CheckCircle2, Loader2, RefreshCw, NotebookPen } from "lucide-react";

const WRITE_SECONDS = 5 * 60;

interface WritingContent {
  id: string;
  title: string;
  difficulty: string;
  text: string;
}

const FOCUS = ["Spelling", "Grammar", "Sentence structure", "Handwriting", "Vocabulary"];

export default function WritingPractice() {
  const [content, setContent] = useState<WritingContent | null>(null);
  const [sessionId, setSessionId] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(WRITE_SECONDS);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [loadingContent, setLoadingContent] = useState(true);
  const [elapsedAtComplete, setElapsedAtComplete] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function newRound() {
    setLoadingContent(true);
    setError("");
    setCompleted(false);
    setSecondsLeft(WRITE_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    try {
      const res = await api<{ sessionId: string; difficulty: string; source: string; text: string; instruction: string }>(
        "/api/practice/writing/start",
        { method: "POST", body: {} }
      );
      setSessionId(res.sessionId);
      setContent({ id: res.sessionId, title: "Write This", difficulty: res.difficulty, text: res.text });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create your practice activity. Please try again.");
    } finally {
      setLoadingContent(false);
    }
  }

  useEffect(() => {
    newRound();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (completed || !content || !sessionId) return;
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [completed, content, sessionId]);

  async function complete() {
    if (!sessionId || !content) return;
    setSubmitting(true);
    setError("");
    const duration = WRITE_SECONDS - secondsLeft;
    try {
      const res = await api<{ completed: boolean; focus: string[]; overall: number }>("/api/practice/writing/complete", {
        method: "POST",
        body: { sessionId, durationSeconds: duration },
      });
      setElapsedAtComplete(duration);
      setCompleted(res.completed);
      if (timerRef.current) clearInterval(timerRef.current);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save your practice.");
    } finally {
      setSubmitting(false);
    }
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const spentMm = String(Math.floor(elapsedAtComplete / 60)).padStart(2, "0");
  const spentSs = String(elapsedAtComplete % 60).padStart(2, "0");
  const lowTime = secondsLeft <= 60;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        eyebrow="Writing Practice"
        title="Read · Write in Your Notebook"
        subtitle="Read the prompt and write your answer in your notebook or on paper. No typing needed — just mark it done when you finish."
        icon={<PenLine className="h-6 w-6" />}
        gradient="bg-gradient-amber"
      />

      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</p>}

      {loadingContent ? (
        <Card className="p-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-amber-600" />
          <p className="mt-3 text-sm font-semibold text-ink-500">Loading your writing prompt…</p>
        </Card>
      ) : content ? (
        !completed ? (
          <>
            <Card className="relative overflow-hidden border-amber-200/60 bg-gradient-to-br from-amber-50 to-orange-50 p-6">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-amber opacity-15 blur-2xl" />
              <div className="flex items-center gap-2">
                <Badge tone="warning">{content.difficulty}</Badge>
                <span className="text-[11px] font-bold uppercase tracking-wider text-ink-400">Writing prompt</span>
              </div>
              <p className="mt-3 font-display text-xl font-extrabold leading-snug text-ink-900">{content.text}</p>
            </Card>

            <Card className="p-6 sm:p-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wide text-ink-400">Instructions</h3>
                  <p className="mt-1 text-sm text-ink-500">
                    Take out your <strong>notebook</strong> or a sheet of paper and write your answer by hand.
                  </p>
                </div>
                <div className={`flex items-center gap-2 rounded-2xl px-5 py-3 ${lowTime ? "bg-red-50" : "bg-ink-100"}`}>
                  <NotebookPen className={`h-5 w-5 ${lowTime ? "text-red-500" : "text-ink-500"}`} />
                  <span className={`font-mono text-2xl font-extrabold ${lowTime ? "text-red-600" : "text-ink-900"}`}>{mm}:{ss}</span>
                </div>
              </div>

              <ul className="mt-5 space-y-2 text-sm text-ink-600">
                <li className="flex items-start gap-2"><span className="text-amber-500">✍️</span> Write in complete sentences — aim for at least 5–7 sentences.</li>
                <li className="flex items-start gap-2"><span className="text-amber-500">🧠</span> Focus on spelling, grammar and clear sentence structure.</li>
                <li className="flex items-start gap-2"><span className="text-amber-500">⏱️</span> You have {WRITE_SECONDS / 60} minutes. When you finish, mark the practice as complete.</li>
              </ul>

              <Button variant="gradient" size="xl" full className="mt-8 bg-gradient-amber" onClick={complete} disabled={submitting}>
                {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving…</> : <><CheckCircle2 className="h-5 w-5" /> I HAVE COMPLETED WRITING</>}
              </Button>
              <p className="mt-3 text-center text-xs text-ink-400">
                Don&apos;t type anything — this practice is about handwriting. Click the button only when your answer is written.
              </p>
            </Card>
          </>
        ) : (
          <div className="space-y-6 animate-fade-in-up">
            <Card className="relative overflow-hidden border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-mint-50 p-8 text-center">
              <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-gradient-mint opacity-20 blur-3xl" />
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-mint text-white shadow-soft"><CheckCircle2 className="h-8 w-8" /></span>
              <h3 className="mt-4 font-display text-2xl font-extrabold text-ink-900">Writing Practice Complete!</h3>
              <p className="mt-2 text-sm text-ink-500">
                You wrote for {spentMm}:{spentSs}. Great handwriting practice — keep up the habit.
              </p>
              <div className="mt-4 flex justify-center">
                <Badge tone="success">Practice saved to your progress</Badge>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-bold uppercase tracking-wide text-ink-400">Focus on these next time</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {FOCUS.map((f) => (
                  <Badge key={f} tone="warning">{f}</Badge>
                ))}
              </div>
              <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
                💡 After writing, read your answer once more and check: spelling of every word, verb tenses, and whether each sentence is complete.
              </p>
            </Card>

            <div className="flex gap-3">
              <Button variant="gradient" className="flex-1 bg-gradient-amber" onClick={newRound}>
                <RefreshCw className="h-4 w-4" /> Next Prompt
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => window.location.assign("/student/practice")}>More Practice</Button>
            </div>
          </div>
        )
      ) : null}
    </div>
  );
}