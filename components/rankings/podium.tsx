"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { BarChart3, Swords, Users } from "lucide-react";
import type { LibraryEntry } from "@/lib/store";
import type { Comparison } from "@/lib/smart-rating";
import { tierForScore, isPerfect, GOLD } from "@/lib/rating";
import { headToHead, communityDelta } from "@/lib/ranking-stats";
import { formatScore, cn } from "@/lib/utils";

/**
 * The top three — an editorial, typography-led treatment.
 *
 * No trophies, crowns or medals: rank is expressed through oversized numerals,
 * card scale and each title's own score-tier color, so the podium reads as a
 * confident magazine spread rather than a stock-icon leaderboard. #1 gets a
 * wide feature card with inline matchup + community stats; #2 and #3 sit beneath
 * it as a pair.
 */
export function TopThree({
  entries,
  comparisons,
  onStats,
}: {
  entries: LibraryEntry[];
  comparisons: Comparison[];
  onStats: (e: LibraryEntry) => void;
}) {
  const [first, second, third] = entries;
  return (
    <div className="flex flex-col gap-2.5">
      {first && <FeatureCard entry={first} comparisons={comparisons} onStats={onStats} />}
      {(second || third) && (
        <div className="grid grid-cols-2 gap-2.5">
          {second && <RunnerCard entry={second} place={2} onStats={onStats} />}
          {third && <RunnerCard entry={third} place={3} onStats={onStats} />}
        </div>
      )}
    </div>
  );
}

/** The #1 feature — wide, with a giant numeral and inline signature stats. */
function FeatureCard({
  entry,
  comparisons,
  onStats,
}: {
  entry: LibraryEntry;
  comparisons: Comparison[];
  onStats: (e: LibraryEntry) => void;
}) {
  const tier = tierForScore(entry.score);
  const perfect = isPerfect(entry.score);
  const accent = perfect ? GOLD : tier.color;
  const h2h = headToHead(entry.media.id, comparisons);
  const delta = communityDelta(entry);

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group glass relative overflow-hidden rounded-3xl"
      style={{ boxShadow: `inset 0 0 0 1.5px ${accent}40, 0 20px 50px -28px ${accent}80` }}
    >
      {/* warm ambient wash pulled toward the winner's accent */}
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{ background: `radial-gradient(120% 130% at 88% -10%, ${accent}22, transparent 55%)` }}
        aria-hidden
      />
      {/* oversized rank numeral */}
      <span
        className="pointer-events-none absolute -right-3 -top-8 select-none font-display text-[9rem] font-black leading-none tracking-tighter sm:text-[11rem]"
        style={{ color: accent, opacity: 0.12 }}
        aria-hidden
      >
        1
      </span>

      <div className="relative flex items-center gap-4 p-3.5 sm:p-4">
        <Link
          href={`/media/${entry.media.id}`}
          className="relative aspect-[2/3] w-24 shrink-0 overflow-hidden rounded-xl bg-abyss-700 outline-none ring-1 ring-white/10 focus-visible:ring-2 focus-visible:ring-waku-400 sm:w-28"
          aria-label={`Rank 1: ${entry.media.title}`}
        >
          {entry.media.cover && (
            <Image
              src={entry.media.cover}
              alt=""
              fill
              sizes="112px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundColor: entry.media.color || "#0c1122" }}
            />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em]"
              style={{ background: `${accent}22`, color: accent, boxShadow: `inset 0 0 0 1px ${accent}55` }}
            >
              Your #1
            </span>
            {perfect && (
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-abyss-950" style={{ background: GOLD }}>
                Perfect
              </span>
            )}
          </div>

          <Link href={`/media/${entry.media.id}`} className="mt-1.5 block outline-none">
            <h3 className="line-clamp-1 font-display text-lg font-bold text-white transition-colors group-hover:text-waku-cinematic sm:text-xl">
              {entry.media.title}
            </h3>
          </Link>

          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-3xl font-black tabular-nums leading-none" style={{ color: accent }}>
              {formatScore(entry.score)}
            </span>
            <span className="text-xs font-medium text-white/45">{tier.label}</span>
          </div>

          {/* signature stats — matchups + how you sit vs the crowd */}
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
            {h2h.total > 0 && (
              <MiniStat icon={<Swords className="h-3 w-3" />}>
                {h2h.wins}–{h2h.losses}
                <span className="ml-1 text-white/40">matchups</span>
              </MiniStat>
            )}
            {delta != null && (
              <MiniStat icon={<Users className="h-3 w-3" />}>
                <span style={{ color: delta >= 0 ? "#6ee7a8" : "#f6a8b1" }}>
                  {delta >= 0 ? "+" : ""}{delta.toFixed(1)}
                </span>
                <span className="ml-1 text-white/40">vs crowd</span>
              </MiniStat>
            )}
            <button
              type="button"
              onClick={() => onStats(entry)}
              className="ml-auto flex h-7 items-center gap-1 rounded-full bg-white/5 px-2.5 text-[11px] font-medium text-white/60 outline-none ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
            >
              <BarChart3 className="h-3 w-3" /> Stats
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

/** #2 / #3 — compact cards, still numeral-led. */
function RunnerCard({
  entry,
  place,
  onStats,
}: {
  entry: LibraryEntry;
  place: number;
  onStats: (e: LibraryEntry) => void;
}) {
  const tier = tierForScore(entry.score);
  const perfect = isPerfect(entry.score);
  const accent = perfect ? GOLD : tier.color;

  return (
    <motion.article
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: place * 0.05, ease: [0.22, 1, 0.36, 1] }}
      className="group glass relative overflow-hidden rounded-2xl"
      style={{ boxShadow: `inset 0 0 0 1px ${accent}33` }}
    >
      <span
        className="pointer-events-none absolute -right-2 -top-6 select-none font-display text-[6rem] font-black leading-none tracking-tighter"
        style={{ color: accent, opacity: 0.1 }}
        aria-hidden
      >
        {place}
      </span>

      <div className="relative flex items-center gap-2.5 p-2.5">
        <Link
          href={`/media/${entry.media.id}`}
          className="relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-lg bg-abyss-700 outline-none ring-1 ring-white/10 focus-visible:ring-2 focus-visible:ring-waku-400 sm:w-14"
          aria-label={`Rank ${place}: ${entry.media.title}`}
        >
          {entry.media.cover && (
            <Image
              src={entry.media.cover}
              alt=""
              fill
              sizes="56px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundColor: entry.media.color || "#0c1122" }}
            />
          )}
        </Link>

        <div className="min-w-0 flex-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em]" style={{ color: accent }}>
            #{place}
          </span>
          <Link href={`/media/${entry.media.id}`} className="block outline-none">
            <h3 className="line-clamp-1 text-[13px] font-semibold text-white transition-colors group-hover:text-waku-cinematic">
              {entry.media.title}
            </h3>
          </Link>
          <div className="mt-0.5 flex items-center justify-between">
            <span className="font-display text-xl font-black tabular-nums leading-none" style={{ color: accent }}>
              {formatScore(entry.score)}
            </span>
            <button
              type="button"
              onClick={() => onStats(entry)}
              aria-label={`Ranking stats for ${entry.media.title}`}
              className="flex h-6 w-6 items-center justify-center rounded-full text-white/40 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
            >
              <BarChart3 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function MiniStat({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-1 text-[11px] font-semibold tabular-nums text-white/75 ring-1 ring-inset ring-white/10">
      <span className="text-white/50">{icon}</span>
      {children}
    </span>
  );
}
