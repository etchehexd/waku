"use client";

import { useState } from "react";
import {
  Plus,
  Minus,
  Heart,
  Check,
  Zap,
  Star,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  LogIn,
} from "lucide-react";
import type { MediaSummary } from "@/lib/anilist/types";
import { useWaku, STATUS_LABEL, isRateable, type LibraryEntry } from "@/lib/store";
import { STATUS_META } from "./status-meta";
import { useMounted } from "@/lib/use-mounted";
import { useAuthGate } from "@/lib/use-auth-gate";
import { cn, formatScore } from "@/lib/utils";
import { tierForScore } from "@/lib/rating";
import { ActionSheet } from "./action-sheet";

/**
 * The detail page's tracking control, docked to the bottom of the viewport.
 *
 * Redesigned as a two-zone card: a full-width progress bar rides the top edge,
 * a top row carries the status + quick actions (rate, favorite, more), and a
 * bottom row makes the progress stepper the spread-out hero — the one action
 * people repeat. Untracked and signed-out states are bold single CTAs.
 */
export function ActionDock({ media }: { media: MediaSummary }) {
  const mounted = useMounted();
  const entry = useWaku((s) => s.entries[media.id]);
  const setProgress = useWaku((s) => s.setProgress);
  const setStatus = useWaku((s) => s.setStatus);
  const toggleFavorite = useWaku((s) => s.toggleFavorite);
  const requestRate = useWaku((s) => s.requestRate);
  const { gated, guard } = useAuthGate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const airedFallback =
    media.type === "ANIME" &&
    !media.episodes &&
    media.nextAiringEpisode &&
    media.nextAiringEpisode.episode > 1
      ? media.nextAiringEpisode.episode - 1
      : null;
  const total = media.episodes || media.chapters || airedFallback;
  const unit = media.type === "ANIME" ? "EP" : "CH";
  const inList = mounted && !!entry;
  const title = media.title.english || media.title.romaji || media.title.native || "this title";

  const airedNow =
    media.nextAiringEpisode && media.nextAiringEpisode.episode > 1
      ? media.nextAiringEpisode.episode - 1
      : null;

  return (
    <>
      {/* Sits above the mobile bottom tab bar (fixed at bottom on <md); on md+
          there is no tab bar so the dock returns to the very bottom. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.25rem_+_env(safe-area-inset-bottom))] z-40 pt-6 md:bottom-0 md:pb-4">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-44 bg-gradient-to-t from-abyss-950 via-abyss-950/85 to-transparent" />
        <div className="container">
          <div className="pointer-events-auto mx-auto max-w-2xl">
            {!mounted ? (
              <div className="glass-chrome h-[4.75rem] w-full animate-pulse rounded-[1.75rem]" />
            ) : gated ? (
              <BigCta
                icon={<LogIn className="h-5 w-5" />}
                title="Sign in to track & rate"
                subtitle="Keep your library synced everywhere"
                onClick={() => guard(() => {})}
              />
            ) : !inList || !entry ? (
              <BigCta
                icon={<Plus className="h-5 w-5" />}
                title="Add to Library"
                subtitle="Track progress, rate & rank it"
                onClick={() => setSheetOpen(true)}
              />
            ) : (
              <TrackedDock
                media={media}
                entry={entry}
                total={total}
                unit={unit}
                title={title}
                airedNow={airedNow}
                onOpenSheet={() => setSheetOpen(true)}
                onRate={() => requestRate(media.id)}
                onToggleFavorite={() => toggleFavorite(media.id)}
                onSetProgress={(n) => setProgress(media.id, total ? Math.min(n, total) : Math.max(0, n))}
                onComplete={() => setStatus(media, "COMPLETED")}
                onCatchUp={() => airedNow != null && setProgress(media.id, airedNow)}
              />
            )}
          </div>
        </div>
      </div>

      <ActionSheet media={media} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

/** Bold single call-to-action used for the untracked and signed-out states. */
function BigCta({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <div className="glass-chrome rounded-[1.75rem] p-2">
      <button
        onClick={onClick}
        // Primary accent family only (--wk-h/--wk-s via the `waku` scale) so
        // this CTA always matches the palette chosen in Settings. Emphasis is
        // the fill + a brightness shift on hover — no accent glow.
        className="group flex w-full items-center gap-3 rounded-[1.35rem] bg-gradient-to-r from-waku-500 to-waku-700 px-4 py-3 text-left outline-none ring-1 ring-inset ring-white/12 transition-[filter,transform,box-shadow] hover:brightness-110 hover:ring-white/25 focus-visible:ring-2 focus-visible:ring-white/70 active:scale-[0.99]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-white">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-extrabold leading-tight text-white">{title}</span>
          <span className="block truncate text-xs font-medium text-white/75">{subtitle}</span>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-white/80 transition-transform group-hover:translate-x-0.5" />
      </button>
    </div>
  );
}

function TrackedDock({
  media,
  entry,
  total,
  unit,
  title,
  airedNow,
  onOpenSheet,
  onRate,
  onToggleFavorite,
  onSetProgress,
  onComplete,
  onCatchUp,
}: {
  media: MediaSummary;
  entry: LibraryEntry;
  total: number | null;
  unit: string;
  title: string;
  airedNow: number | null;
  onOpenSheet: () => void;
  onRate: () => void;
  onToggleFavorite: () => void;
  onSetProgress: (n: number) => void;
  onComplete: () => void;
  onCatchUp: () => void;
}) {
  const meta = STATUS_META[entry.status];
  const StatusIcon = meta.icon;
  const pct = total ? Math.min(100, (entry.progress / total) * 100) : entry.progress > 0 ? 100 : 0;
  const atMax = total != null && entry.progress >= total;
  const isCompleted = entry.status === "COMPLETED";
  const canComplete = atMax && !isCompleted;
  const canRate = isRateable(entry); // @see isRateable
  const behindBy = airedNow != null ? airedNow - entry.progress : 0;
  const showCatchUp = !isCompleted && behindBy > 0;
  const scoreTier = entry.score != null ? tierForScore(entry.score) : null;

  return (
    <div className="glass-chrome overflow-hidden rounded-[1.75rem]">
      {/* progress bar — rides the top edge, tinted by status */}
      <div className="h-1.5 w-full bg-white/[0.08]">
        <div
          className="h-full transition-[width] duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${meta.color}bb, ${meta.color})` }}
        />
      </div>

      <div className="space-y-2.5 p-2.5 sm:p-3">
        {/* catch-up nudge */}
        {showCatchUp && (
          <button
            onClick={onCatchUp}
            className="flex w-full items-center gap-2 rounded-2xl bg-white/[0.05] px-3 py-1.5 text-left text-xs outline-none ring-1 ring-inset ring-white/8 transition-colors hover:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-waku-400"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full accent-fill">
              <Zap className="h-3 w-3" />
            </span>
            <span className="min-w-0 flex-1 text-white/75">
              <span className="font-semibold text-white">
                {behindBy} new {unit === "EP" ? "episode" : "chapter"}
                {behindBy > 1 ? "s" : ""}
              </span>{" "}
              aired
            </span>
            <span className="shrink-0 font-semibold text-waku-cinematic">Catch up →</span>
          </button>
        )}

        {/* row 1 — status + quick actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSheet}
            aria-label={`Status: ${STATUS_LABEL[entry.status]} — change`}
            className="flex h-10 shrink-0 items-center gap-1.5 rounded-full pl-3 pr-2.5 text-sm font-bold outline-none transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-waku-400"
            style={{ background: meta.soft, color: meta.color, boxShadow: `inset 0 0 0 1.5px ${meta.color}66` }}
          >
            <StatusIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{STATUS_LABEL[entry.status]}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-70" />
          </button>

          <div className="flex-1" />

          {canRate && (
            <button
              onClick={onRate}
              aria-label={entry.score != null ? `Your rating ${formatScore(entry.score)} — re-rate` : "Rate this title"}
              className={cn(
                "flex h-10 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm font-black tabular-nums outline-none transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-waku-400",
                !scoreTier && "text-white/70 ring-1 ring-inset ring-white/15 hover:text-white",
              )}
              style={
                scoreTier
                  ? { background: scoreTier.soft, color: scoreTier.text, boxShadow: `inset 0 0 0 1.5px ${scoreTier.color}66` }
                  : undefined
              }
            >
              <Star className={cn("h-4 w-4", scoreTier && "fill-current")} />
              {entry.score != null ? formatScore(entry.score) : <span className="font-bold">Rate</span>}
            </button>
          )}

          <button
            onClick={onToggleFavorite}
            aria-pressed={entry.favorite}
            aria-label={entry.favorite ? "Remove from favorites" : "Add to favorites"}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-full outline-none ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
              entry.favorite
                ? "bg-[#ff5b8f]/15 text-[#ff5b8f] ring-[#ff5b8f]/40"
                : "text-white/55 ring-white/12 hover:bg-white/8 hover:text-white",
            )}
          >
            <Heart className={cn("h-4 w-4", entry.favorite && "fill-current")} />
          </button>

          <button
            onClick={onOpenSheet}
            aria-label="More library options"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white/55 outline-none ring-1 ring-inset ring-white/12 transition-colors hover:bg-white/8 hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* row 2 — the progress control (the hero action) */}
        {canComplete ? (
          <button
            onClick={onComplete}
            aria-label={`Mark ${title} completed`}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-[15px] font-extrabold text-white outline-none transition-[filter,transform] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-emerald-300 active:scale-[0.99]"
          >
            <Check className="h-5 w-5" /> Mark as complete
          </button>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl bg-abyss-950/40 p-1.5 ring-1 ring-inset ring-white/[0.06]">
            <StepButton
              kind="minus"
              disabled={entry.progress <= 0}
              onClick={() => onSetProgress(entry.progress - 1)}
              label={`Decrease ${unit === "EP" ? "episode" : "chapter"} count for ${title}`}
            />
            <div className="min-w-0 flex-1 text-center leading-none">
              <span className="font-display text-xl font-extrabold tabular-nums text-white">
                {entry.progress}
                {total != null && <span className="font-bold text-white/35"> / {total}</span>}
              </span>
              <span className="ml-1.5 text-[11px] font-bold uppercase tracking-wide text-white/40">{unit}</span>
            </div>
            <StepButton
              kind="plus"
              disabled={atMax}
              onClick={() => onSetProgress(entry.progress + 1)}
              label={atMax ? `${title} complete` : `Increase ${unit === "EP" ? "episode" : "chapter"} count for ${title}`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/** Big, tactile stepper button — accent-filled for the "+", quiet for the "−". */
function StepButton({
  kind,
  disabled,
  onClick,
  label,
}: {
  kind: "plus" | "minus";
  disabled?: boolean;
  onClick: () => void;
  label: string;
}) {
  const plus = kind === "plus";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex h-11 w-14 shrink-0 items-center justify-center rounded-xl outline-none transition-all focus-visible:ring-2 focus-visible:ring-waku-400 disabled:cursor-not-allowed disabled:opacity-35",
        plus
          ? "bg-gradient-to-br from-waku-500 to-waku-700 text-white shadow-glow ring-1 ring-inset ring-white/10 hover:brightness-110 hover:ring-white/20 active:scale-95 disabled:from-white/10 disabled:to-white/10 disabled:text-white/40 disabled:shadow-none disabled:ring-transparent"
          : "bg-white/[0.06] text-white/80 ring-1 ring-inset ring-white/10 hover:bg-white/[0.12] hover:text-white active:scale-95",
      )}
    >
      {plus ? <Plus className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
    </button>
  );
}
