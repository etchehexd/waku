"use client";

import Link from "next/link";
import Image from "next/image";
import { Plus, Check, Star } from "lucide-react";
import { useWaku, isRateable, STATUS_LABEL, type LibraryEntry } from "@/lib/store";
import { STATUS_META } from "@/components/media/status-meta";
import { RowMenu } from "./row-menu";
import { entryTotal } from "@/lib/library-filters";
import { tierForScore } from "@/lib/rating";
import { cn, formatScore } from "@/lib/utils";

/**
 * AniList-style library row.
 *
 * A dense, scannable line: cover, title (+ format · year), then right-aligned
 * Score and Progress columns, a one-tap "+1", and the row menu. Fixed trailing
 * widths keep the columns aligned down the whole list; the title flexes. The
 * score is a button — tap it to (re)rate when the title is finished.
 */

/** Column widths shared by {@link ListColumnHeader} and {@link ListRow}. */
const COVER = "w-9 sm:w-10";
const SCORE = "w-10 sm:w-12";
const PROG = "w-[3.5rem] sm:w-[5.5rem]";
const PLUS = "w-8";
const MENU = "w-8";

/**
 * A self-contained list block: a column-header row aligned to the same fixed
 * columns as every {@link ListRow}, then the rows. Kept together so the header
 * and cells share identical padding and line up perfectly.
 */
export function LibraryList({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.015]">
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-2 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/30 sm:gap-3 sm:px-3">
        <span className={cn(COVER, "shrink-0")} aria-hidden />
        <span className="min-w-0 flex-1">Title</span>
        <span className={cn(SCORE, "shrink-0 text-right")}>Score</span>
        <span className={cn(PROG, "hidden shrink-0 text-right sm:block")}>Progress</span>
        <span className={cn(PLUS, "shrink-0")} aria-hidden />
        <span className={cn(MENU, "shrink-0")} aria-hidden />
      </div>
      <div className="p-1.5 sm:p-2">{children}</div>
    </div>
  );
}

export function ListRow({ entry }: { entry: LibraryEntry }) {
  const { media } = entry;
  const meta = STATUS_META[entry.status];
  const total = entryTotal(entry);
  const pct = total ? Math.min(100, (entry.progress / total) * 100) : entry.progress > 0 ? 100 : 0;
  const atMax = total != null && entry.progress >= total;
  const canRate = isRateable(entry);

  const setProgress = useWaku((s) => s.setProgress);
  const requestRate = useWaku((s) => s.requestRate);

  const scoreTier = entry.score != null ? tierForScore(entry.score) : null;

  return (
    <div className="group relative flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/[0.05] sm:gap-3 sm:px-3">
      {/* cover */}
      <Link
        href={`/media/${media.id}`}
        className={cn(COVER, "relative aspect-[3/4] shrink-0 overflow-hidden rounded-md outline-none ring-1 ring-inset ring-white/10 focus-visible:ring-2 focus-visible:ring-waku-400")}
        style={{ boxShadow: `inset 0 0 0 1.5px ${meta.color}` }}
        aria-label={media.title}
      >
        {media.cover ? (
          <Image src={media.cover} alt="" fill sizes="40px" className="object-cover" style={{ backgroundColor: media.color || "#0c1122" }} />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-abyss-700 text-white/25">
            <Star className="h-3.5 w-3.5" />
          </span>
        )}
      </Link>

      {/* title + meta */}
      <Link href={`/media/${media.id}`} className="min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-waku-400 rounded">
        <span className="block truncate text-[13px] font-bold leading-tight text-white transition-colors group-hover:text-waku-cinematic sm:text-sm">
          {media.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium text-white/40">
          <span className="inline-flex items-center gap-1" style={{ color: meta.color }}>
            <meta.icon className="h-3 w-3" />
            {STATUS_LABEL[entry.status]}
          </span>
          {media.format && (
            <>
              <span className="text-white/20">·</span>
              <span className="hidden truncate capitalize sm:inline">{media.format.replace(/_/g, " ").toLowerCase()}</span>
            </>
          )}
          {media.seasonYear && (
            <>
              <span className="hidden text-white/20 sm:inline">·</span>
              <span className="hidden tabular-nums sm:inline">{media.seasonYear}</span>
            </>
          )}
        </span>
      </Link>

      {/* score — tap to (re)rate */}
      <button
        type="button"
        onClick={() => canRate && requestRate(media.id)}
        disabled={!canRate}
        aria-label={
          !canRate
            ? "Finish the title to rate it"
            : entry.score != null
              ? `Your rating ${formatScore(entry.score)} — re-rate`
              : "Rate this title"
        }
        title={!canRate ? "Finish it to rate" : entry.score != null ? "Re-rate" : "Rate"}
        className={cn(
          SCORE,
          "shrink-0 rounded-md py-1 text-right text-sm font-black tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
          canRate && "hover:bg-white/10",
          !canRate && "cursor-default",
        )}
        style={{ color: scoreTier ? scoreTier.text : "rgba(255,255,255,0.25)" }}
      >
        {entry.score != null ? formatScore(entry.score) : "–"}
      </button>

      {/* progress + bar (hidden text on xs, still shows via +1) */}
      <div className={cn(PROG, "hidden shrink-0 sm:block")}>
        <div className="text-right text-xs font-semibold tabular-nums text-white/70">
          {entry.progress}
          <span className="text-white/35">{total ? `/${total}` : ""}</span>
        </div>
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-waku-400 to-waku-600" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* one-tap +1 */}
      <button
        type="button"
        onClick={() => !atMax && setProgress(media.id, entry.progress + 1)}
        disabled={atMax}
        aria-label={atMax ? `${media.title} complete` : `Add one to ${media.title} progress`}
        className={cn(
          PLUS,
          "flex h-8 shrink-0 items-center justify-center rounded-lg outline-none ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
          atMax
            ? "text-emerald-300/80 ring-white/5"
            : "text-white/70 ring-white/10 hover:bg-waku-500/20 hover:text-white",
        )}
      >
        {atMax ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>

      {/* per-row menu */}
      <div className={cn(MENU, "flex shrink-0 justify-center")}>
        <RowMenu entry={entry} />
      </div>
    </div>
  );
}
