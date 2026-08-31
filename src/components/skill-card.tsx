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
    <Card hover className="group flex h-full flex-col overflow-hidden p-5">
      <div className="flex items-center gap-3">
        <span className={`flex h-11 w-11 items-center justify-center rounded-2xl text-xl shadow-sm ${skill.gradient}`}>{skill.icon}</span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-ink-400">{skill.name}</p>
          <p className="font-display text-3xl font-extrabold text-ink-900">{skill.score}%</p>
        </div>
      </div>

      <div className="mt-4">
        <ProgressBar value={skill.score} color={skill.bar} />
      </div>

      <div className="mt-4 grid flex-1 gap-1.5">
        {skill.submetrics.map((m) => (
          <div key={m.label} className="flex items-center justify-between text-xs">
            <span className="text-ink-500">{m.label}</span>
            <span className="font-semibold text-ink-800">{m.value}%</span>
          </div>
        ))}
      </div>

      <Link
        href={skill.href}
        className={`mt-4 inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 group-hover:gap-2.5 ${skill.gradient}`}
      >
        Practice <ArrowRight className="h-4 w-4" />
      </Link>
    </Card>
  );
}