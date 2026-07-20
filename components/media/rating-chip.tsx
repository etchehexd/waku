"use client";

import { tierForScore, isPerfect, GOLD } from "@/lib/rating";
import { cn } from "@/lib/utils";

type ChipSize = "xs" | "sm" | "md";

const SIZE: Record<ChipSize, { box: string; grade: string; label: string }> = {
  xs: { box: "h-5 px-1.5 gap-1", grade: "text-[11px]", label: "text-[10px]" },
  sm: { box: "h-6 px-2 gap-1", grade: "text-[13px]", label: "text-[11px]" },
  md: { box: "h-7 px-2.5 gap-1.5", grade: "text-sm", label: "text-xs" },
};

/**
 * Tier-tinted verdict-grade pill — the standard way a user's rating shows on
 * library items. Reads as one object: the letter grade plus (at md) its word.
 * Unrated entries get a quiet outlined mark rather than a loud placeholder.
 */
export function RatingChip({
  score,
  size = "sm",
  showUnrated = true,
  className,
}: {
  /** internal 0–10 score, or null/undefined when unrated */
  score?: number | null;
  size?: ChipSize;
  showUnrated?: boolean;
  className?: string;
}) {
  const dim = SIZE[size];
  const rated = score != null;

  if (!rated && !showUnrated) return null;

  const tier = tierForScore(score);
  const perfect = isPerfect(score);

  if (!rated) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-full font-black text-white/40 ring-1 ring-inset ring-white/12",
          dim.box,
          className,
        )}
        title="Not rated yet"
      >
        <span className={dim.grade}>–</span>
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex shrink-0 items-center rounded-full", dim.box, className)}
      style={{
        background: tier.soft,
        color: tier.text,
        boxShadow: perfect ? `inset 0 0 0 1px ${GOLD}` : `inset 0 0 0 1px ${tier.color}66`,
      }}
      title={`Your rating: ${tier.grade} · ${tier.label}`}
    >
      <span className={cn("font-black leading-none", dim.grade)}>{tier.grade}</span>
      {size === "md" && <span className={cn("font-bold", dim.label)}>{tier.label}</span>}
    </span>
  );
}
