import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  icon,
  gradient = "bg-gradient-brand",
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  gradient?: string;
  right?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 animate-fade-in-up">
      <div className="flex items-center gap-4">
        {icon && (
          <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl text-white shadow-lift ${gradient}`}>{icon}</span>
        )}
        <div>
          {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-500">{eyebrow}</p>}
          <h1 className="text-2xl font-extrabold sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="flex items-center gap-2">{right}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  sub,
  gradient = "from-primary-500 to-violet-500",
}: {
  label: string;
  value: string;
  sub?: string;
  gradient?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card">
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br opacity-15 blur-2xl ${gradient}`} />
      <p className="text-xs font-semibold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1.5 font-display text-3xl font-extrabold text-ink-900">{value}</p>
      {sub && <p className="mt-0.5 text-xs font-medium text-emerald-600">{sub}</p>}
    </div>
  );
}