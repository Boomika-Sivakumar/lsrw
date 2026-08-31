"use client";

import { Mic, Headphones } from "lucide-react";

const AVATAR_COLORS = [
  "from-violet-500 to-purple-500",
  "from-sky-500 to-cyan-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-pink-500 to-rose-500",
  "from-primary-500 to-violet-500",
];

type Status = "speaking" | "listening" | "inactive";

export function ParticipantCard({
  userId,
  name,
  status,
  isYou,
  index,
}: {
  userId: string;
  name: string;
  status: Status;
  isYou?: boolean;
  index: number;
}) {
  const gradient = AVATAR_COLORS[index % AVATAR_COLORS.length];
  const speaking = status === "speaking";
  const listening = status === "listening";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border bg-white p-4 text-center transition-all duration-300 ${
        speaking ? "border-emerald-300 shadow-soft" : "border-ink-200/70"
      }`}
    >
      {speaking && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-cyan-400" />}
      <div className="relative flex flex-col items-center py-3">
        <div className={`relative rounded-full ${speaking ? "ring-4 ring-emerald-200" : listening ? "ring-2 ring-sky-200" : ""}`}>
          {speaking && <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400" />}
          <span
            className={`relative flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-white shadow-soft ${gradient}`}
          >
            {name
              .split(" ")
              .map((w) => w[0])
              .slice(0, 1)
              .join("")
              .toUpperCase()}
          </span>
        </div>

        <p className="mt-3 font-mono text-xs font-extrabold text-ink-800">
          {userId}
          {isYou && <span className="ml-1 rounded bg-primary-100 px-1 text-[9px] text-primary-700">YOU</span>}
        </p>
        <p className="mt-0.5 text-xs text-ink-500">{name}</p>

        <span
          className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
            speaking
              ? "bg-emerald-50 text-emerald-600"
              : listening
                ? "bg-sky-50 text-sky-600"
                : "bg-ink-50 text-ink-400"
          }`}
        >
          {speaking && <Mic className="h-3 w-3" />}
          {listening && <Headphones className="h-3 w-3" />}
          {speaking ? "Speaking" : listening ? "Listening" : "Not active"}
        </span>
      </div>
    </div>
  );
}