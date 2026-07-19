"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OtakuLevelData {
  /** 1-based level number. */
  level: number;
  /** Name of the current tier (e.g. "Connoisseur"). */
  name: string;
  /** Titles tracked so far. */
  total: number;
  /** Threshold reached for the current level. */
  floor: number;
  /** Next level's threshold, or null at max level. */
  next: number | null;
  /** 0–1 progress toward the next level. */
  progress: number;
}

/**
 * The Otaku Level showpiece — a glowing medallion with a progress ring, the
 * tier name, and an XP-style bar toward the next rank. Purely presentational:
 * it takes a computed {@link OtakuLevelData} so the leveling logic stays in one
 * place (the profile page) and this can be reused or reconnected freely.
 */
export function OtakuLevel({ data }: { data: OtakuLevelData }) {
  const reduce = useReducedMotion();
  const { level, name, total, next, progress } = data;
  const maxed = next == null;

  // ring geometry
  const box = 116;
  const stroke = 8;
  const r = (box - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = maxed ? 1 : progress;

  return (
    <section className="glass glass-sheen relative overflow-hidden rounded-4xl p-6 sm:p-7">
      {/* ambient aurora */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-iris-500/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 left-1/3 h-48 w-48 rounded-full bg-waku-500/15 blur-3xl" />

      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:gap-7">
        {/* medallion */}
        <div className="relative shrink-0" style={{ width: box, height: box }}>
          <svg width={box} height={box} className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx={box / 2} cy={box / 2} r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
            <motion.circle
              cx={box / 2}
              cy={box / 2}
              r={r}
              fill="none"
              stroke="url(#otaku-grad)"
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              initial={{ strokeDashoffset: reduce ? c * (1 - pct) : c }}
              animate={{ strokeDashoffset: c * (1 - pct) }}
              transition={{ duration: reduce ? 0 : 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
            <defs>
              <linearGradient id="otaku-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#9a83ff" />
                <stop offset="100%" stopColor="#6ea8ff" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">Level</span>
            <span className="font-display text-4xl font-bold leading-none text-white [text-shadow:0_2px_12px_rgba(110,168,255,0.5)]">
              {level}
            </span>
          </div>
        </div>

        {/* text + bar */}
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-iris-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-iris-300 ring-1 ring-inset ring-iris-400/30">
            <Sparkles className="h-3 w-3" /> Otaku Rank
          </span>
          <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">{name}</h2>
          <p className="mt-1 text-sm text-white/50">
            {maxed ? (
              <>You&rsquo;ve reached the summit — {total.toLocaleString()} titles tracked.</>
            ) : (
              <>
                <span className="font-semibold tabular-nums text-white/80">{(next - total).toLocaleString()}</span>{" "}
                more {next - total === 1 ? "title" : "titles"} to Level {level + 1}
              </>
            )}
          </p>

          <div className="mt-4">
            <div className="mb-1 flex items-center justify-between text-[11px] tabular-nums text-white/45">
              <span>{total.toLocaleString()} tracked</span>
              <span>{maxed ? "MAX" : next.toLocaleString()}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className={cn(
                  "h-full rounded-full bg-gradient-to-r from-iris-400 to-waku-cinematic",
                  "shadow-[0_0_12px_rgba(110,168,255,0.6)]",
                )}
                initial={{ width: reduce ? `${pct * 100}%` : 0 }}
                animate={{ width: `${pct * 100}%` }}
                transition={{ duration: reduce ? 0 : 1, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
