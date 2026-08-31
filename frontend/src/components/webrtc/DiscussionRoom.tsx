import { useEffect, useRef, useState } from "react";
import api, { errorMessage } from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { useRecorder } from "../../audio/recorder";
import { useDiscussionSocket, WsMessage } from "../../hooks/useDiscussionSocket";
import { useWebRTC } from "../../hooks/useWebRTC";
import { formatDuration } from "../../audio/tts";
import { Badge, Card } from "../ui";

interface Participant {
  user_id: string;
  full_name: string;
  role: string;
}

interface Recap {
  title?: string;
  key_points?: string[];
  decisions?: string[];
  action_items?: string[];
  speaker_summary?: string;
  word_count?: number;
  generated_at?: string;
}

interface Props {
  room: string;
  discussionId: number;
  topic: string;
  durationSeconds: number;
  isTeacher: boolean;
  onEnded?: () => void;
  initialParticipants: Participant[];
  initialStatus: string;
}

export function DiscussionRoom({
  room,
  discussionId,
  topic,
  durationSeconds,
  isTeacher,
  onEnded,
  initialParticipants,
  initialStatus,
}: Props) {
  const { user } = useAuth();
  const { connected, messages, send } = useDiscussionSocket(room);
  const { recording: segmentRecording, transcript, supportError, start: startSegment, stop: stopSegment } = useRecorder();
  const [status, setStatus] = useState(initialStatus);
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [speaking, setSpeaking] = useState<Record<string, boolean>>({});
  const [elapsed, setElapsed] = useState(0);
  const [moderatorText, setModeratorText] = useState<string>("");
  const [transcriptLines, setTranscriptLines] = useState<Array<{ speaker: string; text: string; interruption?: string }>>([]);
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  const lastSegmentRef = useRef<{ start: number } | null>(null);

  const [recordingMeta, setRecordingMeta] = useState<{ name: string; size: number; download_url: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recap, setRecap] = useState<Recap | null>(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  const myUserId = user?.user_id || String(user?.id || "");
  const webrtc = useWebRTC(myUserId, send, connected);

  useEffect(() => {
    const iv = setInterval(() => {
      setElapsed((e) => e + 1);
      if (status === "ACTIVE" && elapsed >= durationSeconds && !isTeacher) {
        send({ type: "segment", user_id: "", text: "", start_time: 0, end_time: 0 });
      }
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight });
  }, [transcriptLines]);

  useEffect(() => {
    for (const m of messages as WsMessage[]) {
      webrtc.handleMessage(m);
      if (m.type === "state") setStatus(String(m.status));
      if (m.type === "participant_joined" || m.type === "participant_left") {
        setParticipants((prev) => {
          const exists = prev.some((p) => p.user_id === m.user_id);
          if (m.type === "participant_joined" && !exists) {
            return [...prev, { user_id: String(m.user_id), full_name: String(m.full_name || ""), role: "participant" }];
          }
          if (m.type === "participant_left") {
            return prev.filter((p) => p.user_id !== m.user_id);
          }
          return prev;
        });
      }
      if (m.type === "speaking") {
        setSpeaking((prev) => ({ ...prev, [String(m.user_id)]: Boolean(m.speaking) }));
      }
      if (m.type === "segment" && String(m.text).trim()) {
        setTranscriptLines((prev) => [...prev, { speaker: String(m.speaker), text: String(m.text), interruption: String(m.interruption || "") }]);
        setActiveSpeaker(String(m.speaker));
      }
      if (m.type === "moderator") setModeratorText(String(m.text));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  const recordSegment = async () => {
    const res = await stopSegment();
    if (!res.transcript.trim()) return;
    const start = lastSegmentRef.current?.start ?? elapsed;
    lastSegmentRef.current = { start: elapsed };
    send({
      type: "segment",
      user_id: "",
      text: res.transcript,
      start_time: start,
      end_time: elapsed,
    });
  };

  const changeState = (state: string) => {
    send({ type: "state", status: state });
    if (state === "ENDED") {
      setTimeout(() => onEnded?.(), 1500);
    }
  };

  const modPrompt = (state: string) => send({ type: "moderator", state });

  const stopAndUploadRecording = async () => {
    const res = await webrtc.stopRecording();
    if (!res) return;
    setUploading(true);
    setRoomError(null);
    try {
      const fd = new FormData();
      fd.append("file", res.blob, `discussion-${room}-${Date.now()}.webm`);
      const { data } = await api.post(`/discussions/${discussionId}/recording`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setRecordingMeta(data);
    } catch (err) {
      setRoomError(errorMessage(err, "Failed to upload recording"));
    } finally {
      setUploading(false);
    }
  };

  const generateRecap = async () => {
    setRecapLoading(true);
    setRoomError(null);
    try {
      const { data } = await api.post<Recap>(`/discussions/${discussionId}/recap`);
      setRecap(data);
    } catch (err) {
      setRoomError(errorMessage(err, "Failed to generate recap"));
    } finally {
      setRecapLoading(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setRoomError(null);
    } catch {
      setRoomError("Clipboard unavailable in this browser.");
    }
  };

  const inviteLink = `${window.location.origin}/student/discussions`;
  const timerColor = status === "ACTIVE" && elapsed >= durationSeconds ? "text-rose-600" : "text-slate-700";

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2">
        <Card title={topic}>
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
            <Badge tone={connected ? "green" : "rose"}>{connected ? "Connected" : "Reconnecting…"}</Badge>
            <Badge tone="violet">{status}</Badge>
            <span className={`font-mono text-lg font-bold ${timerColor}`}>{formatDuration(Math.min(elapsed, durationSeconds))}</span>
            <span className="text-xs text-slate-400">/ {formatDuration(durationSeconds)}</span>
          </div>

          {moderatorText && (
            <div className="mb-3 rounded-lg border border-violet-100 bg-violet-50 p-3 text-sm text-violet-800">
              <b>🤖 AI Moderator:</b> {moderatorText}
            </div>
          )}

          {/* Live video room */}
          <div className="mb-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Live Video Room</div>
              <div className="flex flex-wrap gap-2">
                <button
                  className={`btn btn-sm ${webrtc.cameraOn ? "btn-primary" : "btn-outline"}`}
                  onClick={webrtc.toggleCamera}
                >
                  {webrtc.cameraOn ? "🎥 Camera On" : "🎥 Camera Off"}
                </button>
                <button className={`btn btn-sm ${webrtc.micOn ? "btn-primary" : "btn-outline"}`} onClick={webrtc.toggleMic}>
                  {webrtc.micOn ? "🎙️ Mic On" : "🎙️ Mic Off"}
                </button>
                <button className={`btn btn-sm ${webrtc.screenOn ? "btn-primary" : "btn-outline"}`} onClick={webrtc.toggleScreen}>
                  {webrtc.screenOn ? "🖥️ Sharing" : "🖥️ Share Screen"}
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <div className="relative aspect-video overflow-hidden rounded-lg bg-slate-900">
                <video ref={webrtc.localVideoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
                <div className="absolute bottom-1 left-1 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">
                  {myUserId || "You"} {!webrtc.cameraOn && "· cam off"}
                </div>
              </div>
              {webrtc.peerTiles.map((peer) => (
                <div key={peer.key} className="relative aspect-video overflow-hidden rounded-lg bg-slate-900">
                  <video ref={peer.videoRef} autoPlay playsInline className="h-full w-full object-cover" />
                  <div className="absolute bottom-1 left-1 rounded bg-black/60 px-2 py-0.5 text-[10px] text-white">{peer.key}</div>
                </div>
              ))}
              {webrtc.peerTiles.length === 0 && (
                <div className="flex aspect-video items-center justify-center rounded-lg bg-slate-50 text-xs text-slate-400">
                  Other participants appear here when their camera is on
                </div>
              )}
            </div>
            {webrtc.recordingError && <p className="mt-2 text-xs text-amber-600">{webrtc.recordingError}</p>}
          </div>

          <div className="mb-4">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Session Recording</div>
            <div className="flex flex-wrap items-center gap-2">
              {!webrtc.recording ? (
                <button className="btn btn-primary" onClick={webrtc.startRecording}>
                  ● Record Session (video)
                </button>
              ) : (
                <button className="btn btn-danger" onClick={stopAndUploadRecording} disabled={uploading}>
                  {uploading ? "Uploading…" : "⏹ Stop & Save Recording"}
                </button>
              )}
              {recordingMeta && (
                <a className="btn btn-outline" href={recordingMeta.download_url} download>
                  ⬇ Download Recording ({recordingMeta.name})
                </a>
              )}
              <button
                className="btn btn-outline"
                onClick={() => copyText(`${recordingMeta?.download_url || ""}`.replace(/^\//, window.location.origin + "/"))}
                disabled={!recordingMeta}
              >
                🔗 Copy Recording Link
              </button>
            </div>
          </div>

          {status === "CREATED" || status === "WAITING" ? (
            <div className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500">
              Waiting for the teacher to start the discussion…
            </div>
          ) : (
            <>
              <div className="mb-4 max-h-72 overflow-y-auto rounded-lg bg-slate-50 p-4" ref={transcriptRef}>
                {transcriptLines.length === 0 && (
                  <p className="text-center text-sm text-slate-400">No speech yet. Start talking to appear here.</p>
                )}
                {transcriptLines.map((line, i) => (
                  <div key={i} className="mb-2">
                    <div className="text-xs font-semibold text-brand-600">{line.speaker}</div>
                    <div className="text-sm text-slate-700">{line.text}</div>
                    {line.interruption === "true" && <Badge tone="amber">interrupted</Badge>}
                  </div>
                ))}
              </div>

              {status === "ACTIVE" && (
                <div className="space-y-3">
                  {!segmentRecording ? (
                    <button className="btn btn-primary w-full" onClick={async () => { await startSegment(); }}>🎤 Start Speaking</button>
                  ) : (
                    <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-center">
                      <div className="mb-2 font-medium text-rose-600">● Recording…</div>
                      {transcript && <p className="mb-3 text-sm text-slate-700">"{transcript}"</p>}
                      <button className="btn btn-danger" onClick={recordSegment}>Stop Segment</button>
                    </div>
                  )}
                  {supportError && <p className="text-xs text-amber-600">{supportError}</p>}
                </div>
              )}
            </>
          )}
        </Card>

        {isTeacher && (
          <Card title="Moderator Controls">
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-primary" onClick={() => { modPrompt("start"); changeState("ACTIVE"); }}>▶ Start</button>
              <button className="btn btn-outline" onClick={() => changeState("PAUSED")}>⏸ Pause</button>
              <button className="btn btn-primary" onClick={() => changeState("ACTIVE")}>Resume</button>
              <button className="btn btn-danger" onClick={() => changeState("ENDED")}>⏹ End Discussion</button>
              <button className="btn btn-outline" onClick={() => modPrompt("encourage")}>Encourage</button>
              <button className="btn btn-outline" onClick={() => modPrompt("timeout")}>Time Check</button>
            </div>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card title={`Participants (${participants.length})`}>
          <div className="space-y-2">
            {participants.map((p) => (
              <div key={p.user_id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <div>
                  <div className="text-sm font-medium text-slate-700">{p.user_id}</div>
                  <div className="text-xs text-slate-400">{p.full_name}</div>
                </div>
                {speaking[p.user_id] ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" /> Speaking
                  </span>
                ) : p.role === "moderator" ? (
                  <Badge tone="violet">Moderator</Badge>
                ) : (
                  <Badge>Online</Badge>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-400">
            Session code: <span className="font-mono font-semibold text-brand-600">{room}</span>
          </div>
        </Card>

        <Card title="Share this session">
          <div className="space-y-2">
            <button
              className="btn btn-outline w-full"
              onClick={() => copyText(`${inviteLink}\nJoin code: ${room}`)}
            >
              🔗 Copy Invite (link + code)
            </button>
            <button className="btn btn-outline w-full" onClick={() => copyText(room)}>
              📋 Copy Session Code
            </button>
            <p className="text-xs text-slate-400">Students open Group Discussions and join with the code.</p>
          </div>
        </Card>

        <Card title="Recap of notes">
          {!recap ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-400">
                Generate a written recap of the discussion: key points, decisions, action items and a speaker summary.
              </p>
              <button className="btn btn-primary w-full" onClick={generateRecap} disabled={recapLoading}>
                {recapLoading ? "Generating…" : "✨ Generate Recap"}
              </button>
            </div>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="font-semibold text-slate-800">{recap.title || "Recap"}</div>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() =>
                    copyText(
                      [
                        recap.title,
                        "",
                        "KEY POINTS",
                        ...(recap.key_points || []).map((p) => `• ${p}`),
                        "",
                        "DECISIONS",
                        ...(recap.decisions || []).map((p) => `• ${p}`),
                        "",
                        "ACTION ITEMS",
                        ...(recap.action_items || []).map((p) => `• ${p}`),
                        recap.speaker_summary ? `\nSPEAKER SUMMARY\n${recap.speaker_summary}` : "",
                      ].join("\n"),
                    )
                  }
                >
                  📋 Copy Notes
                </button>
              </div>
              {recap.key_points && recap.key_points.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase text-slate-400">Key Points</div>
                  <ul className="list-inside list-disc space-y-1 text-slate-700">
                    {recap.key_points.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
              {recap.decisions && recap.decisions.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase text-slate-400">Decisions</div>
                  <ul className="list-inside list-disc space-y-1 text-slate-700">
                    {recap.decisions.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
              {recap.action_items && recap.action_items.length > 0 && (
                <div>
                  <div className="mb-1 text-xs font-semibold uppercase text-slate-400">Action Items</div>
                  <ul className="list-inside list-disc space-y-1 text-slate-700">
                    {recap.action_items.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
              )}
              {recap.speaker_summary && <p className="text-slate-600">{recap.speaker_summary}</p>}
              {typeof recap.word_count === "number" && (
                <div className="text-xs text-slate-400">{recap.word_count} words spoken · generated {recap.generated_at?.slice(0, 16).replace("T", " ")}</div>
              )}
            </div>
          )}
        </Card>

        {roomError && <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{roomError}</div>}

        {status === "COMPLETED" && (
          <Card title="Discussion Complete">
            <p className="mb-3 text-sm text-slate-600">The discussion has ended. The AI is analyzing participant performance.</p>
            <button className="btn btn-primary w-full" onClick={onEnded}>View Report</button>
          </Card>
        )}
      </div>
    </div>
  );
}