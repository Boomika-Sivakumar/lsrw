import type { ReactNode } from "react";

type Tone = "default" | "success" | "warning" | "danger" | "ai" | "primary";

const tones: Record<Tone, string> = {
  default: "bg-ink-100 text-ink-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-600",
  ai: "bg-violet-50 text-violet-700",
  primary: "bg-primary-50 text-primary-700",
};

export function Badge({ tone = "default", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}