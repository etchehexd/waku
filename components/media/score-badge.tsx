"use client";

import { cn, formatScore } from "@/lib/utils";
import { tierForScore, isPerfect, GOLD } from "@/lib/rating";

interface ScoreBadgeProps {
  /** internal 0–10 score, shown to one decimal (e.g. 8.6) */
  score?: number | null;
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * Frosted dark plate behind the numeral so it stays legible over busy
   * artwork. On by default; turn off when it already sits on a quiet surface.
   */
  plate?: boolean;
  className?: string;
}

const SIZES = {
  sm: { text: "text-[13px]", pad: "px-1.5 pb-[3px] pt-0.5", radius: "rounded-md", rule: 2 },
  md: { text: "text-xl", pad: "px-2 pb-1 pt-0.5", radius: "rounded-lg", rule: 2 },
  lg: { text: "text-4xl", pad: "px-3 pb-1.5 pt-1", radius: "rounded-xl", rule: 3 },
  xl: { text: "text-7xl", pad: "px-4 pb-2 pt-1.5", radius: "rounded-2xl", rule: 4 },
};

/**
 * Editorial decimal score: a confident, tier-colored 0–10 number (one decimal)
 * underlined by a thin tier rule — flat and legible, no rounding. The one score
 * mark used across the app.
 */
export function ScoreBadge({ score, size = "md", plate = true, className }: ScoreBadgeProps) {
  const tier = tierForScore(score);
  const perfect = isPerfect(score);
  const dim = SIZES[size];
  const rule = perfect ? GOLD : tier.color;
  const has = score != null;

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center leading-none",
        dim.radius,
        dim.pad,
        plate && "backdrop-blur-sm",
        className,
      )}
      style={{
        background: plate ? "rgba(8,11,20,0.68)" : "transparent",
        boxShadow: plate ? "0 1px 3px -1px rgba(0,0,0,0.5)" : undefined,
      }}
      title={has ? `${formatScore(score)} / 10` : "Unrated"}
    >
      <span
        className={cn("font-black tabular-nums tracking-tight", dim.text)}
        style={{
          color: has ? tier.text : "rgba(255,255,255,0.4)",
          borderBottom: `${dim.rule}px solid ${has ? rule : "rgba(255,255,255,0.2)"}`,
          paddingBottom: "1px",
        }}
      >
        {has ? formatScore(score) : "–"}
      </span>
    </div>
  );
}
