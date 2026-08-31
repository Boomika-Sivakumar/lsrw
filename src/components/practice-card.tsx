import Link from "next/link";
import { ArrowRight } from "lucide-react";

export interface PracticeTile {
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  gradient: string;
  glow?: string;
}

export function PracticeCard({ tile }: { tile: PracticeTile }) {
  return (
    <Link
      href={tile.href}
      className={`group relative overflow-hidden rounded-2xl p-6 text-white shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift ${tile.gradient}`}
    >
      <div className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full blur-2xl transition-opacity duration-300 group-hover:opacity-100 opacity-60 ${tile.glow ?? "bg-white/30"}`} />
      <span className="text-4xl">{tile.icon}</span>
      <h3 className="mt-4 font-display text-lg font-extrabold uppercase tracking-wide">{tile.title}</h3>
      <p className="mt-1 text-sm text-white/85">{tile.subtitle}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur transition-all duration-200 group-hover:gap-3 group-hover:bg-white/25">
        Start <ArrowRight className="h-4 w-4" />
      </span>
    </Link>
  );
}