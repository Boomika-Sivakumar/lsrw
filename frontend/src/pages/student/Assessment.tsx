import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card } from "../../components/ui";
import { stopSpeaking } from "../../audio/tts";
import { AudioButton } from "../../components/AudioButton";
import { useRecorder } from "../../audio/recorder";
import { useToast } from "../../hooks/useToast";

interface Question {
  id: number;
  skill: string;
  type: string;
  prompt: string;
  passage: string | null;
  options: string[] | null;
  order_no: number;
}

interface SubmitResult {
  overall: number;
  level: string;
  scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  learning_path: Array<{ week: number; focus: string }>;
  summary: string;
}

const SECTIONS = ["overview", "listening", "reading", "writing", "speaking", "result"];

export function AssessmentPage() {
  const [stage, setStage] = useState("overview");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    stopSpeaking();
    return () => stopSpeaking();
  }, [stage]);

  const start = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/assessments?kind=initial");
      sessionStorage.setItem("lsrw_assessment_id", String(data.assessment_id));
      const { data: detail } = await api.get(`/assessments/${data.assessment_id}`);
      setQuestions(detail.questions);
      setStage("listening");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const grouped = useMemo(
    () =>
      questions.reduce<Record<string, Question[]>>((acc, q) => {
        (acc[q.skill] = acc[q.skill] || []).push(q);
        return acc;
      }, {}),
    [questions]
  );

  const setAnswer = (qid: number, value: string) =>
    setAnswers((prev) => ({ ...prev, [qid]: value }));

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const payload = Object.entries(answers).map(([qid, text]) => ({
        question_id: Number(qid),
        text,
      }));
      const { data } = await api.post(`/assessments/${sessionStorage.getItem("lsrw_assessment_id")}`, { answers: payload });
      setResult(data);
      setStage("result");
      toast("Assessment scored!");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (loading && stage === "overview") return <Spinner />;
  if (stage === "overview") {
    return (
      <div className="mx-auto max-w-2xl">
        <Card title="Initial LSRW Assessment">
          <p className="mb-4 text-sm text-slate-600">
            This assessment measures your Listening, Speaking, Reading and Writing skills. It takes
            about 15 minutes. After submission you will receive skill scores, your communication
            level, strengths, weaknesses and a personalized learning path.
          </p>
          <ul className="mb-6 space-y-2 text-sm text-slate-600">
            <li>👂 Listening — play the audio and answer questions</li>
            <li>📖 Reading — read passages and answer questions</li>
            <li>✍️ Writing — respond to writing prompts</li>
            <li>🎤 Speaking — record short spoken answers</li>
          </ul>
          {error && <div className="mb-4 rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}
          <button className="btn btn-primary w-full" onClick={start}>
            Start Assessment
          </button>
        </Card>
      </div>
    );
  }

  if (stage === "result" && result) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Card title="Assessment Complete 🎉">
          <div className="mb-4 flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-brand-700">{result.overall}</div>
              <div className="text-xs text-slate-500">Overall Score</div>
            </div>
            <div>
              <div className="text-lg font-semibold">Communication Level: <Badge tone="violet">{result.level}</Badge></div>
              <p className="mt-1 text-sm text-slate-500">{result.summary}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(result.scores).map(([k, v]) => (
              <div key={k} className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs capitalize text-slate-500">{k}</div>
                <div className="text-lg font-semibold text-slate-700">{v}</div>
              </div>
            ))}
          </div>
          <div className="mt-4">
            <h4 className="mb-2 text-sm font-semibold">Your Learning Path</h4>
            <div className="space-y-2">
              {result.learning_path.map((w) => (
                <div key={w.week} className="flex items-center gap-3 text-sm">
                  <Badge>Week {w.week}</Badge>
                  <span className="text-slate-600">{w.focus}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <button className="btn btn-primary" onClick={() => navigate("/student/dashboard")}>Go to Dashboard</button>
            <button className="btn btn-outline" onClick={() => navigate("/student/progress")}>View Progress</button>
          </div>
        </Card>
      </div>
    );
  }

  const currentQuestions = grouped[stage] || [];
  const idx = SECTIONS.indexOf(stage);
  const next = SECTIONS[idx + 1];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold capitalize">{stage} Section</h1>
        <div className="flex gap-1">
          {SECTIONS.filter((s) => s !== "overview").map((s) => (
            <span key={s} className={`h-2 w-8 rounded-full ${SECTIONS.indexOf(s) <= idx ? "bg-brand-500" : "bg-slate-200"}`} />
          ))}
        </div>
      </div>

      {stage === "listening" && <ListeningSection questions={currentQuestions} answers={answers} setAnswer={setAnswer} />}
      {stage === "reading" && <ReadingSection questions={currentQuestions} answers={answers} setAnswer={setAnswer} />}
      {stage === "writing" && <WritingSection questions={currentQuestions} answers={answers} setAnswer={setAnswer} />}
      {stage === "speaking" && <SpeakingSection questions={currentQuestions} answers={answers} setAnswer={setAnswer} />}

      {error && <div className="rounded-lg bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>}

      <div className="flex justify-between">
        {idx > 1 && (
          <button className="btn btn-outline" onClick={() => setStage(SECTIONS[idx - 1])}>← Back</button>
        )}
        {stage === "speaking" ? (
          <button className="btn btn-primary" onClick={submit} disabled={loading}>
            {loading ? "Scoring…" : "Submit Assessment"}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => { setStage(next); setError(null); }}>
            Continue →
          </button>
        )}
      </div>
    </div>
  );
}

function ListeningSection({ questions, answers, setAnswer }: { questions: Question[]; answers: Record<number, string>; setAnswer: (id: number, v: string) => void }) {
  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <Card key={q.id} title={`Listening ${i + 1}: ${q.prompt}`}>
          <AudioButton text={q.passage || ""} className="btn btn-primary mb-3" />
          <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-500">
            <span className="font-medium">Transcript hint:</span> The audio is spoken by the browser.
            Listen carefully and answer in your own words.
          </div>
          <textarea
            className="input min-h-[80px]"
            placeholder="Type your answers (separate with commas or new lines)"
            value={answers[q.id] || ""}
            onChange={(e) => setAnswer(q.id, e.target.value)}
          />
        </Card>
      ))}
    </div>
  );
}

function ReadingSection({ questions, answers, setAnswer }: { questions: Question[]; answers: Record<number, string>; setAnswer: (id: number, v: string) => void }) {
  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <Card key={q.id} title={`Question ${i + 1}`}>
          {q.passage && (
            <div className="mb-3 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-700">
              {q.passage}
            </div>
          )}
          <div className="mb-2 text-sm font-medium text-slate-700">{q.prompt}</div>
          {q.type === "mcq" && q.options ? (
            <div className="space-y-2">
              {q.options.map((opt, oi) => (
                <label key={oi} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50">
                  <input
                    type="radio"
                    name={`q-${q.id}`}
                    checked={answers[q.id] === String(oi)}
                    onChange={() => setAnswer(q.id, String(oi))}
                  />
                  {opt}
                </label>
              ))}
            </div>
          ) : q.type === "truefalse" ? (
            <div className="flex gap-4">
              {["true", "false"].map((opt) => (
                <label key={opt} className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50">
                  <input type="radio" name={`q-${q.id}`} checked={answers[q.id] === opt} onChange={() => setAnswer(q.id, opt)} />
                  {opt === "true" ? "True" : "False"}
                </label>
              ))}
            </div>
          ) : (
            <textarea className="input min-h-[70px]" placeholder="Your answer" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
          )}
        </Card>
      ))}
    </div>
  );
}

function WritingSection({ questions, answers, setAnswer }: { questions: Question[]; answers: Record<number, string>; setAnswer: (id: number, v: string) => void }) {
  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <Card key={q.id} title={`Writing ${i + 1}`}>
          <div className="mb-2 text-sm font-medium text-slate-700">{q.prompt}</div>
          <textarea className="input min-h-[140px]" placeholder="Write your response here…" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
          <div className="mt-1 text-xs text-slate-400">{((answers[q.id] || "").match(/[A-Za-z']+/g) || []).length} words</div>
        </Card>
      ))}
    </div>
  );
}

function SpeakingSection({ questions, answers, setAnswer }: { questions: Question[]; answers: Record<number, string>; setAnswer: (id: number, v: string) => void }) {
  const { recording, transcript, supportError, start, stop } = useRecorder();
  const [active, setActive] = useState<number | null>(null);

  const handleStop = async (qid: number) => {
    const res = await stop();
    const final = res.transcript || transcript;
    setAnswer(qid, final);
    setActive(null);
  };

  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <Card key={q.id} title={`Speaking ${i + 1}`}>
          <div className="mb-3 text-sm font-medium text-slate-700">{q.prompt}</div>
          {active === q.id ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-center">
              <div className="mb-2 text-sm font-medium text-rose-600">● Recording… speak now</div>
              {transcript && <p className="mb-3 text-sm text-slate-700">"{transcript}"</p>}
              <button className="btn btn-danger" onClick={() => handleStop(q.id)}>Stop & Use Transcript</button>
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 p-4 text-center">
              {answers[q.id] ? (
                <>
                  <p className="mb-2 text-sm text-slate-600">"{answers[q.id]}"</p>
                  <div className="flex justify-center gap-2">
                    <button className="btn btn-primary" onClick={async () => { setActive(q.id); await start(); }}>Re-record</button>
                    <button className="btn btn-outline" onClick={() => setAnswer(q.id, "")}>Clear</button>
                  </div>
                </>
              ) : (
                <button className="btn btn-primary" onClick={async () => { setActive(q.id); await start(); }}>🎤 Record Answer</button>
              )}
              {supportError && <p className="mt-2 text-xs text-amber-600">{supportError} You can type instead.</p>}
              {!answers[q.id] && !supportError && (
                <textarea className="input mt-3" placeholder="…or type your answer here" value={answers[q.id] || ""} onChange={(e) => setAnswer(q.id, e.target.value)} />
              )}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
