"use client";

import { tierForScore, isPerfect, GOLD } from "@/lib/rating";
import { formatScore, cn } from "@/lib/utils";
import { scoreTierIcon } from "./score-tier-icon";

/**
 * The score graphic — a 270° radial gauge that fills to the value in the tier
 * color, with the number, tier word and an expressive tier icon stacked in the
 * middle. Everything (arc length, color, icon) transitions as the value changes,
 * so dragging the slider reads as a live verdict rather than a static readout.
 */
export function ScoreDial({
  value,
  size = 188,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const tier = tierForScore(value);
  const color = isPerfect(value) ? GOLD : tier.color;
  const Icon = scoreTierIcon(value);

  const stroke = 13;
  const r = (size - stroke) / 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const SWEEP = 0.75; // 270° gauge, gap at the bottom
  const arc = circ * SWEEP;
  const filled = arc * Math.max(0, Math.min(1, value / 10));

  return (
    <div className={cn("relative", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
        <g style={{ transform: "rotate(135deg)", transformOrigin: "center" }}>
          {/* track */}
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${arc} ${circ}`}
          />
          {/* fill */}
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circ}`}
            style={{
              transition: "stroke-dasharray 0.28s cubic-bezier(0.22,1,0.36,1), stroke 0.28s ease",
              filter: `drop-shadow(0 0 8px ${color}66)`,
            }}
          />
        </g>
      </svg>

      {/* center readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
          style={{ background: `${color}22`, color }}
        >
          <Icon className="h-5 w-5" />
        </span>
        <span className="mt-1.5 flex items-baseline gap-0.5 font-black leading-none tabular-nums transition-colors" style={{ color: tier.text }}>
          <span className="text-5xl">{formatScore(value)}</span>
          <span className="text-lg text-white/30">/10</span>
        </span>
        <span
          className="mt-1 text-[11px] font-black uppercase tracking-[0.2em] transition-colors"
          style={{ color }}
        >
          {tier.label}
        </span>
      </div>
    </div>
  );
}
