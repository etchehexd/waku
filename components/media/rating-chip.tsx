"use client";

import { Star } from "lucide-react";
import { tierForScore, isPerfect, GOLD } from "@/lib/rating";
import { cn, formatScore } from "@/lib/utils";

type ChipSize = "xs" | "sm" | "md";

const SIZE: Record<ChipSize, { box: string; icon: string; text: string; gap: string }> = {
  xs: { box: "h-5 px-1.5", icon: "h-2.5 w-2.5", text: "text-[11px]", gap: "gap-1" },
  sm: { box: "h-6 px-2", icon: "h-3 w-3", text: "text-[12px]", gap: "gap-1" },
  md: { box: "h-7 px-2.5", icon: "h-3.5 w-3.5", text: "text-sm", gap: "gap-1.5" },
};

/**
 * Tier-tinted rating pill — a filled star + the 0–10 score (one decimal). The
 * standard way a user's rating shows on library items; unrated entries get a
 * quiet outlined mark rather than a loud placeholder.
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

  if (!rated) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-full font-black tabular-nums text-white/40 ring-1 ring-inset ring-white/12",
          dim.box,
          dim.gap,
          dim.text,
          className,
        )}
        title="Not rated yet"
      >
        <Star className={dim.icon} aria-hidden />
        <span aria-hidden>&ndash;</span>
      </span>
    );
  }

  const tier = tierForScore(score);
  const perfect = isPerfect(score);

  return (
    <span
      className={cn("inline-flex shrink-0 items-center rounded-full font-black tabular-nums", dim.box, dim.gap, dim.text, className)}
      style={{
        background: tier.soft,
        color: tier.text,
        boxShadow: perfect ? `inset 0 0 0 1px ${GOLD}` : `inset 0 0 0 1px ${tier.color}66`,
      }}
      title={`Your rating: ${formatScore(score)} / 10 · ${tier.label}`}
    >
      <Star className={cn(dim.icon, "fill-current")} aria-hidden />
      {formatScore(score)}
    </span>
  );
}
