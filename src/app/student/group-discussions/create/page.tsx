"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Loader2, Users } from "lucide-react";

const CRITERIA = ["FLUENCY", "GRAMMAR", "VOCABULARY", "PRONUNCIATION", "CONFIDENCE", "LISTENING", "PARTICIPATION", "IDEA_CONTRIBUTION"];

export default function CreateRoom() {
  const router = useRouter();
  const [topic, setTopic] = useState("Should technology replace classroom teachers?");
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [maxParticipants, setMaxParticipants] = useState(6);
  const [criteria, setCriteria] = useState<string[]>(CRITERIA);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const room = await api<{ id: string; sessionCode: string }>("/api/groups/rooms", {
        method: "POST",
        body: { topic, durationMinutes, difficulty, maxParticipants, criteria },
      });
      router.push(`/group/room/${room.id}`);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function toggleCriteria(c: string) {
    setCriteria((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        eyebrow="Teacher"
        title="Create Group Discussion"
        subtitle="Set up a live room. Students join with a session code and the AI moderates + analyzes."
        icon={<Users className="h-6 w-6" />}
        gradient="bg-gradient-rose"
      />

      <form onSubmit={onSubmit} className="space-y-6">
        <Card className="p-6">
          <label className="block text-sm font-bold text-ink-700">Topic</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100" required />

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-bold text-ink-700">Duration (min)</label>
              <input type="number" value={durationMinutes} min={1} max={120} onChange={(e) => setDurationMinutes(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-700">Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)} className="mt-1.5 w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-primary-500">
                {["EASY", "MEDIUM", "HARD"].map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-ink-700">Participants</label>
              <input type="number" value={maxParticipants} min={2} max={20} onChange={(e) => setMaxParticipants(Number(e.target.value))} className="mt-1.5 w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none focus:border-primary-500" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <label className="block text-sm font-bold text-ink-700">Assessment Criteria</label>
          <p className="mt-0.5 text-xs text-ink-400">Metrics the AI will evaluate for every participant.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CRITERIA.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleCriteria(c)}
                className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
                  criteria.includes(c) ? "bg-gradient-brand text-white shadow-soft" : "bg-ink-100 text-ink-500 hover:bg-ink-200"
                }`}
              >
                {c.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </Card>

        <Button variant="gradient" size="xl" full disabled={loading} type="submit">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating discussion…</> : "Create Discussion"}
        </Button>
      </form>
    </div>
  );
}