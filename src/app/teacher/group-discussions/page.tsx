"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, MonitorPlay, ArrowRight, Loader2 } from "lucide-react";

const CRITERIA = ["FLUENCY", "GRAMMAR", "VOCABULARY", "PRONUNCIATION", "CONFIDENCE", "LISTENING", "PARTICIPATION", "IDEA_CONTRIBUTION"];

interface RoomRow {
  id: string;
  sessionCode: string;
  topic: string;
  durationMinutes: number;
  difficulty: string;
  status: string;
  startedAt: string;
  participantCount: number;
  participants: { id: string; name: string; userId: string }[];
}

export default function TeacherGroupDiscussionsPage() {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<RoomRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [topic, setTopic] = useState("Should technology replace classroom teachers?");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [maxParticipants, setMaxParticipants] = useState(6);
  const [criteria, setCriteria] = useState<string[]>(CRITERIA);
  const [creating, setCreating] = useState(false);

  const load = () => api<RoomRow[]>("/api/teacher/rooms").then(setRooms).catch((e) => toast("error", e.message)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  function toggleCriteria(c: string) {
    setCriteria((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const room = await api<{ id: string; sessionCode: string }>("/api/groups/rooms", {
        method: "POST",
        body: { topic, durationMinutes, difficulty, maxParticipants, criteria },
      });
      toast("success", `Room created — code ${room.sessionCode}`);
      setTopic("Should technology replace classroom teachers?");
      load();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setCreating(false);
    }
  }

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Teacher" title="Group Discussions" subtitle="Create live rooms, share session codes, and monitor participation." icon={<Users className="h-6 w-6" />} gradient="bg-gradient-brand" />

      <Card>
        <CardHeader title="Create a discussion room" subtitle="Students join with the session code; AI monitors and scores participation" icon="🛋️" />
        <form onSubmit={onCreate} className="grid gap-4 p-6 sm:grid-cols-3">
          <div className="sm:col-span-3">
            <label className="block text-sm font-semibold text-ink-700">Topic</label>
            <input value={topic} onChange={(e) => setTopic(e.target.value)} required className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-700">Duration (min)</label>
            <input type="number" value={durationMinutes} min={1} max={120} onChange={(e) => setDurationMinutes(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-700">Difficulty</label>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)} className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500">
              {["EASY", "MEDIUM", "HARD"].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink-700">Max participants</label>
            <input type="number" value={maxParticipants} min={2} max={20} onChange={(e) => setMaxParticipants(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500" />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-sm font-semibold text-ink-700">Assessment criteria</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CRITERIA.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleCriteria(c)}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${criteria.includes(c) ? "bg-gradient-brand text-white shadow-soft" : "bg-ink-100 text-ink-500 hover:bg-ink-200"}`}
                >
                  {c.replace(/_/g, " ")}
                </button>
              ))}
            </div>
          </div>
          <div className="sm:col-span-3">
            <button disabled={creating} className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5 disabled:opacity-50">
              {creating ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : "Create discussion"}
            </button>
          </div>
        </form>
      </Card>

      <Card>
        <CardHeader title={`Rooms (${rooms.length})`} subtitle="Rooms you created" icon="🛋️" />
        <div className="divide-y divide-ink-50">
          {rooms.length === 0 && <p className="p-6 text-center text-sm text-ink-400">No rooms yet. Create one above.</p>}
          {rooms.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <Badge tone={r.status === "ACTIVE" ? "success" : r.status === "WAITING" ? "warning" : "default"}>{r.status}</Badge>
                  <Badge tone="primary">{r.difficulty}</Badge>
                  <span className="font-mono text-xs text-ink-400">Code: {r.sessionCode}</span>
                </div>
                <p className="text-sm font-bold text-ink-900">{r.topic}</p>
                <p className="text-xs text-ink-400">{r.participantCount} participant(s) · {new Date(r.startedAt).toLocaleString()}</p>
              </div>
              <Link href={`/teacher/group-discussions/room/${r.id}`} className="inline-flex flex-none items-center gap-1.5 rounded-xl bg-primary-50 px-4 py-2 text-sm font-bold text-primary-700 transition-colors hover:bg-primary-100">
                <MonitorPlay className="h-4 w-4" /> Monitor
              </Link>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}