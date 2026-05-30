import { useEffect, useState } from "react";

interface GaugeClockProps {
  /** 0..100 */
  value: number;
  label: string;
  sublabel?: string;
  /** Riesgo: cambia el color de la zona + glow */
  tone?: "low" | "medium" | "high" | "critical";
}

/**
 * Semicircular gauge (270°) drawn with SVG. Animated needle that sweeps from
 * the minimum to the target value on mount, with ticks and a colored arc.
 */
export function GaugeClock({ value, label, sublabel, tone = "low" }: GaugeClockProps) {
  const [animated, setAnimated] = useState(0);
  const safe = Math.max(0, Math.min(100, value));

  useEffect(() => {
    const t = setTimeout(() => setAnimated(safe), 120);
    return () => clearTimeout(t);
  }, [safe]);

  // Arc geometry: 270° sweep starting at 135° (bottom-left), ending at 405° (bottom-right)
  const cx = 150;
  const cy = 150;
  const r = 110;
  const startAngle = 135;
  const endAngle = 405; // 360 + 45
  const totalAngle = endAngle - startAngle; // 270

  const valueAngle = startAngle + (animated / 100) * totalAngle;

  const polar = (angle: number, radius: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const arcPath = (from: number, to: number, radius: number) => {
    const a = polar(from, radius);
    const b = polar(to, radius);
    const large = to - from > 180 ? 1 : 0;
    return `M ${a.x} ${a.y} A ${radius} ${radius} 0 ${large} 1 ${b.x} ${b.y}`;
  };

  // Ticks every 9° (30 ticks, every 3rd is major)
  const ticks = Array.from({ length: 31 }, (_, i) => {
    const angle = startAngle + (i / 30) * totalAngle;
    const major = i % 5 === 0;
    const inner = polar(angle, major ? 92 : 98);
    const outer = polar(angle, 108);
    return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y, major };
  });

  const needleTip = polar(valueAngle, r - 14);
  const needleBaseA = polar(valueAngle + 90, 6);
  const needleBaseB = polar(valueAngle - 90, 6);

  const toneColor = {
    low: "var(--success)",
    medium: "var(--warning)",
    high: "var(--destructive)",
    critical: "var(--destructive)",
  }[tone];

  const toneLabel = {
    low: "Bajo",
    medium: "Medio",
    high: "Alto",
    critical: "Crítico",
  }[tone];

  return (
    <div className="relative h-full rounded-xl border border-border bg-card shadow-card p-4 overflow-hidden flex flex-col">

      {/* Glow background */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 60%, ${toneColor === "var(--destructive)" ? "oklch(0.65 0.24 25 / 0.18)" : "oklch(0.82 0.16 200 / 0.12)"}, transparent 60%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between mb-2">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
            {sublabel && <div className="text-xs text-muted-foreground/70 mt-1">{sublabel}</div>}
          </div>
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border"
            style={{
              color: toneColor,
              borderColor: `color-mix(in oklab, ${toneColor} 40%, transparent)`,
              backgroundColor: `color-mix(in oklab, ${toneColor} 12%, transparent)`,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: toneColor, boxShadow: `0 0 8px ${toneColor}` }}
            />
            {toneLabel}
          </span>
        </div>

        <div className="relative mx-auto" style={{ width: 300, height: 220 }}>
          <svg viewBox="0 0 300 240" className="w-full h-auto">
            <defs>
              <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="oklch(0.72 0.17 155)" />
                <stop offset="50%" stopColor="oklch(0.80 0.16 75)" />
                <stop offset="100%" stopColor="oklch(0.65 0.24 25)" />
              </linearGradient>
              <filter id="needle-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Track */}
            <path
              d={arcPath(startAngle, endAngle, r)}
              fill="none"
              stroke="var(--muted)"
              strokeWidth={14}
              strokeLinecap="round"
              opacity={0.5}
            />
            {/* Colored arc */}
            <path
              d={arcPath(startAngle, endAngle, r)}
              fill="none"
              stroke="url(#gauge-grad)"
              strokeWidth={14}
              strokeLinecap="round"
              opacity={0.85}
            />

            {/* Ticks */}
            {ticks.map((t, i) => (
              <line
                key={i}
                x1={t.x1}
                y1={t.y1}
                x2={t.x2}
                y2={t.y2}
                stroke="var(--foreground)"
                strokeOpacity={t.major ? 0.6 : 0.25}
                strokeWidth={t.major ? 2 : 1}
              />
            ))}

            {/* Needle */}
            <g
              style={{
                transition: "transform 1.4s cubic-bezier(0.22, 1.2, 0.36, 1)",
                transformOrigin: `${cx}px ${cy}px`,
              }}
              filter="url(#needle-glow)"
            >
              <polygon
                points={`${needleBaseA.x},${needleBaseA.y} ${needleTip.x},${needleTip.y} ${needleBaseB.x},${needleBaseB.y}`}
                fill={toneColor}
              />
              <circle cx={cx} cy={cy} r={10} fill="var(--card)" stroke={toneColor} strokeWidth={2} />
              <circle cx={cx} cy={cy} r={3} fill={toneColor} />
            </g>

            {/* Center label */}
            <text
              x={cx}
              y={cy + 50}
              textAnchor="middle"
              fontSize="42"
              fontWeight="700"
              fill="var(--foreground)"
              fontFamily="ui-sans-serif, system-ui"
            >
              {Math.round(safe)}
            </text>
            <text
              x={cx}
              y={cy + 70}
              textAnchor="middle"
              fontSize="11"
              fill="var(--muted-foreground)"
              letterSpacing="2"
            >
              / 100
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}
