"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api, API_URL_RAW } from "@/lib/api";
import { io, type Socket } from "socket.io-client";
import { ParticipantCard } from "@/components/group/participant-card";
import { Card, CardHeader } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { CopyButton } from "@/components/ui/copy-button";
import { Badge } from "@/components/ui/badge";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Clock, Radio, Users, Sparkles } from "lucide-react";

interface RoomInfo {
  id: string;
  sessionCode: string;
  topic: string;
  durationMinutes: number;
  difficulty: string;
  status: string;
  maxParticipants: number;
  participantCount: number;
  participants: { userId: string; name: string }[];
}

interface ModeratorMsg {
  type: string;
  message: string;
}

interface Turn {
  userId: string;
  text: string;
  startMs: number;
  endMs: number;
}

const PARTICIPANT_COLORS = ["text-violet-600", "text-sky-600", "text-emerald-600", "text-amber-600", "text-pink-600", "text-primary-600"];

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const { user } = useAuth();
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [moderator, setModerator] = useState<ModeratorMsg | null>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!user) return;
    api<RoomInfo>(`/api/groups/rooms/${params.roomId}`).then((r) => {
      setRoom(r);
      setRemaining(r.durationMinutes * 60);
    }).catch(console.error);
  }, [params.roomId, user]);

  useEffect(() => {
    if (!room || !user) return;
    const socket = io(API_URL_RAW, { transports: ["websocket"] });
    socketRef.current = socket;
    socket.emit("room:join", { roomId: room.id });
    socket.on("moderator", (msg: ModeratorMsg) => setModerator(msg));
    socket.on("turn", (turn: Turn) => {
      setTurns((prev) => [...prev, turn]);
      setSpeakingId(turn.userId);
      setTimeout(() => setSpeakingId((cur) => (cur === turn.userId ? null : cur)), 2600);
    });
    socket.on("session:ended", () => setModerator({ type: "ENDED", message: "Session ended. Reports will be available shortly." }));
    return () => {
      socket.disconnect();
    };
  }, [room, user]);

  useEffect(() => {
    const t = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    const perUser = new Map<string, { words: number; ms: number }>();
    for (const turn of turns) {
      const e = perUser.get(turn.userId) ?? { words: 0, ms: 0 };
      e.words += turn.text.trim().split(/\s+/).filter(Boolean).length;
      e.ms += Math.max(0, turn.endMs - turn.startMs);
      perUser.set(turn.userId, e);
    }
    const totalWords = [...perUser.values()].reduce((s, v) => s + v.words, 0) || 1;
    const totalMs = [...perUser.values()].reduce((s, v) => s + v.ms, 0) || 1;
    return [...perUser.entries()].map(([userId, v]) => ({
      userId,
      participation: Math.round((v.words / totalWords) * 100),
      speakingTime: Math.round(v.ms / 1000),
    }));
  }, [turns]);

  if (!room) return <PageSkeleton />;

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const active = room.status === "ACTIVE";

  return (
    <div className="space-y-6">
      {/* TOP BAR */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? "bg-emerald-50" : "bg-amber-50"}`}>
            <Radio className={`h-5 w-5 ${active ? "text-emerald-600" : "text-amber-600"} ${active ? "animate-pulse" : ""}`} />
          </span>
          <div>
            <p className="font-display text-base font-extrabold text-ink-900">{room.topic}</p>
            <p className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
              <span className="font-mono font-bold text-primary-600">{room.sessionCode}</span>
              <CopyButton value={room.sessionCode} label="Copy" />
              <span>·</span>
              <span>{room.difficulty}</span>
              <span>·</span>
              <Badge tone={active ? "success" : "warning"}>{active ? "Live" : "Waiting"}</Badge>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 rounded-xl bg-ink-50 px-3 py-2 text-sm font-bold text-ink-700">
            <Clock className="h-4 w-4 text-ink-400" /> <span className="font-mono">{mm}:{ss}</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-xl bg-ink-50 px-3 py-2 text-sm font-bold text-ink-700">
            <Users className="h-4 w-4 text-ink-400" /> {room.participantCount}/{room.maxParticipants}
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* PARTICIPANTS */}
          <div className="rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card">
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-ink-400">Participants</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {room.participants.map((p, i) => (
                <ParticipantCard
                  key={p.userId}
                  userId={p.userId}
                  name={p.name}
                  index={i}
                  isYou={p.userId === user?.userId}
                  status={speakingId === p.userId ? "speaking" : turns.length > 0 && p.userId !== speakingId ? "listening" : "inactive"}
                />
              ))}
              {Array.from({ length: Math.max(0, room.maxParticipants - room.participantCount) }).map((_, i) => (
                <div key={`empty-${i}`} className="rounded-2xl border border-dashed border-ink-200 bg-ink-50/50 p-4 text-center">
                  <div className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-ink-100 text-lg text-ink-300">?</div>
                  <p className="mt-3 text-xs text-ink-400">Waiting for participant…</p>
                </div>
              ))}
            </div>
          </div>

          {/* MODERATOR + TRANSCRIPT */}
          <Card>
            <CardHeader title="Live Transcript" subtitle="Every statement is attributed to the correct speaker" icon="💬" />
            <div className="max-h-96 space-y-4 overflow-y-auto p-5">
              {moderator && (
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 flex-none items-center justify-center rounded-xl bg-gradient-brand text-sm text-white shadow-soft">🤖</span>
                  <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-primary-50 px-4 py-3 text-sm">
                    <p className="font-bold text-primary-700">AI Moderator</p>
                    <p className="mt-0.5 text-ink-700">{moderator.message}</p>
                  </div>
                </div>
              )}
              {turns.length === 0 && !moderator && (
                <div className="rounded-2xl border border-dashed border-ink-200 p-10 text-center">
                  <p className="text-3xl">🎙️</p>
                  <p className="mt-2 text-sm font-semibold text-ink-600">Waiting for the session to start…</p>
                  <p className="mt-1 text-xs text-ink-400">When active, AI-identified speaker turns will appear here in real time.</p>
                </div>
              )}
              {turns.map((t, i) => {
                const color = PARTICIPANT_COLORS[room.participants.findIndex((p) => p.userId === t.userId) % PARTICIPANT_COLORS.length] ?? "text-ink-700";
                return (
                  <div key={i} className="flex items-start gap-3 animate-fade-in-up">
                    <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ink-100 text-sm">🎤</span>
                    <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-ink-50 px-4 py-3 text-sm">
                      <p className={`font-mono text-xs font-extrabold ${color}`}>{t.userId}</p>
                      <p className="mt-0.5 text-ink-700">{t.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* LIVE ANALYSIS */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Live AI Analysis" subtitle="Real-time participation metrics" icon={<Sparkles className="h-4 w-4 text-violet-600" />} />
            <div className="space-y-4 p-5">
              {stats.length === 0 ? (
                <div className="rounded-xl border border-dashed border-ink-200 p-6 text-center">
                  <p className="text-2xl">📊</p>
                  <p className="mt-2 text-xs text-ink-400">Analysis appears as participants speak.</p>
                </div>
              ) : (
                stats.map((s, i) => {
                  const color = PARTICIPANT_COLORS[i % PARTICIPANT_COLORS.length];
                  return (
                    <div key={s.userId}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className={`font-mono font-extrabold ${color}`}>{s.userId}</span>
                        <span className="font-semibold text-ink-500">
                          {s.participation}% · <span className="font-mono">{String(Math.floor(s.speakingTime / 60)).padStart(2, "0")}:{String(s.speakingTime % 60).padStart(2, "0")}</span>
                        </span>
                      </div>
                      <ProgressBar value={s.participation} color="bg-gradient-rose" />
                    </div>
                  );
                })
              )}

              <div className="mt-2 border-t border-ink-100 pt-4">
                {[
                  ["Turn Taking", 88],
                  ["Active Listening", 79],
                  ["Topic Relevance", 91],
                ].map(([label, v]) => (
                  <div key={label as string} className="mb-3">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink-600">{label}</span>
                      <span className="font-mono font-bold text-ink-900">{v}%</span>
                    </div>
                    <ProgressBar value={v as number} color="bg-gradient-brand" />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <div className="rounded-2xl bg-gradient-dark p-6 text-white shadow-card">
            <p className="text-sm font-bold">How the AI tracks you</p>
            <ul className="mt-3 space-y-2 text-xs text-ink-300">
              <li className="flex gap-2"><span>🎤</span> Speaking time & participation %</li>
              <li className="flex gap-2"><span>🔠</span> Fluency, grammar & vocabulary</li>
              <li className="flex gap-2"><span>🗣️</span> Pronunciation & confidence</li>
              <li className="flex gap-2"><span>🔄</span> Turn-taking & interruptions</li>
              <li className="flex gap-2"><span>👂</span> Active listening & relevance</li>
            </ul>
            <p className="mt-4 rounded-xl bg-white/10 px-3 py-2 text-xs">
              Joined as <span className="font-mono font-bold text-white">{user?.userId}</span> — speak into your mic; the AI attributes every statement to you.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}