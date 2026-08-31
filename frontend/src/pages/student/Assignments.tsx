import { useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card } from "../../components/ui";
import { useToast } from "../../hooks/useToast";
import type { Assignment } from "../../types";

export function StudentAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [active, setActive] = useState<Assignment | null>(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    api
      .get("/students/assignments")
      .then((res) => setAssignments(res.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  if (error) return <div className="text-rose-600">{error}</div>;
  if (loading) return <Spinner />;

  if (active) {
    const submit = async () => {
      try {
        await api.post(`/students/assignments/${active.id}/submit`, { answer: { text } });
        toast("Assignment submitted & auto-graded!");
        setActive(null);
      } catch (err) {
        setError(errorMessage(err));
      }
    };

    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{active.title}</h1>
          <button className="btn btn-outline" onClick={() => setActive(null)}>← Back</button>
        </div>
        <Card title={active.title}>
          <Badge tone="blue">{active.skill}</Badge>
          <Badge tone="violet">{active.difficulty}</Badge>
          <p className="mb-3 mt-2 text-sm text-slate-600">{active.description}</p>
          <div className="mb-4 space-y-2">
            {active.questions.map((q, i) => (
              <div key={i} className="rounded-lg bg-slate-50 p-3 text-sm">
                <span className="font-medium text-slate-700">Q{i + 1}: </span>
                {String((q as { prompt?: string }).prompt || "")}
              </div>
            ))}
          </div>
          {active.submitted ? (
            <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              Submitted — Score: {active.score ?? "pending"}
            </div>
          ) : (
            <>
              <textarea className="input min-h-[160px]" placeholder="Write your answer here…" value={text} onChange={(e) => setText(e.target.value)} />
              <button className="btn btn-primary mt-3" onClick={submit} disabled={!text.trim()}>Submit</button>
            </>
          )}
          {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Assignments</h1>
      {assignments.length === 0 && <p className="text-sm text-slate-400">No assignments yet.</p>}
      <div className="space-y-3">
        {assignments.map((a) => (
          <Card key={a.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-800">{a.title}</div>
                <div className="mt-1 flex gap-2 text-xs text-slate-400">
                  <Badge tone="blue">{a.skill}</Badge>
                  <Badge tone="violet">{a.difficulty}</Badge>
                  <span>Topic: {a.topic}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {a.submitted ? (
                  <Badge tone="green">{a.score ?? "Submitted"}</Badge>
                ) : (
                  <Badge tone="amber">Pending</Badge>
                )}
                <button className="btn btn-outline" onClick={() => setActive(a)}>
                  {a.submitted ? "View" : "Open"}
                </button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}