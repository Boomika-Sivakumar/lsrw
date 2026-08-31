import { Card } from "@/components/ui/card";

export function AIInsightCard({ icon, title, tone, items }: { icon: string; title: string; tone: "strength" | "warning"; items: string[] }) {
  const isStrength = tone === "strength";
  return (
    <Card className="h-full p-5">
      <div className="flex items-center gap-2.5">
        <span className="text-xl">{icon}</span>
        <h3 className={`text-sm font-bold uppercase tracking-wide ${isStrength ? "text-emerald-700" : "text-amber-700"}`}>{title}</h3>
      </div>
      <ul className="mt-4 space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-ink-700">
            <span className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] ${isStrength ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
              {isStrength ? "✓" : "⚠"}
            </span>
            {item}
          </li>
        ))}
      </ul>
    </Card>
  );
}