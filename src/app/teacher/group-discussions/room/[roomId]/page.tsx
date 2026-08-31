"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api } from "@/lib/api";
import { useToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/page-header";
import { PageSkeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ArrowLeft, Radio } from "lucide-react";

interface LiveState {
  roomId: string;
  topic: string;
  status: string;
  elapsedSeconds: number;
  remainingSeconds: number;
  participants: { userId: string; speakingTimeSeconds: number; speakingNow: boolean; participationPercent: number; currentScore: number }[];
}

export default function TeacherRoomMonitor() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [live, setLive] = useState<LiveState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const poll = () =>
      api<LiveState>(`/api/groups/rooms/${params.id}/live`)
        .then((d) => { if (active) { setLive(d); setError(""); } })
        .catch((e) => { if (active) setError(e.message); });
    poll();
    const t = setInterval(poll, 3000);
    return () => { active = false; clearInterval(t); };
  }, [params.id]);

  if (error) return <p className="p-10 text-center text-sm text-red-600">{error}</p>;
  if (!live) return <PageSkeleton />;

  return (
    <div className="space-y-8">
      <Link href="/teacher/group-discussions" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> All discussions
      </Link>

      <PageHeader
        eyebrow={`Room · ${params.id}`}
        title={live.topic}
        subtitle={`${Math.floor(live.remainingSeconds / 60)} min remaining`}
        icon={<Radio className="h-6 w-6" />}
        gradient="bg-gradient-brand"
        right={<Badge tone={live.status === "ACTIVE" ? "success" : live.status === "WAITING" ? "warning" : "default"}>{live.status}</Badge>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Participants", value: String(live.participants.length) },
          { label: "Remaining", value: `${Math.floor(live.remainingSeconds / 60)}m ${live.remainingSeconds % 60}s` },
          { label: "Elapsed", value: `${Math.floor(live.elapsedSeconds / 60)}m` },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{s.label}</p>
            <p className="mt-1 font-display text-3xl font-extrabold text-ink-900">{s.value}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader title="Live participation" subtitle="Auto-refreshes every 3 seconds" icon="📡" />
        <div className="divide-y divide-ink-50">
          {live.participants.length === 0 && <p className="p-6 text-center text-sm text-ink-400">No participants joined yet.</p>}
          {live.participants.map((p) => (
            <div key={p.userId} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-primary-600">{p.userId}</span>
                  {p.speakingNow && <span className="flex items-center gap-1 text-xs font-bold text-emerald-600"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Speaking</span>}
                </div>
                <ProgressBar value={p.participationPercent} color="bg-gradient-brand" />
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-ink-800">{p.participationPercent}%</p>
                <p className="text-xs text-ink-400">{p.speakingTimeSeconds}s spoken</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}