import { useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card } from "../../components/ui";

interface CoachMsg {
  id: number;
  role: "user" | "coach";
  content: string;
  created_at?: string | null;
}

interface CoachSolution {
  summary?: string;
  steps?: string[];
  practice?: string;
  recommendation?: string;
}

interface CoachContext {
  level: string;
  overall: number;
  scores: Record<string, number>;
  weaknesses: string[];
  goals: string[];
  recent_mistakes: Array<{ category: string; text: string; explanation: string }>;
}

interface CoachReply {
  reply: string;
  context: CoachContext;
  solution?: CoachSolution | null;
}

export function CoachPage() {
  const [messages, setMessages] = useState<CoachMsg[]>([]);
  const [solutions, setSolutions] = useState<Record<number, CoachSolution | null>>({});
  const [input, setInput] = useState("");
  const [context, setContext] = useState<CoachContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .get("/students/me/coach")
      .then((res) => setMessages(res.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    setError(null);
    const optimistic: CoachMsg = { id: Date.now(), role: "user", content: text };
    setMessages((m) => [...m, optimistic]);
    try {
      const { data } = await api.post<CoachReply>("/students/me/coach", { message: text });
      const coachId = Date.now() + 1;
      setMessages((m) => [
        ...m,
        { id: coachId, role: "coach", content: data.reply, created_at: new Date().toISOString() },
      ]);
      setSolutions((s) => ({ ...s, [coachId]: data.solution ?? null }));
      setContext(data.context);
    } catch (err) {
      setError(errorMessage(err, "Coach unavailable right now"));
    } finally {
      setSending(false);
    }
  };

  const quickPrompts = [
    "My problem is I hesitate a lot when I speak. How do I fix it?",
    "I get very nervous before interviews. Give me a solution",
    "Help me improve my grammar mistakes",
    "I forget the right words during conversation",
    "Make me a weekly study plan",
    "How can I speak more fluently?",
  ];

  if (loading) return <Spinner label="Loading your coach…" />;

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">AI Coach</h1>
        <p className="text-sm text-slate-500">
          Tell me your problem and I'll give you a personalised solution — based on your goals, level, and what you've told me.
        </p>
      </div>

      {context && (
        <Card title="Coach context (your latest profile)">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge tone="violet">{context.level}</Badge>
            <Badge tone="blue">Overall {context.overall}</Badge>
            {context.weaknesses.slice(0, 3).map((w) => (
              <Badge key={w} tone="rose">{w}</Badge>
            ))}
          </div>
        </Card>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-4" style={{ maxHeight: "55vh" }}>
        {messages.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">
            Say hello and ask your coach anything about improving your communication.
          </p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="space-y-2">
            <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                  m.role === "user" ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-slate-100 text-slate-700"
                }`}
              >
                {m.content}
              </div>
            </div>
            {m.role === "coach" && solutions[m.id] && (() => {
              const sol = solutions[m.id]!;
              return (
                <div className="ml-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm">
                  {sol.summary && <p className="mb-2 font-medium text-emerald-900">{sol.summary}</p>}
                  {sol.steps && sol.steps.length > 0 && (
                    <div className="mb-2">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-emerald-600">Your solution — steps</div>
                      <ol className="list-inside list-decimal space-y-1 text-emerald-800">
                        {sol.steps.map((s, i) => <li key={i}>{s}</li>)}
                      </ol>
                    </div>
                  )}
                  {sol.practice && (
                    <p className="mb-1 text-emerald-800">
                      <span className="font-semibold">Practice: </span>
                      {sol.practice}
                    </p>
                  )}
                  {sol.recommendation && (
                    <p className="text-emerald-700">
                      <span className="font-semibold">Recommendation: </span>
                      {sol.recommendation}
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-2 text-sm text-slate-400">Thinking…</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((p) => (
            <button
              key={p}
              onClick={() => setInput(p)}
              className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs text-brand-700 hover:bg-brand-100"
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {error && <div className="text-sm text-rose-600">{error}</div>}

      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Ask your coach…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button className="btn btn-primary" onClick={send} disabled={sending || !input.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}