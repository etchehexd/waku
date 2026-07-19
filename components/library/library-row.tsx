"use client";

import Link from "next/link";
import Image from "next/image";
import { Heart, RotateCcw, Star, Radio } from "lucide-react";
import type { LibraryEntry } from "@/lib/store";
import { entryTotal } from "@/lib/library-filters";
import { cn, timeAgo, timeUntil } from "@/lib/utils";
import { RatingChip } from "@/components/media/rating-chip";
import { QuickStatus } from "./quick-status";
import { ProgressControl } from "./progress-control";
import { RowMenu } from "./row-menu";

const FORMAT_LABEL: Record<string, string> = {
  TV: "TV",
  TV_SHORT: "TV Short",
  MOVIE: "Movie",
  SPECIAL: "Special",
  OVA: "OVA",
  ONA: "ONA",
  MUSIC: "Music",
  MANGA: "Manga",
  NOVEL: "Light Novel",
  ONE_SHOT: "One-shot",
};

/**
 * Compact, tracking-focused library row. The cover + text is a single link to
 * the detail page; every control is a sibling button so tapping a control
 * never navigates. Reads well from mobile to desktop and never overflows.
 */
export function LibraryRow({ entry }: { entry: LibraryEntry }) {
  const { media } = entry;
  const total = entryTotal(entry);
  const pct = total ? Math.min(100, (entry.progress / total) * 100) : 0;
  // A refresh can leave progress above a shrunken total — show it safely.
  const overTotal = total != null && entry.progress > total;
  const formatLabel = media.format ? FORMAT_LABEL[media.format] ?? media.format.replace(/_/g, " ") : null;
  const releasing = media.mediaStatus === "RELEASING";
  const airing = media.nextAiring;

  return (
    <li className="glass group relative flex items-center gap-3 rounded-2xl p-2">
      {/* cover — a link, but not a second tab stop (the title below is the
          accessible link for this row) */}
      <Link
        href={`/media/${media.id}`}
        tabIndex={-1}
        aria-hidden
        className="shrink-0 rounded-lg outline-none"
      >
        <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-abyss-700 ring-1 ring-white/10">
          {media.cover ? (
            <Image
              src={media.cover}
              alt=""
              fill
              sizes="40px"
              className="object-cover"
              style={{ backgroundColor: media.color || "#0c1122" }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/25">
              <Star className="h-4 w-4" />
            </div>
          )}
          {entry.favorite && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-abyss-950 ring-1 ring-white/15">
              <Heart className="h-2.5 w-2.5 fill-current text-[#ff5b8f]" />
            </span>
          )}
        </div>
      </Link>

      {/* title + meta + progress — the title gets a full line of its own so it
          stays readable on narrow screens */}
      <div className="min-w-0 flex-1">
        <Link
          href={`/media/${media.id}`}
          className="block min-w-0 rounded outline-none focus-visible:ring-2 focus-visible:ring-waku-400"
        >
          <h3 className="truncate text-sm font-semibold leading-tight text-white transition-colors group-hover:text-waku-cinematic">
            {media.title}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/45">
            {/* the score leads the meta line so it's scannable down the column */}
            <RatingChip score={entry.score} size="xs" showUnrated={false} />
            {formatLabel && <span className="shrink-0">{formatLabel}</span>}
            {entry.rewatches > 0 && (
              <span className="flex shrink-0 items-center gap-0.5">
                <RotateCcw className="h-2.5 w-2.5" />
                {entry.rewatches}
              </span>
            )}
            {releasing && airing ? (
              <span className="flex min-w-0 items-center gap-0.5 text-waku-cinematic">
                <Radio className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">
                  EP {airing.episode} · {timeUntil(airing.airingAt)}
                </span>
              </span>
            ) : (
              entry.updatedAt > 0 && <span className="shrink-0">{timeAgo(entry.updatedAt)}</span>
            )}
          </div>
        </Link>

        {/* progress line — bar is purely visual; the numbers live in the
            editable control beside it. Sits outside the link so the stepper
            buttons can never trigger navigation. */}
        <div className="mt-1 flex items-center gap-2">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                "h-full rounded-full",
                overTotal
                  ? "bg-gradient-to-r from-amber-400 to-amber-500"
                  : "bg-gradient-to-r from-waku-400 to-waku-600",
              )}
              style={{ width: total ? `${pct}%` : entry.progress > 0 ? "100%" : "0%" }}
            />
          </div>
          <div className="shrink-0">
            <ProgressControl entry={entry} size="sm" />
          </div>
        </div>
      </div>

      {/* status + overflow — siblings of the link so they never navigate */}
      <div className="flex shrink-0 items-center gap-1 self-center">
        <QuickStatus entry={entry} variant="pill" />
        <RowMenu entry={entry} />
      </div>
    </li>
  );
}
