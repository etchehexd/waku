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
import { RatingChip } from "@/components/media/rating-chip";
import { Popover, MenuCaption, menuItemCls } from "@/components/ui/popover";
import { entryTotal } from "@/lib/library-filters";
import { cn, timeUntil } from "@/lib/utils";

/**
 * Library poster card.
 *
 * The poster stays clean — just the artwork, a thin status-colored outline (its
 * "shelf"), a slim progress bar, and a hover "＋" to bump progress. The **title
 * and a status/airing line live BELOW the poster and are always visible**, so a
 * grid reads as a tidy wall of covers with legible names rather than a noisy
 * overlay. When a releasing title has a scheduled episode, the next-episode
 * countdown is shown up front — no hover required.
 */
export function EntryCard({ entry }: { entry: LibraryEntry; compact?: boolean }) {
  const { media } = entry;
  const total = entryTotal(entry);
  const pct = total ? Math.min(100, (entry.progress / total) * 100) : 0;
  const overTotal = total != null && entry.progress > total;
  const releasing = media.mediaStatus === "RELEASING";
  const airing = media.nextAiring;
  const meta = STATUS_META[entry.status];

  return (
    <div className="group relative">
      {/* poster — its own relative box; a stretched link handles navigation so
          the control buttons can sit above it without triggering it. */}
      <div className="glass glass-interactive relative aspect-[2/3] overflow-hidden rounded-xl">
        {media.cover ? (
          <Image
            src={media.cover}
            alt={media.title}
            fill
            sizes="160px"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            style={{ backgroundColor: media.color || "#0c1122" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-abyss-700 text-white/20">
            <Star className="h-6 w-6" />
          </div>
        )}

        <Link
          href={`/media/${media.id}`}
          aria-label={media.title}
          className="absolute inset-0 z-10 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-waku-400"
        />

        {/* Status outline — the card's shelf, a thin colored ring. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-20 rounded-xl"
          style={{ boxShadow: `inset 0 0 0 2px ${meta.color}, inset 0 0 12px -3px ${meta.color}aa` }}
        />

        {/* Your score — small chip, top-right, always shown when rated. */}
        {entry.score != null && (
          <div className="pointer-events-none absolute right-1.5 top-1.5 z-20">
            <RatingChip score={entry.score} size="xs" />
          </div>
        )}

        {/* rewatch marker — quiet, top-left */}
        {entry.rewatches > 0 && (
          <span className="pointer-events-none absolute left-1.5 top-1.5 z-20 inline-flex items-center gap-0.5 rounded-full bg-abyss-950/75 px-1.5 py-0.5 text-[10px] font-semibold text-white/85 backdrop-blur-md ring-1 ring-inset ring-white/15">
            <RotateCcw className="h-2.5 w-2.5" />
            {entry.rewatches}
          </span>
        )}

        {/* slim progress bar pinned to the very bottom of the poster */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-1 bg-black/30">
          <div
            className={cn(
              "h-full",
              overTotal ? "bg-gradient-to-r from-amber-400 to-amber-500" : "bg-gradient-to-r from-waku-400 to-waku-600",
            )}
            style={{ width: total ? `${pct}%` : entry.progress > 0 ? "100%" : "0%" }}
          />
        </div>

        {/* inline controls — over the stretched link, so they never navigate */}
        <StatusChip entry={entry} />
        <CenterIncrement entry={entry} total={total} />
      </div>

      {/* ── below the poster: always-visible name + status/airing ── */}
      <div className="mt-1.5 px-0.5">
        <Link href={`/media/${media.id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-waku-400 rounded">
          <h3 className="line-clamp-2 text-[11.5px] font-semibold leading-tight text-white transition-colors group-hover:text-waku-cinematic">
            {media.title}
          </h3>
        </Link>
        <div className="mt-1 flex items-center gap-1.5 text-[10px] font-medium leading-none">
          {releasing && airing ? (
            <span className="inline-flex items-center gap-1 truncate text-waku-cinematic">
              <Radio className="h-2.5 w-2.5 shrink-0" />
              EP {airing.episode} · {timeUntil(airing.airingAt)}
            </span>
          ) : (
            <>
              <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden />
              <span className="truncate text-white/50">{STATUS_LABEL[entry.status]}</span>
              <span className="ml-auto shrink-0 tabular-nums text-white/40">
                {entry.progress}
                {total ? `/${total}` : ""}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact status switch (top-left of the poster). The outline already tells you
 * the shelf, so this stays hidden until hover; tapping opens a "move to" menu.
 */
function StatusChip({ entry }: { entry: LibraryEntry }) {
  const setStatusById = useWaku((s) => s.setStatusById);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const meta = STATUS_META[entry.status];
  const Icon = meta.icon;
  const offsetTop = entry.rewatches > 0 ? "top-9" : "top-1.5";

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
          "absolute left-1.5 z-30 flex h-6 w-6 items-center justify-center rounded-full outline-none backdrop-blur-md transition-all duration-200 hover:scale-110 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-waku-400 group-hover:opacity-100",
          offsetTop,
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
 * The single progress control: a "＋" centered on the poster, revealed on hover,
 * that bumps progress by one. Shows a completed check when at the total.
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
        "absolute left-1/2 top-1/2 z-30 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 scale-90 items-center justify-center rounded-full backdrop-blur-md outline-none ring-1 ring-inset transition-all duration-200 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-waku-400",
        atMax
          ? "bg-abyss-950/55 text-emerald-300 ring-emerald-400/40"
          : "bg-abyss-950/65 text-white ring-white/30 hover:scale-100 hover:bg-abyss-950/80 hover:ring-waku-300/80 group-hover:scale-100",
        "opacity-0 group-hover:opacity-100",
      )}
    >
      {atMax ? <Check className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
    </button>
  );
}
