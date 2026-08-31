import { useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card, Modal } from "../../components/ui";
import { useToast } from "../../hooks/useToast";

interface AssignmentRow {
  id: number;
  title: string;
  skill: string;
  topic: string;
  difficulty: string;
  description: string;
  status: string;
  is_ai_generated: boolean;
  deadline: string | null;
  created_at: string | null;
  submission_count: number;
}

interface Draft {
  title: string;
  description: string;
  questions: Array<{ prompt: string; type: string }>;
  assessment_criteria: string[];
}

export function TeacherAssignments() {
  const [list, setList] = useState<AssignmentRow[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [genTopic, setGenTopic] = useState("");
  const [genObjective, setGenObjective] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [form, setForm] = useState({
    title: "",
    skill: "writing",
    topic: "",
    difficulty: "intermediate",
    description: "",
    questions: "" as string,
    assessment_criteria: "" as string,
  });

  const load = () =>
    api
      .get("/teachers/assignments")
      .then((res) => setList(res.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const parseList = (s: string) =>
    s
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

  const create = async (payload: Record<string, unknown>, generated = false) => {
    try {
      const { data } = await api.post("/teachers/assignments", payload);
      if (generated) {
        setDraft(null);
        setShowGenerate(false);
      } else {
        setShowCreate(false);
      }
      toast(`Assignment "${data.title}" created`);
      await load();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const generate = async () => {
    setError(null);
    try {
      const { data } = await api.post("/teachers/assignments/generate", {
        topic: genTopic,
        objective: genObjective,
      });
      setDraft(data.draft || data);
      setForm({
        title: data.draft?.title || data.title || "",
        skill: data.draft?.skill || "writing",
        topic: genTopic,
        difficulty: "intermediate",
        description: data.draft?.description || data.description || "",
        questions: (data.draft?.questions || data.questions || []).map((q: { prompt?: string }) => q.prompt || "").join("\n"),
        assessment_criteria: (data.draft?.assessment_criteria || data.assessment_criteria || []).join("\n"),
      });
      setShowGenerate(false);
      setShowCreate(true);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (loading) return <Spinner />;
  if (error) return <div className="text-rose-600">{error}</div>;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Assignments</h1>
        <div className="flex gap-2">
          <button className="btn btn-outline" onClick={() => setShowGenerate(true)}>✨ Generate with AI</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create</button>
        </div>
      </div>

      <Modal open={showGenerate} title="Generate Assignment with AI" onClose={() => setShowGenerate(false)}>
        <div className="space-y-3">
          <div>
            <label className="label">Topic</label>
            <input className="input" value={genTopic} onChange={(e) => setGenTopic(e.target.value)} placeholder="e.g. Climate change" />
          </div>
          <div>
            <label className="label">Objective</label>
            <input className="input" value={genObjective} onChange={(e) => setGenObjective(e.target.value)} placeholder="e.g. Persuasive essay with evidence" />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button className="btn btn-primary w-full" onClick={generate} disabled={!genTopic}>Generate</button>
        </div>
      </Modal>

      <Modal open={showCreate} title="Create Assignment" onClose={() => setShowCreate(false)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Title</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="label">Skill</label>
              <select className="input" value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })}>
                <option>writing</option>
                <option>speaking</option>
                <option>reading</option>
                <option>listening</option>
                <option>grammar</option>
                <option>vocabulary</option>
              </select>
            </div>
            <div>
              <label className="label">Topic</label>
              <input className="input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} />
            </div>
            <div>
              <label className="label">Difficulty</label>
              <select className="input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                <option>beginner</option>
                <option>intermediate</option>
                <option>advanced</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Questions (one per line)</label>
            <textarea className="input" rows={4} value={form.questions} onChange={(e) => setForm({ ...form, questions: e.target.value })} placeholder={"Write a 200-word essay on…\nWhat is your opinion on…"} />
          </div>
          <div>
            <label className="label">Assessment Criteria (one per line)</label>
            <textarea className="input" rows={2} value={form.assessment_criteria} onChange={(e) => setForm({ ...form, assessment_criteria: e.target.value })} placeholder={"Clarity\nGrammar\nOrganization"} />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button
            className="btn btn-primary w-full"
            disabled={!form.title || !form.topic || !form.questions.trim()}
            onClick={() =>
              create({
                title: form.title,
                skill: form.skill,
                topic: form.topic,
                difficulty: form.difficulty,
                description: form.description,
                questions: parseList(form.questions).map((p, i) => ({ prompt: p, type: "essay", order: i + 1 })),
                assessment_criteria: parseList(form.assessment_criteria),
              })
            }
          >
            Create & Publish
          </button>
        </div>
      </Modal>

      <div className="space-y-3">
        {list.length === 0 && <p className="text-sm text-slate-400">No assignments yet.</p>}
        {list.map((a) => (
          <Card key={a.id}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  {a.title}
                  {a.is_ai_generated && <Badge tone="violet">AI</Badge>}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                  <Badge tone="blue">{a.skill}</Badge>
                  <Badge tone="amber">{a.difficulty}</Badge>
                  <span>Topic: {a.topic}</span>
                  <span>{a.submission_count} submissions</span>
                </div>
              </div>
              <Badge>{a.status}</Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}