"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Plus, Check, Star, Radio, RotateCcw } from "lucide-react";
import {
  useWaku,
  STATUS_LABEL,
  STATUS_ORDER,
  type LibraryEntry,
} from "@/lib/store";
import { STATUS_META } from "@/components/media/status-meta";
import { ScoreBadge } from "@/components/media/score-badge";
import { Popover, MenuCaption, menuItemCls } from "@/components/ui/popover";
import { entryTotal } from "@/lib/library-filters";
import { cn, timeUntil } from "@/lib/utils";

/**
 * Grid/poster card for the library.
 *
 * The card's *place in the library* is shown by a thin status-colored outline
 * around the poster (green = completed, blue = watching, …) rather than a badge
 * whose symbol changes — so the grid reads as a calm wall of covers you can
 * still scan by state. Working controls stay out of the way until hover: a
 * single centered "＋" bumps progress, the score ring and airing line fade in,
 * and a compact chip lets you move the title to another shelf inline.
 */
export function EntryCard({ entry, compact }: { entry: LibraryEntry; compact?: boolean }) {
  const { media } = entry;
  const total = entryTotal(entry);
  const pct = total ? Math.min(100, (entry.progress / total) * 100) : 0;
  const overTotal = total != null && entry.progress > total;
  const releasing = media.mediaStatus === "RELEASING";
  const airing = media.nextAiring;
  const meta = STATUS_META[entry.status];
  const completed = entry.status === "COMPLETED";

  return (
    <div className="group relative">
      <Link href={`/media/${media.id}`} className="block">
        <div
          className={cn(
            "glass glass-interactive relative aspect-[2/3] overflow-hidden rounded-xl",
            compact && "rounded-lg",
          )}
        >
          {media.cover ? (
            <Image
              src={media.cover}
              alt={media.title}
              fill
              sizes="180px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundColor: media.color || "#0c1122" }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-abyss-700 text-white/20">
              <Star className="h-6 w-6" />
            </div>
          )}

          {/* Status outline — the card's shelf, shown as a thin colored ring.
              Deepens a touch on hover. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 rounded-xl transition-shadow duration-300"
            style={{ boxShadow: `inset 0 0 0 2px ${meta.color}, inset 0 0 12px -2px ${meta.color}88` }}
          />

          {/* Bottom scrim — only as tall as the text needs, so less of the art
              is muddied. Strengthens on hover to seat the revealed controls. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-t from-abyss-950 via-abyss-950/45 to-transparent transition-opacity duration-300 group-hover:via-abyss-950/65" />

          {/* Your score — circular ring, revealed on hover. */}
          {entry.score != null && (
            <div className="absolute right-1.5 top-1.5 z-20 translate-y-0.5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <ScoreBadge score={entry.score} size="sm" />
            </div>
          )}

          {/* rewatch marker — quiet, hover-only, top-left under the status chip */}
          {entry.rewatches > 0 && (
            <span className="absolute left-1.5 top-9 z-20 inline-flex items-center gap-0.5 rounded-full bg-abyss-950/75 px-1.5 py-0.5 text-[10px] font-semibold text-white/85 opacity-0 backdrop-blur-md transition-opacity duration-300 ring-1 ring-inset ring-white/15 group-hover:opacity-100">
              <RotateCcw className="h-2.5 w-2.5" />
              {entry.rewatches}
            </span>
          )}

          {/* title + progress */}
          <div className="absolute inset-x-0 bottom-0 z-20 p-2">
            <h3 className="line-clamp-2 text-[11px] font-semibold leading-tight text-white drop-shadow">
              {media.title}
            </h3>

            {/* airing line — reveals on hover, above the count */}
            {releasing && airing && (
              <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100">
                <div className="overflow-hidden">
                  <p className="flex items-center gap-0.5 pt-1 text-[10px] font-medium text-waku-cinematic">
                    <Radio className="h-2.5 w-2.5 shrink-0" /> EP {airing.episode} · {timeUntil(airing.airingAt)}
                  </p>
                </div>
              </div>
            )}

            <div className="mt-1.5 flex items-center gap-1.5">
              <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/15">
                <div
                  className={cn(
                    "h-full rounded-full",
                    overTotal ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-waku-400 to-waku-600",
                  )}
                  style={{ width: total ? `${pct}%` : entry.progress > 0 ? "100%" : "0%" }}
                />
              </div>
              {/* progress count — completed titles reveal it only on hover so
                  the finished shelf stays clean. */}
              <span
                className={cn(
                  "shrink-0 text-[10px] tabular-nums text-white/60 transition-opacity duration-300",
                  completed && "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                )}
              >
                {entry.progress}
                {total ? `/${total}` : ""}
              </span>
            </div>
          </div>
        </div>
      </Link>

      {/* inline controls — siblings of the link so they never navigate */}
      <StatusChip entry={entry} />
      <CenterIncrement entry={entry} total={total} />
    </div>
  );
}

/**
 * Compact status switch (top-left). The outline already tells you the shelf, so
 * this stays hidden until hover; tapping it opens a "move to" menu inline.
 */
function StatusChip({ entry }: { entry: LibraryEntry }) {
  const setStatusById = useWaku((s) => s.setStatusById);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const meta = STATUS_META[entry.status];
  const Icon = meta.icon;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Status: ${STATUS_LABEL[entry.status]} — change`}
        className={cn(
          "absolute left-1.5 top-1.5 z-30 flex h-6 w-6 items-center justify-center rounded-full outline-none backdrop-blur-md transition-all duration-200 hover:scale-110 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-waku-400 group-hover:opacity-100",
          open ? "opacity-100" : "opacity-0",
        )}
        style={{ background: `${meta.color}30`, boxShadow: `inset 0 0 0 1px ${meta.color}` }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: meta.color }} />
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={btnRef}
        label={`Set status for ${entry.media.title}`}
        width={188}
        className="p-1.5"
      >
        <MenuCaption>Move to</MenuCaption>
        {STATUS_ORDER.map((s) => {
          const m = STATUS_META[s];
          const MIcon = m.icon;
          const active = entry.status === s;
          return (
            <button
              key={s}
              role="menuitemradio"
              aria-checked={active}
              onClick={() => {
                setStatusById(entry.media.id, s);
                setOpen(false);
              }}
              className={menuItemCls(active)}
              style={active ? { background: m.soft } : undefined}
            >
              <MIcon className="h-4 w-4 shrink-0" style={{ color: m.color }} />
              <span className="flex-1 text-left">{STATUS_LABEL[s]}</span>
              {active && <Check className="h-3.5 w-3.5 text-white/80" />}
            </button>
          );
        })}
      </Popover>
    </>
  );
}

/**
 * The single progress control: a "＋" centered on the poster, revealed on
 * hover, that bumps progress by one. Shows a completed check when the title is
 * already at its total.
 */
function CenterIncrement({ entry, total }: { entry: LibraryEntry; total: number | null }) {
  const setProgress = useWaku((s) => s.setProgress);
  const atMax = total != null && entry.progress >= total;

  return (
    <button
      type="button"
      onClick={() => !atMax && setProgress(entry.media.id, entry.progress + 1)}
      disabled={atMax}
      aria-label={
        atMax
          ? `${entry.media.title} progress complete`
          : `Increase progress for ${entry.media.title} to ${entry.progress + 1}`
      }
      className={cn(
        "absolute left-1/2 top-1/2 z-20 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 scale-90 items-center justify-center rounded-full backdrop-blur-md outline-none ring-1 ring-inset transition-all duration-200 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-waku-400",
        atMax
          ? "bg-abyss-950/55 text-emerald-300 ring-emerald-400/40"
          : "bg-abyss-950/65 text-white ring-white/30 hover:scale-100 hover:bg-abyss-950/80 hover:ring-waku-300/80 group-hover:scale-100",
        // At rest the control is invisible; on hover it fades/scales in. The
        // completed check stays hidden too so a finished grid is uncluttered.
        "opacity-0 group-hover:opacity-100",
      )}
    >
      {atMax ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
    </button>
  );
}
