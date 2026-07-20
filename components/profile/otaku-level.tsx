"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Lock, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { OTAKU_RANKS, type OtakuStanding } from "@/lib/otaku";
import { OtakuBadge } from "./otaku-badge";

/**
 * The Otaku rank ladder — the profile's rank showpiece.
 *
 * A big emblem for the current rank with an XP bar to the next, followed by the
 * full ladder of every rank shown with its logo: ranks you've earned are lit,
 * the current one is ringed, and locked ranks sit dim with their unlock count.
 * A filled connector shows how far up the ladder you are.
 */
export function OtakuLadder({ standing }: { standing: OtakuStanding }) {
  const reduce = useReducedMotion();
  const { rank, level, total, next, nextRank, progress, remaining, maxed } = standing;

  // Ladder connector fill: complete segments for cleared ranks, partial for the
  // current one's progress toward the next.
  const seg = OTAKU_RANKS.length - 1;
  const fill = maxed ? 1 : (rank.index + progress) / seg;

  return (
    <section
      className="relative overflow-hidden rounded-4xl p-6 sm:p-7"
      style={{
        background: `radial-gradient(120% 140% at 12% 0%, ${rank.to}22 0%, transparent 55%), rgba(13,19,40,0.55)`,
        boxShadow: `inset 0 0 0 1px ${rank.to}33`,
      }}
    >
      {/* current rank header */}
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
        <OtakuBadge rank={rank} size="xl" glow />

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p
            className="text-[11px] font-bold uppercase tracking-[0.22em]"
            style={{ color: rank.from }}
          >
            Otaku Rank · Level {level}
          </p>
          <h2 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            {rank.name}
          </h2>
          <p className="mt-1 text-sm text-white/55">
            {maxed ? (
              <>You&rsquo;ve reached the summit — {total.toLocaleString()} titles tracked.</>
            ) : (
              <>
                <span className="font-bold tabular-nums text-white">{remaining.toLocaleString()}</span>{" "}
                more {remaining === 1 ? "title" : "titles"} to{" "}
                <span className="font-semibold" style={{ color: nextRank!.from }}>
                  {nextRank!.name}
                </span>
              </>
            )}
          </p>

          {/* XP bar to next rank */}
          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[11px] font-medium tabular-nums text-white/45">
              <span>{total.toLocaleString()} tracked</span>
              <span>{maxed ? "MAX" : next!.toLocaleString()}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${rank.from}, ${nextRank?.from ?? rank.to})` }}
                initial={{ width: reduce ? `${progress * 100}%` : 0 }}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: reduce ? 0 : 1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* the full ladder */}
      <div className="relative mt-8">
        {/* connector track — sits at the badge centre (12px top pad + 20px half-badge) */}
        <div className="absolute left-0 right-0 top-[32px] h-1 rounded-full bg-white/8" aria-hidden />
        <motion.div
          className="absolute left-0 top-[32px] h-1 rounded-full"
          style={{ background: `linear-gradient(90deg, ${OTAKU_RANKS[0].from}, ${rank.from})` }}
          initial={{ width: reduce ? `${fill * 100}%` : 0 }}
          animate={{ width: `${fill * 100}%` }}
          transition={{ duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
          aria-hidden
        />

        {/* pt-3/pb-2 give the badge glow + current-rank ring room so the scroll
            container never clips their tops or the status pips at the bottom */}
        <ol className="no-scrollbar relative flex justify-between gap-1 overflow-x-auto px-0.5 pb-2 pt-3">
          {OTAKU_RANKS.map((r) => {
            const earned = r.index < rank.index || (r.index === rank.index);
            const current = r.index === rank.index;
            const cleared = r.index < rank.index;
            return (
              <li key={r.index} className="flex min-w-[52px] flex-1 flex-col items-center gap-1.5 text-center">
                <span className="relative">
                  <OtakuBadge rank={r} size="md" locked={!earned} glow={current} />
                  {current && (
                    <span
                      className="pointer-events-none absolute -inset-1 rounded-2xl"
                      style={{ boxShadow: `0 0 0 2px ${r.from}` }}
                      aria-hidden
                    />
                  )}
                  {/* status pip */}
                  <span
                    className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-abyss-900 ring-1 ring-white/15"
                  >
                    {cleared ? (
                      <Check className="h-2.5 w-2.5 text-emerald-300" />
                    ) : current ? (
                      <span className="h-1.5 w-1.5 rounded-full" style={{ background: r.from }} />
                    ) : (
                      <Lock className="h-2 w-2 text-white/35" />
                    )}
                  </span>
                </span>
                <span
                  className={cn(
                    "text-[10px] font-bold leading-tight",
                    current ? "text-white" : earned ? "text-white/70" : "text-white/35",
                  )}
                >
                  {r.name}
                </span>
                <span className="text-[9px] font-medium tabular-nums text-white/30">
                  {r.threshold >= 1000 ? `${r.threshold / 1000}k` : r.threshold}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
