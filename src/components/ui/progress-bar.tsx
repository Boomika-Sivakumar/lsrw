"use client";

import { useEffect, useRef, useState } from "react";

export function ProgressBar({ value, color = "bg-primary-500", track = "bg-ink-100", className = "" }: { value: number; color?: string; track?: string; className?: string }) {
  const [width, setWidth] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          const t = setTimeout(() => setWidth(Math.min(100, Math.max(0, value))), 80);
          observer.disconnect();
          return () => clearTimeout(t);
        }
      },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className={`h-2 w-full overflow-hidden rounded-full ${track} ${className}`}>
      <div
        className={`h-full rounded-full ${color} transition-all duration-1000 ease-out`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
}