"use client";

import { useState } from "react";
import { Plus, Heart, Settings2, Library as LibraryIcon, Check, Zap } from "lucide-react";
import type { MediaSummary } from "@/lib/anilist/types";
import { useWaku, STATUS_LABEL } from "@/lib/store";
import { STATUS_META } from "./status-meta";
import { useMounted } from "@/lib/use-mounted";
import { useAuthGate } from "@/lib/use-auth-gate";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RatingChip } from "./rating-chip";
import { ProgressStepper } from "./progress-stepper";
import { ActionSheet } from "./action-sheet";

/**
 * The detail page's primary library control.
 *
 * Untracked titles get one unmissable "Add to Library" call to action. Once a
 * title is tracked it becomes a live tracking bar — status, one-tap progress,
 * score — with everything deeper one tap away in the sheet. This keeps the
 * add flow to a single obvious step while still rewarding return visits.
 */
export function MediaActions({ media }: { media: MediaSummary }) {
  const mounted = useMounted();
  const entry = useWaku((s) => s.entries[media.id]);
  const setProgress = useWaku((s) => s.setProgress);
  const setStatus = useWaku((s) => s.setStatus);
  const toggleFavorite = useWaku((s) => s.toggleFavorite);
  const { gated, guard } = useAuthGate();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Still-airing anime with no published episode count: infer the released
  // total from the schedule (next episode n ⇒ n-1 aired), so progress behaves
  // just like a finished show's.
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

  // Pre-hydration: render the CTA shell so layout doesn't jump.
  if (!mounted) {
    return <div className="h-12 w-full max-w-xs animate-pulse rounded-full bg-white/5" />;
  }

  // Signed out (with cloud auth on): adding/tracking/rating is gated — send the
  // user to sign in rather than letting them edit a library they can't keep.
  if (gated) {
    return (
      <Button
        variant="accent"
        size="md"
        className="w-full px-6 sm:w-auto"
        onClick={() => guard(() => {})}
      >
        <Plus className="h-4 w-4" /> Sign in to track &amp; rate
      </Button>
    );
  }

  if (!inList || !entry) {
    return (
      <>
        {/* Balanced, not oversized: full-width only on narrow screens where
            reach matters, then sized to its content from sm up. */}
        <Button
          variant="accent"
          size="md"
          className="w-full px-6 sm:w-auto"
          onClick={() => setSheetOpen(true)}
        >
          <Plus className="h-4 w-4" /> Add to Library
        </Button>
        <ActionSheet media={media} open={sheetOpen} onClose={() => setSheetOpen(false)} />
      </>
    );
  }

  const meta = STATUS_META[entry.status];
  const StatusIcon = meta.icon;
  const pct = total ? Math.min(100, (entry.progress / total) * 100) : entry.progress > 0 ? 100 : 0;
  const atMax = total != null && entry.progress >= total;
  const isCompleted = entry.status === "COMPLETED";
  // Reached the finale but not yet marked done → offer completion (which fires
  // the rating prompt). Only when we actually know the total.
  const canComplete = atMax && !isCompleted;

  // Next-up cue: a releasing anime has aired past where the user is. `aired` is
  // (next episode − 1); if that's beyond their progress there's a real gap to
  // catch up on. Uses whichever aired total we can infer.
  const airedNow =
    media.nextAiringEpisode && media.nextAiringEpisode.episode > 1
      ? media.nextAiringEpisode.episode - 1
      : null;
  const behindBy = airedNow != null ? airedNow - entry.progress : 0;
  const showCatchUp = !isCompleted && behindBy > 0;

  const complete = () => setStatus(media, "COMPLETED");
  const catchUp = () => airedNow != null && setProgress(media.id, airedNow);

  return (
    <>
      <div className="glass w-full max-w-xl rounded-3xl p-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* status — opens the sheet */}
          <button
            onClick={() => setSheetOpen(true)}
            className="flex h-10 items-center gap-2 rounded-full px-3.5 text-sm font-semibold outline-none transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-waku-400"
            style={{ background: meta.soft, color: meta.color, boxShadow: `inset 0 0 0 1.5px ${meta.color}66` }}
            aria-label={`Status: ${STATUS_LABEL[entry.status]} — open library options`}
          >
            <StatusIcon className="h-4 w-4" />
            {STATUS_LABEL[entry.status]}
          </button>

          <RatingChip score={entry.score} size="md" />

          <div className="flex-1" />

          <button
            onClick={() => toggleFavorite(media.id)}
            aria-pressed={entry.favorite}
            aria-label={entry.favorite ? "Remove from favorites" : "Add to favorites"}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-full outline-none ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
              entry.favorite
                ? "bg-[#ff5b8f]/15 text-[#ff5b8f] ring-[#ff5b8f]/40"
                : "text-white/50 ring-white/12 hover:bg-white/8 hover:text-white",
            )}
          >
            <Heart className={cn("h-4 w-4", entry.favorite && "fill-current")} />
          </button>

          <Button variant="glass" size="icon" onClick={() => setSheetOpen(true)} aria-label="Library options">
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>

        {/* progress */}
        <div className="mt-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="font-medium text-white/45">Progress</span>
            <span className="tabular-nums text-white/70">
              {entry.progress}
              {total ? ` / ${total}` : ""} {unit}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-waku-400 to-waku-600 transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            {canComplete ? (
              <Button
                variant="accent"
                size="sm"
                onClick={complete}
                aria-label={`Mark ${title} completed`}
              >
                <Check className="h-4 w-4" /> Complete
              </Button>
            ) : (
              <ProgressStepper
                value={entry.progress}
                total={total ?? null}
                onChange={(n) => setProgress(media.id, total ? Math.min(n, total) : Math.max(0, n))}
                size="sm"
                label={title}
              />
            )}
          </div>
        </div>

        {/* Next-up nudge — a releasing title has aired past the user's spot. */}
        {showCatchUp && (
          <button
            onClick={catchUp}
            className="mt-2.5 flex w-full items-center gap-2 rounded-2xl bg-white/[0.04] px-3 py-2 text-left text-xs outline-none ring-1 ring-inset ring-white/8 transition-colors hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-waku-400"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full accent-fill">
              <Zap className="h-3.5 w-3.5" />
            </span>
            <span className="min-w-0 flex-1 text-white/75">
              <span className="font-semibold text-white">
                {behindBy} new {unit === "EP" ? "episode" : "chapter"}{behindBy > 1 ? "s" : ""}
              </span>{" "}
              aired since you last watched
            </span>
            <span className="shrink-0 font-semibold text-waku-cinematic">Catch up →</span>
          </button>
        )}
      </div>

      <ActionSheet media={media} open={sheetOpen} onClose={() => setSheetOpen(false)} />
    </>
  );
}

/** Small inline affordance used where a full CTA doesn't fit. */
export function AddToLibraryBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
      <LibraryIcon className="h-3.5 w-3.5" /> In your library
    </span>
  );
}
