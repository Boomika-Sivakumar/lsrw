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
          <span className={`flex h-13 w-13 items-center justify-center rounded-2xl text-2xl text-white shadow-lift transition-transform duration-300 hover:scale-105 ${gradient}`}>
            {icon}
          </span>
        )}
        <div>
          {eyebrow && (
            <span className="inline-block text-[11px] font-bold uppercase tracking-[0.18em] text-primary-600">
              {eyebrow}
            </span>
          )}
          <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {right && <div className="flex items-center gap-2.5">{right}</div>}
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
    <div className="group relative overflow-hidden rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className={`pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-gradient-to-br opacity-15 blur-2xl transition-opacity group-hover:opacity-30 ${gradient}`} />
      <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{label}</p>
      <p className="mt-1.5 font-display text-3xl font-extrabold text-ink-900">{value}</p>
      {sub && <p className="mt-1 text-xs font-semibold text-emerald-600">{sub}</p>}
    </div>
  );
}