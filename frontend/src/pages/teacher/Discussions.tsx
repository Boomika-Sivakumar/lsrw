import { useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card, Modal } from "../../components/ui";
import { DiscussionRoom } from "../../components/webrtc/DiscussionRoom";
import { DiscussionReport } from "../../components/results/DiscussionReport";
import { useToast } from "../../hooks/useToast";
import type { Discussion, DiscussionParticipant } from "../../types";

interface DiscussionDetail extends Discussion {
  participants: DiscussionParticipant[];
}

export function TeacherDiscussions() {
  const [list, setList] = useState<Discussion[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [active, setActive] = useState<DiscussionDetail | null>(null);
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const [form, setForm] = useState({
    topic: "",
    description: "",
    difficulty: "intermediate",
    duration_seconds: 600,
    participant_limit: 6,
  });

  const load = () =>
    api
      .get("/discussions")
      .then((res) => setList(res.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    setError(null);
    try {
      const { data } = await api.post("/discussions", form);
      setShowCreate(false);
      toast(`Discussion created! Code: ${data.session_code}`);
      await load();
      const { data: detail } = await api.get<DiscussionDetail>(`/discussions/${data.id}`);
      setActive(detail);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const openRoom = async (d: Discussion) => {
    const { data } = await api.get<DiscussionDetail>(`/discussions/${d.id}`);
    setActive(data);
    setReport(null);
  };

  const viewReport = async (d: Discussion) => {
    const { data } = await api.get(`/discussions/${d.id}/report`);
    setReport(data);
    setActive(null);
  };

  if (loading) return <Spinner label="Loading discussions…" />;
  if (error) return <div className="text-rose-600">{error}</div>;

  if (report) {
    return (
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Discussion Report</h1>
          <button className="btn btn-outline" onClick={() => setReport(null)}>← Back</button>
        </div>
        <DiscussionReport data={report as never} />
      </div>
    );
  }

  if (active) {
    return (
      <DiscussionRoom
        room={active.session_code}
        discussionId={active.id}
        topic={active.topic}
        durationSeconds={active.duration_seconds}
        isTeacher
        onEnded={() => viewReport(active)}
        initialParticipants={active.participants || []}
        initialStatus={active.status}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Group Discussions</h1>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Discussion</button>
      </div>

      <Modal open={showCreate} title="Create Group Discussion" onClose={() => setShowCreate(false)}>
        <div className="space-y-3">
          <div>
            <label className="label">Topic</label>
            <input className="input" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Is AI beneficial for education?" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label">Difficulty</label>
              <select className="input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
                <option>beginner</option>
                <option>intermediate</option>
                <option>advanced</option>
              </select>
            </div>
            <div>
              <label className="label">Duration (sec)</label>
              <input className="input" type="number" value={form.duration_seconds} onChange={(e) => setForm({ ...form, duration_seconds: Number(e.target.value) })} />
            </div>
            <div>
              <label className="label">Participants</label>
              <input className="input" type="number" value={form.participant_limit} onChange={(e) => setForm({ ...form, participant_limit: Number(e.target.value) })} />
            </div>
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button className="btn btn-primary w-full" onClick={create}>Create & Generate Code</button>
        </div>
      </Modal>

      <div className="space-y-3">
        {list.map((d) => (
          <Card key={d.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium text-slate-800">{d.topic}</div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-400">
                  <span className="font-mono text-brand-600">{d.session_code}</span>
                  <Badge tone="violet">{d.difficulty}</Badge>
                  <Badge>{d.status}</Badge>
                  <span>{d.participant_count}/{d.participant_limit} participants</span>
                </div>
              </div>
              <div className="flex gap-2">
                {(d.status === "CREATED" || d.status === "WAITING" || d.status === "ACTIVE" || d.status === "PAUSED") && (
                  <button className="btn btn-outline" onClick={() => openRoom(d)}>Monitor</button>
                )}
                {d.status === "COMPLETED" && (
                  <button className="btn btn-primary" onClick={() => viewReport(d)}>View Report</button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {list.length === 0 && <p className="text-sm text-slate-400">No discussions yet.</p>}
      </div>
    </div>
  );
}