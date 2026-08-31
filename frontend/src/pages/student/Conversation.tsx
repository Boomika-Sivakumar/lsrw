import { useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Badge, Card } from "../../components/ui";
import { useRecorder } from "../../audio/recorder";
import { useToast } from "../../hooks/useToast";
import type { AnalysisResult } from "../../types";
import { AnalysisResults } from "../../components/results/AnalysisResults";

const SCENARIOS = [
  { id: "self-introduction", label: "Self Introduction" },
  { id: "workplace", label: "Workplace Conversation" },
  { id: "customer-interaction", label: "Customer Interaction" },
  { id: "travel", label: "Travel" },
  { id: "meetings", label: "Business Meeting" },
  { id: "daily-communication", label: "Daily Communication" },
  { id: "hr-discussion", label: "HR Discussion" },
  { id: "professional-communication", label: "Professional Communication" },
];

interface Message {
  role: "ai" | "user";
  text: string;
}

export function ConversationPage() {
  const [scenario, setScenario] = useState("self-introduction");
  const [convId, setConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [typing, setTyping] = useState("");
  const [report, setReport] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { recording, transcript, supportError, start, stop } = useRecorder();
  const { toast } = useToast();

  const startConv = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/practice/conversation/start", { scenario });
      setConvId(data.conversation_id);
      setMessages([{ role: "ai", text: data.message }]);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const sendTurn = async (text: string) => {
    if (!convId || !text.trim()) return;
    setLoading(true);
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setTyping("");
    try {
      const { data } = await api.post(`/practice/conversation/${convId}/turn`, { scenario, transcript: text });
      setMessages((prev) => [...prev, { role: "ai", text: data.message }]);
      if (data.next_step === "end") {
        setReport(data.report);
        toast("Conversation complete!");
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const stopAndSend = async () => {
    const res = await stop();
    if (res.transcript.trim()) await sendTurn(res.transcript);
  };

  if (report) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <AnalysisResults result={report} />
        <button className="btn btn-primary" onClick={() => { setReport(null); setMessages([]); setConvId(null); }}>New Conversation</button>
      </div>
    );
  }

  if (!convId) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold">AI Conversation Practice</h1>
        <Card title="Choose a scenario">
          <div className="grid gap-2 sm:grid-cols-2">
            {SCENARIOS.map((s) => (
              <button
                key={s.id}
                onClick={() => setScenario(s.id)}
                className={`rounded-lg border p-3 text-left text-sm ${scenario === s.id ? "border-brand-500 bg-brand-50 text-brand-700" : "border-slate-200 hover:bg-slate-50"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {error && <div className="mt-3 text-sm text-rose-600">{error}</div>}
          <button className="btn btn-primary mt-4 w-full" onClick={startConv} disabled={loading}>
            {loading ? "Starting…" : "Start Conversation"}
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card title={`AI Conversation — ${SCENARIOS.find((s) => s.id === scenario)?.label}`}>
        <div className="mb-4 max-h-80 space-y-3 overflow-y-auto rounded-lg bg-slate-50 p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "ai" ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${m.role === "ai" ? "bg-white text-slate-700" : "bg-brand-600 text-white"}`}>
                <div className={`mb-1 text-xs ${m.role === "ai" ? "text-slate-400" : "text-white/70"}`}>
                  {m.role === "ai" ? "AI Assistant" : "You"}
                </div>
                {m.text}
              </div>
            </div>
          ))}
          {loading && <div className="text-xs text-slate-400">AI is typing…</div>}
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="Type your reply…"
              value={typing}
              onChange={(e) => setTyping(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendTurn(typing)}
              disabled={loading}
            />
            <button className="btn btn-primary" onClick={() => sendTurn(typing)} disabled={loading || !typing.trim()}>Send</button>
          </div>
          <div className="flex items-center justify-center gap-3">
            <button className="btn btn-outline" onClick={async () => { setError(null); await start(); }} disabled={recording || loading}>🎤 Speak</button>
            {recording && (
              <>
                <Badge tone="rose">Recording…</Badge>
                <button className="btn btn-danger" onClick={stopAndSend} disabled={loading}>Stop & Send</button>
              </>
            )}
          </div>
          {supportError && <p className="text-center text-xs text-amber-600">{supportError}</p>}
          {error && <p className="text-center text-sm text-rose-600">{error}</p>}
        </div>
      </Card>
    </div>
  );
}