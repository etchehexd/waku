"use client";

import { tierForScore, isPerfect, GOLD } from "@/lib/rating";
import { cn, formatCount } from "@/lib/utils";

/** How many bars make up the meter. Finer than 10 so 8.6 reads precisely. */
const SEGMENTS = 24;

/**
 * COMMUNITY SCORE — a "level meter" rating mark, not a badge or stars.
 *
 * The exact community average is shown to one decimal (8.6, never rounded to 9)
 * beside an equalizer-style bar of {@link SEGMENTS} segments filled to the true
 * proportion of the score. The leading (partial) segment is dimmed to represent
 * the fractional part, so the meter and the numeral always agree. The whole mark
 * is tier-colored and captioned with the verdict word + community size — a look
 * no other tracker uses.
 */
export function CommunityScore({
  score,
  votes,
  size = "lg",
  align = "center",
  className,
}: {
  /** internal 0–10 decimal community score (AniList averageScore ÷ 10) */
  score: number | null;
  /** community size (AniList popularity) for the caption line */
  votes?: number | null;
  size?: "md" | "lg";
  align?: "center" | "left";
  className?: string;
}) {
  const has = score != null;
  const tier = tierForScore(score);
  const perfect = isPerfect(score);
  const color = perfect ? GOLD : tier.color;
  const filled = has ? (score / 10) * SEGMENTS : 0;

  const numCls = size === "lg" ? "text-[3.25rem] sm:text-6xl" : "text-4xl";
  const barH = size === "lg" ? "h-9 sm:h-11" : "h-8";

  return (
    <div
      className={cn(
        "flex items-center gap-4 sm:gap-5",
        align === "center" && "justify-center",
        className,
      )}
    >
      {/* the numeral */}
      <div className="shrink-0 leading-none text-left">
        <div className="flex items-baseline gap-1">
          <span
            className={cn("font-black tabular-nums tracking-tight", numCls)}
            style={{ color: has ? tier.text : "rgba(255,255,255,0.4)" }}
          >
            {has ? score!.toFixed(1) : "–"}
          </span>
          <span className="text-sm font-bold text-white/30">/10</span>
        </div>
        <span
          className="mt-1 block text-[10px] font-black uppercase tracking-[0.22em]"
          style={{ color: has ? color : "rgba(255,255,255,0.35)" }}
        >
          {has ? tier.label : "Unrated"}
        </span>
      </div>

      {/* the meter + caption */}
      <div className="min-w-0 flex-1">
        <div className={cn("flex items-end gap-[3px]", barH)} aria-hidden>
          {Array.from({ length: SEGMENTS }).map((_, i) => {
            const coverage = Math.max(0, Math.min(1, filled - i));
            const on = coverage > 0;
            // Bars rise gently toward the middle for a soundwave silhouette.
            const wave = 0.62 + 0.38 * Math.sin((i / (SEGMENTS - 1)) * Math.PI);
            return (
              <span
                key={i}
                className="flex-1 rounded-full transition-colors"
                style={{
                  height: `${wave * 100}%`,
                  background: on ? color : "rgba(255,255,255,0.08)",
                  opacity: on ? 0.35 + 0.65 * coverage : 1,
                  boxShadow:
                    coverage > 0 && coverage < 1
                      ? `0 0 8px ${color}` // glow on the leading edge
                      : undefined,
                }}
              />
            );
          })}
        </div>
        <p
          className={cn(
            "mt-2 text-[11px] font-semibold text-white/45",
            align === "center" && "text-center",
          )}
        >
          <span className="uppercase tracking-[0.16em] text-white/35">Community</span>
          {votes != null && votes > 0 && (
            <>
              {" · "}
              <span className="tabular-nums text-white/60">{formatCount(votes)}</span> members
            </>
          )}
        </p>
      </div>
    </div>
  );
}
