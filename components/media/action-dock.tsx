"use client";

import { useState } from "react";
import { Plus, Heart, Settings2, Check, Zap } from "lucide-react";
import type { MediaSummary } from "@/lib/anilist/types";
import { useWaku, STATUS_LABEL, type LibraryEntry } from "@/lib/store";
import { STATUS_META } from "./status-meta";
import { useMounted } from "@/lib/use-mounted";
import { useAuthGate } from "@/lib/use-auth-gate";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RatingChip } from "./rating-chip";
import { ProgressStepper } from "./progress-stepper";
import { ActionSheet } from "./action-sheet";

/**
 * The detail page's tracking control, docked to the bottom of the viewport.
 *
 * A single floating glass bar that follows the reader down the page: untracked
 * titles show one unmissable "Add to Library" CTA; tracked titles become a live
 * tracking strip — status, one-tap progress, score, favorite — with everything
 * deeper one tap into the sheet. Sitting at the bottom keeps the primary action
 * in thumb-reach on mobile and always visible without a sticky sidebar.
 */
export function ActionDock({ media }: { media: MediaSummary }) {
  const mounted = useMounted();
  const entry = useWaku((s) => s.entries[media.id]);
  const setProgress = useWaku((s) => s.setProgress);
  const setStatus = useWaku((s) => s.setStatus);
  const toggleFavorite = useWaku((s) => s.toggleFavorite);
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
      {/* Sits above the mobile bottom tab bar (which is fixed at bottom on <md
          and would otherwise cover this dock — the cause of the clipped "Add"
          button on non-maximized laptop windows). On md+ there is no tab bar, so
          the dock returns to the very bottom. */}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.25rem_+_env(safe-area-inset-bottom))] z-40 pt-6 md:bottom-0 md:pb-4">
        {/* fade so page content dissolves under the dock */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-abyss-950 via-abyss-950/80 to-transparent" />
        <div className="container">
          <div className="pointer-events-auto mx-auto max-w-2xl">
            {!mounted ? (
              <div className="glass-chrome h-16 w-full animate-pulse rounded-3xl" />
            ) : gated ? (
              <div className="glass-chrome flex items-center justify-center rounded-3xl p-2.5">
                <Button variant="accent" size="md" className="w-full glow-accent" onClick={() => guard(() => {})}>
                  <Plus className="h-4 w-4" /> Sign in to track &amp; rate
                </Button>
              </div>
            ) : !inList || !entry ? (
              <div className="glass-chrome flex items-center gap-3 rounded-3xl p-2.5">
                <p className="ml-2 hidden min-w-0 flex-1 truncate text-sm font-semibold text-white/70 sm:block">
                  Not in your library yet
                </p>
                <Button
                  variant="accent"
                  size="md"
                  className="w-full glow-accent sm:w-auto sm:px-7"
                  onClick={() => setSheetOpen(true)}
                >
                  <Plus className="h-4 w-4" /> Add to Library
                </Button>
              </div>
            ) : (
              <TrackedDock
                media={media}
                entry={entry}
                total={total}
                unit={unit}
                title={title}
                airedNow={airedNow}
                onOpenSheet={() => setSheetOpen(true)}
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

function TrackedDock({
  media,
  entry,
  total,
  unit,
  title,
  airedNow,
  onOpenSheet,
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
  const behindBy = airedNow != null ? airedNow - entry.progress : 0;
  const showCatchUp = !isCompleted && behindBy > 0;

  return (
    <div className="glass-chrome rounded-3xl p-2.5">
      {/* catch-up nudge sits above the controls when relevant */}
      {showCatchUp && (
        <button
          onClick={onCatchUp}
          className="mb-2 flex w-full items-center gap-2 rounded-2xl bg-white/[0.05] px-3 py-1.5 text-left text-xs outline-none ring-1 ring-inset ring-white/8 transition-colors hover:bg-white/[0.09] focus-visible:ring-2 focus-visible:ring-waku-400"
        >
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full accent-fill">
            <Zap className="h-3 w-3" />
          </span>
          <span className="min-w-0 flex-1 text-white/75">
            <span className="font-semibold text-white">
              {behindBy} new {unit === "EP" ? "episode" : "chapter"}{behindBy > 1 ? "s" : ""}
            </span>{" "}
            aired
          </span>
          <span className="shrink-0 font-semibold text-waku-cinematic">Catch up →</span>
        </button>
      )}

      <div className="flex items-center gap-2">
        {/* status — opens the sheet */}
        <button
          onClick={onOpenSheet}
          className="flex h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm font-semibold outline-none transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-waku-400"
          style={{ background: meta.soft, color: meta.color, boxShadow: `inset 0 0 0 1.5px ${meta.color}66` }}
          aria-label={`Status: ${STATUS_LABEL[entry.status]} — open library options`}
        >
          <StatusIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{STATUS_LABEL[entry.status]}</span>
        </button>

        {/* live progress bar */}
        <div className="hidden min-w-0 flex-1 sm:block">
          <div className="mb-1 flex items-center justify-between text-[11px]">
            <span className="font-medium text-white/45">Progress</span>
            <span className="tabular-nums text-white/70">
              {entry.progress}
              {total ? ` / ${total}` : ""} {unit}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-waku-400 to-waku-600 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <RatingChip score={entry.score} size="md" className="hidden shrink-0 md:inline-flex" />

        {/* mobile: progress bar collapses; keep the controls */}
        <div className="flex-1 sm:hidden" />

        {canComplete ? (
          <Button variant="accent" size="sm" className="glow-accent shrink-0" onClick={onComplete}>
            <Check className="h-4 w-4" /> <span className="hidden sm:inline">Complete</span>
          </Button>
        ) : (
          <ProgressStepper
            value={entry.progress}
            total={total ?? null}
            onChange={onSetProgress}
            size="sm"
            label={title}
          />
        )}

        <button
          onClick={onToggleFavorite}
          aria-pressed={entry.favorite}
          aria-label={entry.favorite ? "Remove from favorites" : "Add to favorites"}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full outline-none ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
            entry.favorite
              ? "bg-[#ff5b8f]/15 text-[#ff5b8f] ring-[#ff5b8f]/40"
              : "text-white/50 ring-white/12 hover:bg-white/8 hover:text-white",
          )}
        >
          <Heart className={cn("h-4 w-4", entry.favorite && "fill-current")} />
        </button>

        <Button variant="glass" size="icon" className="shrink-0" onClick={onOpenSheet} aria-label="Library options">
          <Settings2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
