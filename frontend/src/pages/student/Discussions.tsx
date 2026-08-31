import { useEffect, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { Spinner } from "../../components/ui/Spinner";
import { Badge, Card, Modal } from "../../components/ui";
import { DiscussionRoom } from "../../components/webrtc/DiscussionRoom";
import type { Discussion, DiscussionParticipant } from "../../types";

interface DiscussionDetail extends Discussion {
  participants: DiscussionParticipant[];
  is_joined: boolean;
  moderator_message: string;
}

export function StudentDiscussions() {
  const [list, setList] = useState<Discussion[]>([]);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<DiscussionDetail | null>(null);
  const [showJoin, setShowJoin] = useState(false);

  const load = () =>
    api
      .get("/discussions")
      .then((res) => setList(res.data))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const join = async () => {
    setError(null);
    try {
      const { data } = await api.post("/discussions/join", { session_code: code, consent_recording: "true" });
      const { data: detail } = await api.get<DiscussionDetail>(`/discussions/${data.id}`);
      setActive(detail);
      setShowJoin(false);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  const open = async (id: number) => {
    const { data } = await api.get<DiscussionDetail>(`/discussions/${id}`);
    setActive(data);
  };

  if (error) return <div className="text-rose-600">{error}</div>;

  if (active) {
    return (
      <DiscussionRoom
        room={active.session_code}
        discussionId={active.id}
        topic={active.topic}
        durationSeconds={active.duration_seconds}
        isTeacher={false}
        onEnded={() => setActive(null)}
        initialParticipants={active.participants || []}
        initialStatus={active.status}
      />
    );
  }

  if (loading) return <Spinner label="Loading discussions…" />;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Group Discussions</h1>
        <button className="btn btn-primary" onClick={() => setShowJoin(true)}>Join with Code</button>
      </div>

      <Modal open={showJoin} title="Join a Group Discussion" onClose={() => setShowJoin(false)}>
        <label className="label">Discussion ID / Session Code</label>
        <input className="input font-mono" placeholder="e.g. GD-2026-AB45" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        <p className="mt-2 text-xs text-slate-400">
          Recording consent is enabled by default. Your spoken segments are tagged with your User ID for analysis.
        </p>
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
        <button className="btn btn-primary mt-4 w-full" onClick={join}>Join</button>
      </Modal>

      {list.length === 0 && <p className="text-sm text-slate-400">No discussions available yet. Ask your teacher for a session code.</p>}

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
              <button className="btn btn-outline" onClick={() => open(d.id)}>
                {d.status === "COMPLETED" ? "View Report" : "Enter Room"}
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}