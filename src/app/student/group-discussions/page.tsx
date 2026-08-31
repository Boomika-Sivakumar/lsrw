"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Users, Plus, Loader2, KeyRound } from "lucide-react";

export default function GroupHub() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessionCode, setSessionCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function join(e?: FormEvent) {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api<{ id: string }>("/api/groups/rooms/join", {
        method: "POST",
        body: { sessionCode: sessionCode.trim() },
      });
      router.push(`/group/room/${res.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Join failed");
    } finally {
      setLoading(false);
    }
  }

  const steps = [
    ["1", "Share / enter the 6-letter session code your teacher created."],
    ["2", "You're identified automatically by your User ID in the room."],
    ["3", "The AI moderator opens the topic — speak naturally with your mic."],
    ["4", "Every turn is attributed to you and analyzed in real time."],
    ["5", "Get an individual report + the teacher sees the group leaderboard."],
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Multi-User"
        title="AI Group Discussion"
        subtitle="Practice real-time communication with peers. The AI identifies every speaker, moderates, and scores participation."
        icon={<Users className="h-6 w-6" />}
        gradient="bg-gradient-rose"
        right={
          user?.role === "TEACHER" ? (
            <Link href="/student/group-discussions/create" className="inline-flex items-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 text-sm font-bold text-white shadow-lift transition-transform hover:-translate-y-0.5">
              <Plus className="h-4 w-4" /> Create Discussion
            </Link>
          ) : undefined
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* JOIN */}
        <Card className="p-6">
          <CardHeader title="Join a Discussion" subtitle="Enter the session code your teacher shared" icon={<KeyRound className="h-4 w-4 text-primary-600" />} />
          <form onSubmit={join} className="mt-4">
            <p className="mb-3 text-sm text-ink-500">
              Your User ID (<span className="font-mono font-bold text-primary-600">{user?.userId}</span>) is used automatically to identify you.
            </p>
            <input
              value={sessionCode}
              onChange={(e) => setSessionCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              placeholder="e.g. K7M2QP"
              className="w-full rounded-xl border border-ink-200 px-4 py-3 text-center font-mono text-xl font-extrabold uppercase tracking-[0.4em] text-ink-800 outline-none transition-colors focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              maxLength={6}
            />
            {error && <p className="mt-2 text-sm font-medium text-red-600">{error}</p>}
            <Button variant="gradient" size="lg" full className="mt-4" disabled={loading || sessionCode.length < 6} type="submit">
              {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Joining…</> : "Join Room"}
            </Button>
          </form>
        </Card>

        {/* HOW IT WORKS */}
        <Card className="p-6">
          <CardHeader title="How it works" subtitle="What happens after you join" icon="🎯" />
          <ol className="mt-4 space-y-3">
            {steps.map(([n, text]) => (
              <li key={n} className="flex items-start gap-3">
                <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-gradient-brand text-[11px] font-bold text-white">{n}</span>
                <p className="text-sm text-ink-600">{text}</p>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="rounded-2xl border border-primary-200/70 bg-primary-50/60 p-5">
        <p className="text-sm font-bold text-primary-800">🤖 AI does the heavy lifting</p>
        <p className="mt-1 text-xs leading-relaxed text-primary-700/80">
          Fluency, pronunciation, grammar, vocabulary, confidence, participation, turn-taking, interruptions and idea
          contribution — all measured per speaker with full transcripts and speaker labels.
        </p>
      </div>
    </div>
  );
}