"use client";

import { Star } from "lucide-react";
import { tierForScore, isPerfect, GOLD } from "@/lib/rating";
import { cn, formatScore } from "@/lib/utils";

type ChipSize = "xs" | "sm" | "md";

const SIZE: Record<ChipSize, { box: string; icon: string; text: string; gap: string }> = {
  xs: { box: "h-5 px-1.5", icon: "h-2.5 w-2.5", text: "text-[10px]", gap: "gap-1" },
  sm: { box: "h-6 px-2", icon: "h-3 w-3", text: "text-[11px]", gap: "gap-1" },
  md: { box: "h-7 px-2.5", icon: "h-3.5 w-3.5", text: "text-xs", gap: "gap-1.5" },
};

/**
 * Compact, tier-tinted rating pill — the standard way a user's score is shown
 * on library items. It reads as one integrated object (filled star + number)
 * instead of a bare icon, and borrows its color from the shared rating tiers
 * so a score's quality is legible at a glance without shouting.
 *
 * Unrated entries get a deliberately quiet outlined treatment rather than a
 * loud placeholder — present, but clearly secondary.
 */
export function RatingChip({
  score,
  size = "sm",
  showUnrated = true,
  className,
}: {
  /** 0–10 score, or null/undefined when the title is unrated. */
  score?: number | null;
  size?: ChipSize;
  /** Render a muted "unrated" chip when there's no score. */
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
          "inline-flex shrink-0 items-center rounded-full font-semibold tabular-nums text-white/40 ring-1 ring-inset ring-white/12",
          dim.box,
          dim.gap,
          dim.text,
          className,
        )}
        title="Not rated yet"
      >
        <Star className={dim.icon} aria-hidden />
        <span className="sr-only">Not rated</span>
        <span aria-hidden>&ndash;</span>
      </span>
    );
  }

  const tier = tierForScore(score);
  const perfect = isPerfect(score);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full font-semibold tabular-nums",
        dim.box,
        dim.gap,
        dim.text,
        className,
      )}
      style={{
        background: tier.soft,
        color: tier.text,
        // A hairline in the tier color ties the chip together; a perfect 10
        // earns the same gold outline the score ring uses elsewhere.
        boxShadow: perfect
          ? `inset 0 0 0 1px ${GOLD}, 0 0 8px -2px ${GOLD}`
          : `inset 0 0 0 1px ${tier.color}66`,
      }}
      title={`Your rating: ${formatScore(score)} · ${tier.label}`}
    >
      <Star className={cn(dim.icon, "fill-current")} aria-hidden />
      <span className="sr-only">Your rating:</span>
      {formatScore(score)}
    </span>
  );
}
