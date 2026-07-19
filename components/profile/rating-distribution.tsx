"use client";

import { useState } from "react";
import type { Tier } from "@/lib/rating";
import { cn } from "@/lib/utils";

export interface DistributionBucket {
  tier: Tier;
  /** Inclusive score range this bucket covers, e.g. "8–9". */
  range: string;
  count: number;
}

/**
 * Ratings histogram.
 *
 * Each bar's height is a true proportion of the busiest bucket, measured
 * against a fixed-height track — previously the percentage was applied inside
 * an auto-height flex column, so it resolved against a content-sized parent
 * and the bars didn't reflect their counts.
 *
 * The count is intentionally not printed on every bar (it turned the chart
 * into a table). It's revealed on hover, on keyboard focus, and on tap — the
 * bars are real buttons, so touch devices, which have no hover, get the same
 * information. Each bar also carries a full text label for screen readers.
 */
export function RatingDistribution({ buckets }: { buckets: DistributionBucket[] }) {
  const [active, setActive] = useState<string | null>(null);

  const max = Math.max(1, ...buckets.map((b) => b.count));
  const total = buckets.reduce((s, b) => s + b.count, 0);

  if (total === 0) {
    return (
      <p className="flex h-40 items-center justify-center text-center text-sm text-white/40">
        Rate a few titles and your distribution appears here.
      </p>
    );
  }

  return (
    <div className="flex h-40 items-stretch gap-1.5 sm:gap-2">
      {buckets.map((b) => {
        // Proportion of the tallest bucket. Empty buckets keep a hairline so
        // the axis still reads as continuous, but carry no fill.
        const pct = b.count === 0 ? 0 : Math.max(4, (b.count / max) * 100);
        const isActive = active === b.tier.key;
        const label = `${b.range}: ${b.count} ${b.count === 1 ? "title" : "titles"}`;

        return (
          <button
            key={b.tier.key}
            type="button"
            className="group relative flex flex-1 flex-col items-center gap-1.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-waku-400"
            onMouseEnter={() => setActive(b.tier.key)}
            onMouseLeave={() => setActive((k) => (k === b.tier.key ? null : k))}
            onFocus={() => setActive(b.tier.key)}
            onBlur={() => setActive((k) => (k === b.tier.key ? null : k))}
            // Tap toggles on touch, where hover doesn't exist.
            onClick={() => setActive((k) => (k === b.tier.key ? null : b.tier.key))}
            aria-label={label}
          >
            {/* tooltip */}
            <span
              role="tooltip"
              aria-hidden={!isActive}
              className={cn(
                "pointer-events-none absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-lg bg-abyss-900 px-2 py-1 text-[11px] font-semibold text-white ring-1 ring-white/15 transition-opacity duration-150",
                isActive ? "opacity-100" : "opacity-0",
              )}
            >
              {b.count} {b.count === 1 ? "title" : "titles"}
            </span>

            {/* Fixed-height track — the bar's % resolves against THIS.
                Height is plain CSS (not a JS animation) so the bar is always
                truthful about its count even before/without JS; the grow-in is
                a CSS transition and is dropped under reduced motion. */}
            <span className="relative flex h-full w-full items-end justify-center">
              {b.count === 0 ? (
                <span className="h-0.5 w-full rounded-full bg-white/10" aria-hidden />
              ) : (
                <span
                  className="w-full rounded-t-lg transition-[height,opacity,box-shadow] duration-500 ease-out motion-reduce:transition-none"
                  style={{
                    height: `${pct}%`,
                    background: b.tier.color,
                    opacity: isActive ? 1 : 0.85,
                    boxShadow: isActive ? `0 0 18px -4px ${b.tier.color}` : undefined,
                  }}
                  aria-hidden
                />
              )}
            </span>

            <span
              className={cn(
                "text-[9px] tabular-nums tracking-wide transition-colors",
                isActive ? "text-white/80" : "text-white/35",
              )}
              aria-hidden
            >
              {b.range}
            </span>
          </button>
        );
      })}
    </div>
  );
}
