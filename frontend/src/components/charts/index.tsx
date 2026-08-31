import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const SKILL_COLORS = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#ec4899", "#84cc16", "#06b6d4"];

export function SkillBars({ data, title = "Skill Scores" }: { data: Array<{ name: string; value: number }>; title?: string }) {
  return (
    <div>
      <h3 className="mb-3 font-semibold text-slate-700">{title}</h3>
      <div className="space-y-2">
        {data.map((d, i) => (
          <div key={d.name}>
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span className="capitalize">{d.name}</span>
              <span className="font-medium">{Math.round(d.value)}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full"
                style={{ width: `${Math.min(100, d.value)}%`, backgroundColor: SKILL_COLORS[i % SKILL_COLORS.length] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkillRadar({ data }: { data: Array<{ skill: string; score: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <RadarChart data={data} outerRadius="70%">
        <PolarGrid />
        <PolarAngleAxis dataKey="skill" tick={{ fontSize: 12 }} />
        <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
        <Radar dataKey="score" stroke="#4f46e5" fill="#6366f1" fillOpacity={0.4} />
        <Tooltip />
      </RadarChart>
    </ResponsiveContainer>
  );
}

export function ProgressLine({ data, dataKey = "overall" }: { data: Array<{ date: string; [k: string]: string | number }>; dataKey?: string }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Line type="monotone" dataKey={dataKey} stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function BeforeAfterChart({ data }: { data: Array<{ name: string; before: number; after: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="before" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        <Bar dataKey="after" fill="#4f46e5" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LevelDistribution({ data }: { data: Record<string, number> }) {
  const rows = Object.entries(data).map(([name, value]) => ({ name, value }));
  const colors = ["#ef4444", "#f59e0b", "#eab308", "#22c55e", "#10b981"];
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={rows} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {rows.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function MistakeHeatmap({
  weeks,
  categories,
  grid,
}: {
  weeks: string[];
  categories: string[];
  grid: Record<string, Record<string, number>>;
}) {
  const max = Math.max(
    1,
    ...Object.values(grid).flatMap((row) => Object.values(row)),
  );
  const color = (count: number) => {
    if (count === 0) return "#f8fafc";
    const t = count / max;
    if (t < 0.25) return "#fecaca";
    if (t < 0.5) return "#f87171";
    if (t < 0.75) return "#ef4444";
    return "#b91c1c";
  };
  const short = (w: string) => {
    const d = new Date(w);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-separate border-spacing-1">
        <thead>
          <tr>
            <th className="pb-1 pr-2 text-left text-xs font-medium text-slate-400">Skill</th>
            {weeks.map((w) => (
              <th key={w} className="pb-1 text-center text-[10px] font-medium text-slate-400">
                {short(w)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat}>
              <td className="pr-2 text-right text-xs capitalize text-slate-500">{cat}</td>
              {weeks.map((w) => {
                const count = grid[w]?.[cat] ?? 0;
                return (
                  <td key={w} className="p-0">
                    <div
                      title={`${cat}: ${count} mistake${count === 1 ? "" : "s"} (week of ${w})`}
                      className="h-6 w-6 rounded"
                      style={{ backgroundColor: color(count) }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
        <span>Fewer</span>
        {["#f8fafc", "#fecaca", "#f87171", "#ef4444", "#b91c1c"].map((c) => (
          <span key={c} className="inline-block h-3 w-3 rounded" style={{ backgroundColor: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

export function SkillTrend({ data }: { data: Record<string, Array<{ date: string; score: number }>> }) {
  const skills = Object.keys(data).filter((s) => (data[s]?.length ?? 0) > 0);
  const colors = ["#6366f1", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#f97316", "#ec4899", "#84cc16"];
  const points = skills.length
    ? Array.from(
        new Set(skills.flatMap((s) => data[s].map((p) => p.date))),
      )
        .sort()
        .map((date) => {
          const row: Record<string, string | number> = { date };
          skills.forEach((s) => {
            const p = data[s].find((x) => x.date === date);
            if (p) row[s] = p.score;
          });
          return row;
        })
    : [];
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={points} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
        <Tooltip />
        {skills.map((s, i) => (
          <Line
            key={s}
            type="monotone"
            dataKey={s}
            stroke={colors[i % colors.length]}
            strokeWidth={2}
            dot={{ r: 2 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
