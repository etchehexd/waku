"use client";

import { cn } from "@/lib/utils";
import { tierForScore, isPerfect, GOLD } from "@/lib/rating";

interface ScoreBadgeProps {
  /** internal 0–10 score (resolved to a letter grade) */
  score?: number | null;
  size?: "sm" | "md" | "lg" | "xl";
  /**
   * Frosted dark plate behind the mark so it stays legible over busy artwork.
   * On by default; turn off when it already sits on a quiet surface.
   */
  plate?: boolean;
  className?: string;
}

const SIZES = {
  sm: { text: "text-[15px]", box: "h-6 w-6", radius: "rounded-md" },
  md: { text: "text-xl", box: "h-8 w-8", radius: "rounded-lg" },
  lg: { text: "text-4xl", box: "h-14 w-14", radius: "rounded-xl" },
  xl: { text: "text-7xl", box: "h-24 w-24", radius: "rounded-2xl" },
};

/**
 * The verdict-grade mark — a bold letter (S…F) tinted by its tier, in a
 * tier-colored plate. This is the one rating display used across the app; the
 * underlying 0–10 score is resolved to its grade so the number never shows.
 */
export function ScoreBadge({ score, size = "md", plate = true, className }: ScoreBadgeProps) {
  const tier = tierForScore(score);
  const perfect = isPerfect(score);
  const dim = SIZES[size];
  const has = score != null;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-black leading-none tracking-tight",
        dim.box,
        dim.radius,
        className,
      )}
      style={{
        background: has ? tier.soft : "rgba(255,255,255,0.05)",
        color: has ? tier.text : "rgba(255,255,255,0.4)",
        boxShadow: perfect
          ? `inset 0 0 0 1.5px ${GOLD}`
          : `inset 0 0 0 1.5px ${has ? tier.color : "rgba(255,255,255,0.15)"}`,
        backdropFilter: plate ? "blur(4px)" : undefined,
      }}
      title={has ? `${tier.grade} · ${tier.label}` : "Unrated"}
    >
      <span className={dim.text}>{tier.grade}</span>
    </span>
  );
}
