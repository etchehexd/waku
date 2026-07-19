"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, TrendingUp, TrendingDown, Minus, Swords, Users, Trophy, Layers, Heart, RotateCcw,
} from "lucide-react";
import { useWaku, rankStatsFor, STATUS_LABEL, type LibraryEntry } from "@/lib/store";
import { STATUS_META } from "@/components/media/status-meta";
import { tierForScore, isPerfect, GOLD } from "@/lib/rating";
import { headToHead, communityDelta } from "@/lib/ranking-stats";
import { formatScore, cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onClose: () => void;
  entry: LibraryEntry;
  /** live overall rank across all rated titles */
  rank: number;
  total: number;
  /** rank within the title's own media category */
  categoryRank: number;
  categoryTotal: number;
  categoryLabel: string;
}

export function RankStatsDialog({
  open, onClose, entry, rank, total, categoryRank, categoryTotal, categoryLabel,
}: Props) {
  const comparisons = useWaku((s) => s.comparisons);
  const history = useWaku((s) => s.rankHistory[entry.media.id]);
  const stats = rankStatsFor(history);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const tier = tierForScore(entry.score);
  const perfect = isPerfect(entry.score);
  const accent = perfect ? GOLD : tier.color;
  const current = stats.current ?? rank;
  const peak = stats.peak ?? rank;
  const lowest = stats.lowest ?? rank;
  const percentile = total > 0 ? Math.max(1, Math.round((rank / total) * 100)) : 100;
  const h2h = headToHead(entry.media.id, comparisons);
  const delta = communityDelta(entry);
  const meta = STATUS_META[entry.status];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Ranking stats for ${entry.media.title}`}
        >
          <div className="absolute inset-0 bg-abyss-950/70 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            className="glass-menu relative z-10 max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-4xl"
          >
            {/* header — cover + title + score, tinted by the title's tier */}
            <div className="relative overflow-hidden rounded-t-4xl p-5 pb-4">
              <div
                className="pointer-events-none absolute inset-0 opacity-60"
                style={{ background: `radial-gradient(120% 120% at 100% 0%, ${accent}2e, transparent 60%)` }}
                aria-hidden
              />
              <button
                ref={closeRef}
                onClick={onClose}
                className="absolute right-4 top-4 z-10 rounded-full bg-white/5 p-1 text-white/50 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="relative flex items-center gap-3.5">
                <div className="relative aspect-[2/3] w-16 shrink-0 overflow-hidden rounded-xl bg-abyss-700 ring-1 ring-white/10">
                  {entry.media.cover && (
                    <Image src={entry.media.cover} alt="" fill sizes="64px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1 pr-6">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.15em]" style={{ color: accent }}>
                    Rank #{current}
                  </p>
                  <h3 className="line-clamp-2 font-display text-lg font-bold leading-tight text-white">
                    {entry.media.title}
                  </h3>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-2xl font-black tabular-nums leading-none" style={{ color: accent }}>
                      {formatScore(entry.score)}
                    </span>
                    <span className="text-xs text-white/45">{tier.label}</span>
                    {entry.favorite && <Heart className="h-3.5 w-3.5 fill-current text-[#ff5b8f]" />}
                    {entry.rewatches > 0 && (
                      <span className="flex items-center gap-0.5 text-[11px] text-white/45">
                        <RotateCcw className="h-3 w-3" />{entry.rewatches}×
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 pt-1">
              {/* rank tiles */}
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Overall" value={`#${current}`} sub={`of ${total}`} />
                <Stat label="Peak" value={`#${peak}`} accent="#6ee7a8" />
                <Stat label="Percentile" value={`Top ${percentile}%`} />
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <Stat
                  label={`In ${categoryLabel}`}
                  value={`#${categoryRank}`}
                  sub={`of ${categoryTotal}`}
                  icon={<Layers className="h-3 w-3" />}
                />
                <Stat
                  label="Lowest seen"
                  value={`#${lowest}`}
                  icon={<Trophy className="h-3 w-3" />}
                />
              </div>

              {/* head-to-head — the signature, comparison-engine stat */}
              <div className="mt-3 rounded-2xl bg-white/[0.04] p-4 ring-1 ring-inset ring-white/8">
                <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                  <Swords className="h-3.5 w-3.5 text-iris-300" /> Head to head
                </p>
                {h2h.total > 0 ? (
                  <>
                    <div className="flex items-end gap-3">
                      <span className="font-display text-2xl font-black tabular-nums text-white">
                        {h2h.wins}<span className="text-white/30">–</span>{h2h.losses}
                      </span>
                      <span className="pb-1 text-xs text-white/50">
                        {Math.round((h2h.winRate ?? 0) * 100)}% win rate · {h2h.total} matchup{h2h.total === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-rose-500/25">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
                        style={{ width: `${(h2h.winRate ?? 0) * 100}%` }}
                      />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-white/55">
                    No matchups yet — rate more titles to pit this one against your favorites.
                  </p>
                )}
              </div>

              {/* vs community + movement */}
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-inset ring-white/8">
                  <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                    <Users className="h-3 w-3" /> vs Community
                  </p>
                  {delta != null ? (
                    <p className="text-lg font-bold tabular-nums" style={{ color: delta >= 0 ? "#6ee7a8" : "#f6a8b1" }}>
                      {delta >= 0 ? "+" : ""}{delta.toFixed(1)}
                      <span className="ml-1 text-[11px] font-medium text-white/40">
                        {delta >= 0.3 ? "higher" : delta <= -0.3 ? "lower" : "in tune"}
                      </span>
                    </p>
                  ) : (
                    <p className="text-sm text-white/45">No community score</p>
                  )}
                </div>
                <div className="rounded-2xl bg-white/[0.04] p-3.5 ring-1 ring-inset ring-white/8">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">Movement</p>
                  {stats.hasHistory && stats.change != null ? (
                    <MovementRow change={stats.change} />
                  ) : (
                    <p className="flex items-center gap-1 text-sm text-white/55">
                      <Minus className="h-4 w-4" /> New
                    </p>
                  )}
                </div>
              </div>

              {/* status + trend */}
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold"
                  style={{ background: meta.soft, color: meta.color }}
                >
                  <meta.icon className="h-3 w-3" /> {STATUS_LABEL[entry.status]}
                </span>
                {entry.media.seasonYear && (
                  <span className="text-[11px] text-white/40">{entry.media.seasonYear}</span>
                )}
              </div>

              {stats.history.length > 1 && <Sparkline history={stats.history} accent={accent} />}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({
  label, value, sub, accent, icon,
}: {
  label: string; value: string; sub?: string; accent?: string; icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.04] p-3 text-center ring-1 ring-inset ring-white/8">
      <p className="flex items-center justify-center gap-1 text-[10px] font-medium uppercase tracking-wider text-white/40">
        {icon}{label}
      </p>
      <p className="mt-1 text-lg font-bold tabular-nums text-white" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {sub && <p className="text-[10px] text-white/35">{sub}</p>}
    </div>
  );
}

function MovementRow({ change }: { change: number }) {
  if (change === 0) {
    return (
      <p className="flex items-center gap-1 text-sm text-white/70">
        <Minus className="h-4 w-4" /> Steady
      </p>
    );
  }
  const up = change > 0;
  return (
    <p className={cn("flex items-center gap-1 text-lg font-bold tabular-nums", up ? "text-emerald-300" : "text-rose-300")}>
      {up ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
      {Math.abs(change)}
      <span className="text-[11px] font-medium text-white/40">{up ? "up" : "down"}</span>
    </p>
  );
}

function Sparkline({ history, accent }: { history: { rank: number }[]; accent: string }) {
  const ranks = history.map((h) => h.rank);
  const min = Math.min(...ranks);
  const max = Math.max(...ranks);
  const range = Math.max(1, max - min);
  const w = 100;
  const h = 30;
  const pts = ranks.map((r, i) => {
    const x = ranks.length === 1 ? 0 : (i / (ranks.length - 1)) * w;
    const y = ((r - min) / range) * h; // lower rank number = higher on chart
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return (
    <div className="mt-3">
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">Rank trend</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-full" preserveAspectRatio="none" aria-hidden>
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke={accent}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}
