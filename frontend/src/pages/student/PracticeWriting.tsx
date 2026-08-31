import { useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card } from "../../components/ui";
import { useToast } from "../../hooks/useToast";
import type { AnalysisResult } from "../../types";
import { AnalysisResults } from "../../components/results/AnalysisResults";

interface WritingPrompt {
  type: string;
  title: string;
  prompt: string;
}

export function PracticeWriting() {
  const [content, setContent] = useState<WritingPrompt[] | null>(null);
  const [active, setActive] = useState<WritingPrompt | null>(null);
  const [text, setText] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    api
      .post("/practice/writing", { skill: "writing", mode: "generate" })
      .then((res) => setContent(res.data.content))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <div className="text-rose-600">{error}</div>;
  if (!content) return <Spinner label="Loading writing tasks…" />;

  if (result) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <AnalysisResults result={result} />
        <button className="btn btn-outline" onClick={() => { setResult(null); setText(""); }}>Write Another</button>
      </div>
    );
  }

  if (!active) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-bold">Writing Practice</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {content.map((p) => (
            <button key={p.title} className="card p-5 text-left transition hover:border-brand-300" onClick={() => setActive(p)}>
              <Badge tone="violet">{p.type}</Badge>
              <div className="mt-2 font-medium text-slate-700">{p.title}</div>
              <div className="mt-1 line-clamp-2 text-xs text-slate-400">{p.prompt}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const analyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await api.post("/practice/writing", {
        skill: "writing",
        prompt: active.prompt,
        topic: active.title,
        text,
      });
      setResult(data);
      toast("Writing analyzed!");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <Card title={active.title}>
        <Badge tone="violet">{active.type}</Badge>
        <p className="mb-3 mt-2 text-sm text-slate-600">{active.prompt}</p>
        <textarea className="input min-h-[220px]" placeholder="Write your response…" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-1 text-xs text-slate-400">{((text.match(/[A-Za-z']+/g) || []).length)} words</div>
        {error && <div className="mt-2 text-sm text-rose-600">{error}</div>}
        <div className="mt-4 flex gap-3">
          <button className="btn btn-primary" onClick={analyze} disabled={loading || !text.trim()}>
            {loading ? "Analyzing…" : "Analyze Writing"}
          </button>
          <button className="btn btn-outline" onClick={() => setActive(null)}>Back</button>
        </div>
      </Card>
    </div>
  );
}
