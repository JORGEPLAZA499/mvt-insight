import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";

interface MiniGaugeProps {
  value: number;
  max: number;
  label: string;
  icon?: LucideIcon;
  tone?: "primary" | "success" | "warning" | "destructive";
}

/**
 * Compact circular donut with a needle. Animated on mount.
 */
export function MiniGauge({ value, max, label, icon: Icon, tone = "primary" }: MiniGaugeProps) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const [animated, setAnimated] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(pct), 150);
    return () => clearTimeout(t);
  }, [pct]);

  useEffect(() => {
    const duration = 900;
    const start = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setCount(Math.round(value * eased));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const color = {
    primary: "var(--primary)",
    success: "var(--success)",
    warning: "var(--warning)",
    destructive: "var(--destructive)",
  }[tone];

  const cx = 60;
  const cy = 60;
  const r = 44;
  const circumference = 2 * Math.PI * r;
  const dash = (animated / 100) * circumference;

  // Needle angle: full circle goes from -90deg (top) to 270deg
  const angle = -90 + (animated / 100) * 360;
  const rad = (angle * Math.PI) / 180;
  const needleX = cx + (r - 10) * Math.cos(rad);
  const needleY = cy + (r - 10) * Math.sin(rad);

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-card hover:shadow-glow transition-shadow h-full">
      <div className="relative flex-shrink-0" style={{ width: 120, height: 120 }}>
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--muted)" strokeWidth={8} opacity={0.5} />
          <circle
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference}`}
            style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.22, 1.2, 0.36, 1)", filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        {/* Needle layer (not rotated) */}
        <svg viewBox="0 0 120 120" className="absolute inset-0 w-full h-full">
          <line
            x1={cx}
            y1={cy}
            x2={needleX}
            y2={needleY}
            stroke={color}
            strokeWidth={2.5}
            strokeLinecap="round"
            style={{ transition: "all 1.2s cubic-bezier(0.22, 1.2, 0.36, 1)" }}
          />
          <circle cx={cx} cy={cy} r={5} fill="var(--card)" stroke={color} strokeWidth={2} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold tabular-nums" style={{ color }}>
            {count}
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
          {Icon && <Icon className="h-3.5 w-3.5 flex-shrink-0" style={{ color }} />}
          {label}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          <span className="tabular-nums font-medium" style={{ color }}>
            {Math.round(pct)}%
          </span>{" "}
          del total
        </div>
      </div>
    </div>
  );
}
