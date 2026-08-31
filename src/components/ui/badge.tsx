import type { ReactNode } from "react";

type Tone = "default" | "success" | "warning" | "danger" | "ai" | "primary" | "sky";

const tones: Record<Tone, string> = {
  default: "bg-ink-100/80 text-ink-700 border border-ink-200/60",
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200/60",
  warning: "bg-amber-50 text-amber-700 border border-amber-200/60",
  danger: "bg-red-50 text-red-700 border border-red-200/60",
  ai: "bg-violet-50 text-violet-700 border border-violet-200/60",
  primary: "bg-primary-50 text-primary-700 border border-primary-200/60",
  sky: "bg-sky-50 text-sky-700 border border-sky-200/60",
};

export function Badge({ tone = "default", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide transition-colors ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}