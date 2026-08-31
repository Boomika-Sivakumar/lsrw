import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
}

export function Card({ children, hover, className = "", ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-ink-200/70 bg-white shadow-card transition-all duration-300 ${
        hover ? "hover:-translate-y-1 hover:shadow-lift" : ""
      } ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, icon, right }: { title: string; subtitle?: string; icon?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-ink-100 px-5 py-4">
      <div className="flex items-center gap-3">
        {icon && <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-50 text-lg">{icon}</span>}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-ink-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}