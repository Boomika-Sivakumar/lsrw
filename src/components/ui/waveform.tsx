"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export function Waveform({ active, bars = 24, color = "#8B5CF6", className = "" }: { active: boolean; bars?: number; color?: string; className?: string }) {
  const [heights, setHeights] = useState<number[]>(() => Array.from({ length: bars }, () => 0.3));
  const raf = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(raf.current);
      setHeights(Array.from({ length: bars }, () => 0.3));
      return;
    }
    let running = true;
    const tick = () => {
      if (!running) return;
      setHeights(Array.from({ length: bars }, () => 0.2 + Math.random() * 0.8));
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      running = false;
      cancelAnimationFrame(raf.current);
    };
  }, [active, bars]);

  return (
    <div className={`flex items-center justify-center gap-[3px] ${className}`} aria-hidden="true">
      {heights.map((h, i) => (
        <span
          key={i}
          className="w-[4px] rounded-full transition-transform duration-150"
          style={{
            height: "28px",
            backgroundColor: color,
            transform: `scaleY(${h})`,
            transformOrigin: "center",
            opacity: active ? 1 : 0.25,
          }}
        />
      ))}
    </div>
  );
}