"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Plus, Check, Clock } from "lucide-react";
import { Popover, MenuCaption, menuItemCls } from "@/components/ui/popover";
import type { MediaSummary } from "@/lib/anilist/types";
import { useWaku, STATUS_LABEL, STATUS_ORDER, type LibraryEntry } from "@/lib/store";
import { STATUS_META } from "./status-meta";
import { GenreDot } from "./genre-tag";
import { ScoreBadge } from "./score-badge";
import { useMounted } from "@/lib/use-mounted";
import { useAuthGate } from "@/lib/use-auth-gate";
import { toTenScale, cn, timeUntil } from "@/lib/utils";

interface MediaCardProps {
  media: MediaSummary;
  index?: number;
  /** overrides the community score badge with the user's own score */
  userScore?: number | null;
  className?: string;
}

/**
 * Poster card — deliberately restrained.
 *
 * Resting state shows only what's useful at a glance: the artwork, the title,
 * and a single compact score. Everything secondary — format, year, top genre,
 * airing countdown — is held back and revealed on hover/focus, so a wall of
 * cards reads as a calm grid of covers rather than a noisy scoreboard.
 */
export function MediaCard({ media, index = 0, userScore, className }: MediaCardProps) {
  const title = media.title.english || media.title.romaji || media.title.native || "—";
  const cover = media.coverImage.extraLarge || media.coverImage.large || "";
  const score = userScore != null ? userScore : toTenScale(media.averageScore);
  const airing = media.nextAiringEpisode;
  const format = media.format?.replace(/_/g, " ");
  const genre = media.genres?.[0];

  // Library membership drives the status-colored outline (its "shelf") and the
  // centered add/change control below.
  const mounted = useMounted();
  const entry = useWaku((s) => s.entries[media.id]);
  const inList = mounted && !!entry;
  const statusMeta = inList && entry ? STATUS_META[entry.status] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.04, 0.3), ease: [0.22, 1, 0.36, 1] }}
      className={cn("group relative w-[160px] shrink-0 sm:w-[176px]", className)}
    >
      <Link href={`/media/${media.id}`} className="block outline-none focus-visible:ring-2 focus-visible:ring-waku-400 focus-visible:ring-offset-2 focus-visible:ring-offset-abyss-950 rounded-2xl">
        <div className="glass glass-interactive relative aspect-[2/3] overflow-hidden rounded-2xl ring-1 ring-white/10">
          {cover ? (
            <Image
              src={cover}
              alt={title}
              fill
              sizes="176px"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.07]"
              style={{ backgroundColor: media.coverImage.color || "#0c1122" }}
            />
          ) : (
            <div className="h-full w-full bg-abyss-700" />
          )}

          {/* Resting scrim — just enough to seat the title. */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-abyss-950 via-abyss-950/70 to-transparent" />

          {/* Airing marker — a single calm static dot, not a pulsing badge. */}
          {airing && (
            <span
              className="absolute left-2.5 top-2.5 z-10 h-2 w-2 rounded-full bg-waku-cinematic ring-2 ring-abyss-950"
              title={`Episode ${airing.episode} in ${timeUntil(airing.airingAt)}`}
            />
          )}

          {/* Score — the circular ring badge, held back at rest and revealed on
              hover/focus so a wall of cards reads as calm covers. */}
          {score != null && (
            <div className="absolute right-2 top-2 z-10 translate-y-0.5 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
              <ScoreBadge score={score} size="sm" />
            </div>
          )}

          {/* Bottom block — title always fully visible; secondary metadata
              reveals BELOW it on hover, so the title never covers the airing
              text. The container is anchored to the bottom and grows upward as
              the metadata expands. Airing sits on its own line above the genre. */}
          <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col gap-1 p-2.5 pr-10">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-white drop-shadow">
              {title}
            </h3>
            <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100">
              <div className="overflow-hidden">
                <div className="flex flex-col gap-0.5 pt-0.5 text-[10px] font-medium text-white/70">
                  {/* line 1 — airing (or format · year when not airing) */}
                  <div className="flex items-center gap-x-2">
                    {airing ? (
                      <span className="flex items-center gap-0.5 text-waku-cinematic">
                        <Clock className="h-2.5 w-2.5" /> EP {airing.episode} · {timeUntil(airing.airingAt)}
                      </span>
                    ) : (
                      <>
                        {format && <span className="uppercase tracking-wide">{format}</span>}
                        {media.seasonYear && <span className="tabular-nums">{media.seasonYear}</span>}
                      </>
                    )}
                  </div>
                  {/* line 2 — genre */}
                  {genre && (
                    <div className="flex items-center">
                      <GenreDot genre={genre} className="max-w-[8rem] text-[10px]" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Library shelf — a thin status-colored outline shown when the title
              is tracked (green = completed, blue = watching, …), replacing the
              old corner status button. */}
          {statusMeta && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-20 rounded-2xl"
              style={{ boxShadow: `inset 0 0 0 2px ${statusMeta.color}, inset 0 0 14px -3px ${statusMeta.color}` }}
            />
          )}
        </div>
      </Link>

      {/* add / change status — centered over the poster, revealed on hover.
          Sibling of the Link so it never navigates. */}
      <CenterAdd media={media} entry={entry} inList={inList} statusMeta={statusMeta} />
    </motion.div>
  );
}

/**
 * Add-to-library / change-status control, centered over the poster and revealed
 * on hover. Shows a "＋" for untracked titles and the current status icon for
 * tracked ones; either way it opens a compact status popover. The status the
 * title is already on is shown by the card's outline, not here.
 */
function CenterAdd({
  media,
  entry,
  inList,
  statusMeta,
}: {
  media: MediaSummary;
  entry: LibraryEntry | undefined;
  inList: boolean;
  statusMeta: { icon: typeof Plus; color: string; soft: string } | null;
}) {
  const setStatus = useWaku((s) => s.setStatus);
  const { gated, guard } = useAuthGate();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const ActiveIcon = statusMeta?.icon;
  const cardTitle = media.title.english || media.title.romaji || "title";

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center">
      <button
        ref={btnRef}
        onClick={() => guard(() => setOpen((v) => !v))}
        aria-label={
          gated
            ? `Sign in to add ${cardTitle} to your library`
            : inList && entry
              ? `In list: ${STATUS_LABEL[entry.status]} — change status`
              : `Add ${cardTitle} to list`
        }
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full backdrop-blur-md outline-none ring-1 ring-inset transition-all duration-200",
          "opacity-0 hover:scale-105 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-waku-400 group-hover:opacity-100 motion-reduce:transition-none",
          inList ? "bg-abyss-950/70" : "bg-abyss-950/70 text-white ring-white/30 hover:bg-abyss-950/85 hover:ring-waku-300/80",
          open && "opacity-100",
        )}
        style={inList && statusMeta ? { color: statusMeta.color, boxShadow: `inset 0 0 0 1.5px ${statusMeta.color}` } : undefined}
      >
        {inList && ActiveIcon ? <ActiveIcon className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={btnRef}
        label={`Set status for ${cardTitle}`}
        width={184}
        className="p-1.5"
      >
        <MenuCaption>{inList ? "Move to" : "Add as"}</MenuCaption>
        {STATUS_ORDER.map((s) => {
          const m = STATUS_META[s];
          const Icon = m.icon;
          const active = entry?.status === s;
          return (
            <button
              key={s}
              role="menuitemradio"
              aria-checked={active}
              onClick={() => {
                setStatus(media, s);
                setOpen(false);
              }}
              className={menuItemCls(active)}
              style={active ? { background: m.soft } : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" style={{ color: m.color }} />
              <span className="flex-1 text-left">{STATUS_LABEL[s]}</span>
              {active && <Check className="h-3.5 w-3.5 text-white/80" />}
            </button>
          );
        })}
      </Popover>
    </div>
  );
}
