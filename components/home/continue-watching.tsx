"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Play, Plus, Check, Radio, PlayCircle, Compass, ChevronLeft, ChevronRight } from "lucide-react";
import { useWaku, useEntriesList, type LibraryEntry } from "@/lib/store";
import { useMounted } from "@/lib/use-mounted";
import { entryTotal, isActive, unitWord } from "@/lib/library-filters";
import { compareEntries } from "@/lib/library-filters";
import { cn, timeUntil } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const MAX_SHOWN = 12;

/**
 * "Continue Watching" — the first thing a returning user should see.
 *
 * A compact, swipeable rail of everything in progress, each with a one-tap +1
 * on the next episode so the common case never needs opening the title. Reads
 * straight from the local store, so it's gated on mount to keep SSR and first
 * paint in agreement.
 */
export function ContinueWatching() {
  const mounted = useMounted();
  const entries = useEntriesList();
  const rail = useRef<HTMLDivElement>(null);

  if (!mounted) return <Skeleton />;

  const active = entries
    .filter(isActive)
    .sort((a, b) => compareEntries(a, b, "updated"))
    .slice(0, MAX_SHOWN);

  if (active.length === 0 && entries.length === 0) return null;

  const scroll = (dir: -1 | 1) => rail.current?.scrollBy({ left: dir * 480, behavior: "smooth" });

  return (
    <section className="container">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-iris-500/15 ring-1 ring-inset ring-iris-400/25">
          <PlayCircle className="h-4 w-4 text-iris-300" />
        </span>
        <h2 className="font-display text-lg font-bold tracking-tight text-white sm:text-xl">
          Continue Watching
        </h2>
        {active.length > 0 && (
          <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-white/55">
            {active.length}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {active.length > 3 && (
            <div className="hidden gap-1 md:flex">
              <button
                onClick={() => scroll(-1)}
                aria-label="Scroll left"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/60 outline-none ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => scroll(1)}
                aria-label="Scroll right"
                className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/60 outline-none ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          <Link href="/library">
            <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
              Library
            </Button>
          </Link>
        </div>
      </div>

      {active.length === 0 ? (
        <EmptyState />
      ) : (
        <div
          ref={rail}
          className="no-scrollbar -mx-1 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pb-1"
        >
          {active.map((e) => (
            <ContinueCard key={e.media.id} entry={e} />
          ))}
        </div>
      )}
    </section>
  );
}

function ContinueCard({ entry }: { entry: LibraryEntry }) {
  const setProgress = useWaku((s) => s.setProgress);
  const { media } = entry;
  const total = entryTotal(entry);
  const pct = total ? Math.min(100, (entry.progress / total) * 100) : entry.progress > 0 ? 100 : 0;
  const atMax = total != null && entry.progress >= total;
  const next = entry.progress + 1;
  const airing = media.mediaStatus === "RELEASING" ? media.nextAiring : null;
  const caughtUp = airing != null && next >= airing.episode;
  const rewatching = entry.status === "REWATCHING";

  return (
    <article className="glass relative flex w-[13.5rem] shrink-0 snap-start items-center gap-2.5 rounded-2xl p-2">
      <Link
        href={`/media/${media.id}`}
        className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-iris-400"
      >
        <div className="relative h-[3.75rem] w-11 shrink-0 overflow-hidden rounded-lg bg-abyss-700 ring-1 ring-white/10">
          {media.cover ? (
            <Image
              src={media.cover}
              alt=""
              fill
              sizes="44px"
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ backgroundColor: media.color || "#0c1122" }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/25">
              <Play className="h-4 w-4" />
            </div>
          )}
          {rewatching && (
            <span className="absolute left-0 top-0 rounded-br-md bg-iris-500/90 px-1 py-0.5 text-[8px] font-bold uppercase leading-none text-white">
              R
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="line-clamp-1 text-[13px] font-semibold leading-tight text-white group-hover:text-iris-300">
            {media.title}
          </h3>
          <p className="truncate text-[10px] text-white/45">
            {caughtUp && airing ? (
              <span className="flex items-center gap-1 text-waku-cinematic">
                <Radio className="h-2.5 w-2.5 shrink-0" />
                EP {airing.episode} · {timeUntil(airing.airingAt)}
              </span>
            ) : atMax ? (
              "All caught up"
            ) : (
              `Next · ${unitWord(entry)} ${next}`
            )}
          </p>
          <div className="flex items-center gap-1.5">
            <div className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-iris-400 to-waku-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-white/45">
              {total ? `${entry.progress}/${total}` : entry.progress}
            </span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={() => !atMax && !caughtUp && setProgress(media.id, entry.progress + 1)}
        disabled={atMax || caughtUp}
        aria-label={
          atMax
            ? `${media.title} is complete`
            : caughtUp
              ? `${media.title} is caught up until the next episode airs`
              : `Mark ${unitWord(entry)} ${next} of ${media.title} watched`
        }
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full outline-none ring-1 ring-inset transition-all focus-visible:ring-2 focus-visible:ring-iris-400",
          atMax || caughtUp
            ? "bg-white/5 text-white/30 ring-white/10"
            : "bg-gradient-to-b from-iris-400 to-iris-600 text-white shadow-glow-iris ring-transparent hover:from-iris-300",
        )}
      >
        {atMax ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
    </article>
  );
}

function EmptyState() {
  return (
    <div className="glass flex flex-col items-center gap-3 rounded-2xl px-6 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/45">
          <PlayCircle className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold text-white">Nothing in progress</p>
          <p className="text-xs text-white/45">
            Set a title to Watching and it&rsquo;ll show up here.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Link href="/library">
          <Button variant="glass" size="sm">
            Your library
          </Button>
        </Link>
        <Link href="/discover">
          <Button variant="accent" size="sm">
            <Compass className="h-3.5 w-3.5" /> Discover
          </Button>
        </Link>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <section className="container">
      <div className="mb-2.5 flex items-center gap-2.5">
        <div className="skeleton h-7 w-7 rounded-xl" />
        <div className="skeleton h-6 w-48 rounded-full" />
      </div>
      <div className="flex gap-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-[4.75rem] w-[13.5rem] shrink-0 rounded-2xl" />
        ))}
      </div>
    </section>
  );
}
