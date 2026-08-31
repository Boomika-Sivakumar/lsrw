import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";

export interface SkillData {
  icon: string;
  name: string;
  score: number;
  gradient: string;
  bar: string;
  submetrics: { label: string; value: number }[];
  href: string;
}

export function SkillCard({ skill }: { skill: SkillData }) {
  return (
    <Card hover className="group flex h-full flex-col overflow-hidden p-6 transition-all duration-300">
      <div className="flex items-center gap-3.5">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl text-white shadow-soft transition-transform duration-300 group-hover:scale-110 ${skill.gradient}`}>
          {skill.icon}
        </span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">{skill.name}</p>
          <p className="font-display text-3xl font-extrabold text-ink-900">{skill.score}%</p>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar value={skill.score} color={skill.bar} />
      </div>

      <div className="mt-4 grid flex-1 gap-2">
        {skill.submetrics.map((m) => (
          <div key={m.label} className="flex items-center justify-between rounded-xl bg-ink-50/70 px-3 py-1.5 text-xs font-semibold">
            <span className="text-ink-600">{m.label}</span>
            <span className="font-mono font-bold text-ink-900">{m.value}%</span>
          </div>
        ))}
      </div>

      <Link
        href={skill.href}
        className={`mt-5 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-soft transition-all duration-200 group-hover:gap-3 group-hover:shadow-lift ${skill.gradient}`}
      >
        Practice {skill.name} <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
      </Link>
    </Card>
  );
}