"use client";

import { cn } from "@/lib/utils";
import { formatScore } from "@/lib/utils";
import { tierForScore, isPerfect, GOLD } from "@/lib/rating";

interface ScoreBadgeProps {
  /** 0–10 score */
  score?: number | null;
  size?: "sm" | "md" | "lg";
  /**
   * Frosted dark plate behind the ring so it stays legible over busy
   * artwork. On by default; turn off when the badge already sits on a
   * quiet surface (dialogs, glass panels).
   */
  plate?: boolean;
  className?: string;
}

const SIZES = {
  sm: { box: 34, stroke: 3, font: "text-[11px]" },
  md: { box: 46, stroke: 3.5, font: "text-sm" },
  lg: { box: 84, stroke: 5, font: "text-2xl" },
};

/**
 * A circular progress-ring score badge: a tier-tinted glass disc, a bright
 * progress ring, a soft tier-colored glow and a glowing centered number. It's
 * meant to read as a small jewel that pops off poster art — legible but with
 * some depth and life, not a flat plate.
 */
export function ScoreBadge({ score, size = "md", plate = true, className }: ScoreBadgeProps) {
  const tier = tierForScore(score);
  const perfect = isPerfect(score);
  const dim = SIZES[size];
  const r = (dim.box - dim.stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = score != null ? Math.max(0, Math.min(1, score / 10)) : 0;
  // A perfect 10 keeps the tier's blue but earns a gold outline ring — never
  // fully gold.
  const color = tier.color;
  const gradId = `sb-${tier.key}-${dim.box}`;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full",
        plate && "backdrop-blur-md",
        className,
      )}
      style={{
        width: dim.box,
        height: dim.box,
        background: plate
          ? `radial-gradient(circle at 50% 32%, ${tier.soft}, rgba(5,7,15,0.82) 78%)`
          : undefined,
        boxShadow: perfect
          ? `inset 0 0 0 1px ${GOLD}80, 0 2px 8px -3px rgba(0,0,0,0.6)`
          : plate
            ? `inset 0 0 0 1px ${color}55, 0 2px 8px -4px rgba(0,0,0,0.55)`
            : `0 1px 4px -2px rgba(0,0,0,0.5)`,
      }}
      title={score != null ? formatScore(score) : "Unrated"}
    >
      <svg
        width={dim.box}
        height={dim.box}
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        <defs>
          {/* a subtle bright→tier gradient gives the ring more life than a flat stroke */}
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.9} />
            <stop offset="45%" stopColor={color} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        {/* faint track ring */}
        <circle
          cx={dim.box / 2}
          cy={dim.box / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth={dim.stroke}
        />
        {/* colored progress ring */}
        <circle
          cx={dim.box / 2}
          cy={dim.box / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={dim.stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{
            transition: "stroke-dashoffset 0.7s cubic-bezier(0.22,1,0.36,1)",
            filter: `drop-shadow(0 0 2px ${color}aa)`,
          }}
        />
      </svg>
      <span
        className={cn("font-bold tabular-nums leading-none", dim.font)}
        style={{
          color: tier.text,
          textShadow: `0 1px 2px rgba(0,0,0,0.6)`,
        }}
      >
        {score != null ? formatScore(score) : "–"}
      </span>
    </div>
  );
}
