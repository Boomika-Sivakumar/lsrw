import { useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Badge, Card } from "../../components/ui";
import { useRecorder } from "../../audio/recorder";
import { useToast } from "../../hooks/useToast";
import type { AnalysisResult } from "../../types";
import { AnalysisResults } from "../../components/results/AnalysisResults";

interface InterviewQuestion {
  question: string;
  order: number;
}

export function InterviewPage() {
  const [role, setRole] = useState("General");
  const [interviewId, setInterviewId] = useState<number | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [current, setCurrent] = useState(0);
  const [typedAnswer, setTypedAnswer] = useState("");
  const [report, setReport] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { recording, transcript, supportError, start, stop } = useRecorder();
  const { toast } = useToast();

  const startInterview = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/practice/interview/start", { job_role: role });
      setInterviewId(data.interview_id);
      setQuestions(data.questions);
      setCurrent(0);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async (text: string, durationMs: number) => {
    if (!interviewId || !text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post(`/practice/interview/${interviewId}/answer`, {
        question: questions[current].question,
        transcript: text,
        duration_ms: durationMs,
      });
      if (data.report) {
        setReport(data.report);
        toast("Interview complete! 🎉");
      } else {
        setCurrent((c) => c + 1);
        setTypedAnswer("");
        toast(`Answer analyzed. ${data.remaining} questions left.`);
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const stopAndSubmit = async () => {
    const res = await stop();
    if (res.transcript.trim()) await submitAnswer(res.transcript, res.durationMs);
  };

  if (report) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <AnalysisResults result={report} />
        <button className="btn btn-primary" onClick={() => { setReport(null); setInterviewId(null); setCurrent(0); }}>New Interview</button>
      </div>
    );
  }

  if (!interviewId) {
    return (
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-bold">AI Mock Interview</h1>
        <Card title="Setup">
          <label className="label">Job Role</label>
          <input className="input" placeholder="e.g. Software Engineer, Marketing Intern…" value={role} onChange={(e) => setRole(e.target.value)} />
          {error && <div className="mt-3 text-sm text-rose-600">{error}</div>}
          <button className="btn btn-primary mt-4 w-full" onClick={startInterview} disabled={loading}>
            {loading ? "Starting…" : "Begin Interview"}
          </button>
        </Card>
      </div>
    );
  }

  const q = questions[current];

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Mock Interview — {role}</h1>
        <Badge tone="violet">Question {current + 1} / {questions.length}</Badge>
      </div>
      <Card>
        <div className="mb-4 flex gap-1">
          {questions.map((_, i) => (
            <div key={i} className={`h-2 flex-1 rounded-full ${i < current ? "bg-emerald-500" : i === current ? "bg-brand-500" : "bg-slate-200"}`} />
          ))}
        </div>
        <div className="mb-4 text-lg font-medium text-slate-800">{q.question}</div>

        {!recording ? (
          <div className="space-y-3">
            <textarea
              className="input min-h-[90px]"
              placeholder="Type your answer…"
              value={typedAnswer}
              onChange={(e) => setTypedAnswer(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <button className="btn btn-primary" onClick={() => submitAnswer(typedAnswer, typedAnswer.split(" ").length * 400)} disabled={loading || !typedAnswer.trim()}>
                {loading ? "Analyzing…" : "Submit Answer"}
              </button>
              <button className="btn btn-outline" onClick={async () => { setError(null); await start(); }} disabled={loading}>🎤 Answer by Voice</button>
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-6 text-center">
            <div className="mb-2 font-medium text-rose-600">● Recording… answer aloud</div>
            {transcript && <p className="mb-3 text-sm text-slate-700">"{transcript}"</p>}
            <button className="btn btn-danger" onClick={stopAndSubmit} disabled={loading}>{loading ? "Analyzing…" : "Stop & Submit"}</button>
          </div>
        )}
        {supportError && <p className="mt-2 text-xs text-amber-600">{supportError}</p>}
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </Card>
    </div>
  );
}