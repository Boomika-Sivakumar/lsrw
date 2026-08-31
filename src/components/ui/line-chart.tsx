"use client";

import { useId } from "react";

export function LineChart({
  data,
  height = 200,
  from = "#6366F1",
  to = "#8B5CF6",
}: {
  data: { label: string; value: number }[];
  height?: number;
  from?: string;
  to?: string;
}) {
  const gid = useId().replace(/:/g, "");
  const width = 100;
  const padX = 4;
  const padY = 16;

  const min = Math.min(...data.map((d) => d.value), 0);
  const max = Math.max(...data.map((d) => d.value), 100);
  const range = max - min || 1;

  const pts = data.map((d, i) => {
    const x = padX + (i * (width - padX * 2)) / Math.max(1, data.length - 1);
    const y = height - padY - ((d.value - min) / range) * (height - padY * 2);
    return { x, y, ...d };
  });

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
  const area = `${line} L${pts[pts.length - 1]?.x ?? 0},${height} L${pts[0]?.x ?? 0},${height} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img" aria-label="Progress chart">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={from} stopOpacity="0.35" />
            <stop offset="100%" stopColor={to} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => {
          const y = f * height;
          return <line key={f} x1="0" x2={width} y1={y} y2={y} stroke="#E2E8F0" strokeWidth="0.4" strokeDasharray="1.5 1.5" />;
        })}
        <path d={area} fill={`url(#${gid})`} />
        <path d={line} fill="none" stroke={from} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="2.4" fill="white" stroke={to} strokeWidth="1.2" />
            <text x={p.x} y={height - 2} textAnchor="middle" fontSize="3.4" fontWeight="700" fill="#64748B">
              {p.label}
            </text>
            <text x={p.x} y={p.y - 6} textAnchor="middle" fontSize="3.6" fontWeight="800" fill={from}>
              {p.value}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}