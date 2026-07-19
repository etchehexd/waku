"use client";

import { cn } from "@/lib/utils";
import { formatScore } from "@/lib/utils";
import { tierForScore, isPerfect, GOLD } from "@/lib/rating";

interface ScoreBadgeProps {
  /** 0–10 score */
  score?: number | null;
  size?: "sm" | "md" | "lg";
  /**
   * Frosted dark plate behind the number so it stays legible over busy
   * artwork. On by default; turn off when the badge already sits on a quiet
   * surface (dialogs, glass panels).
   */
  plate?: boolean;
  className?: string;
}

const SIZES = {
  sm: { box: 30, font: "text-[12px]" },
  md: { box: 42, font: "text-sm" },
  lg: { box: 72, font: "text-2xl" },
};

/**
 * A quiet, editorial score badge: a flat tier-tinted disc with a thin ring and
 * the number. Deliberately NOT a glowing gradient progress ring — no arc, no
 * bloom, no text glow — so a wall of scores reads calm and typographic rather
 * than shiny. The tier color still conveys quality at a glance.
 */
export function ScoreBadge({ score, size = "md", plate = true, className }: ScoreBadgeProps) {
  const tier = tierForScore(score);
  const perfect = isPerfect(score);
  const dim = SIZES[size];
  const ring = perfect ? GOLD : tier.color;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-full",
        plate && "backdrop-blur-sm",
        className,
      )}
      style={{
        width: dim.box,
        height: dim.box,
        // Plate = a calm dark disc for legibility over art; otherwise a soft
        // tier tint. Either way flat — no radial gradient.
        background: plate ? "rgba(8,11,20,0.7)" : tier.soft,
        boxShadow: `inset 0 0 0 1px ${ring}${perfect ? "cc" : "55"}${
          plate ? ", 0 1px 3px -1px rgba(0,0,0,0.5)" : ""
        }`,
      }}
      title={score != null ? formatScore(score) : "Unrated"}
    >
      <span
        className={cn("font-semibold tabular-nums leading-none", dim.font)}
        style={{ color: tier.text }}
      >
        {score != null ? formatScore(score) : "–"}
      </span>
    </div>
  );
}
