"use client";

import Link from "next/link";
import Image from "next/image";
import { Plus, Play } from "lucide-react";
import { useWaku, type LibraryEntry } from "@/lib/store";
import { entryTotal, unitWord } from "@/lib/library-filters";
import { cn } from "@/lib/utils";

/**
 * The "Continue" rail — the titles the user is actively watching/reading,
 * surfaced first for a one-tap progress bump. It's a shortcut into the full
 * library below (same entries, not a separate list), so the "+1" here and the
 * row controls below stay perfectly in sync through the store.
 */
export function ContinueRail({ entries }: { entries: LibraryEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
      {entries.map((e) => (
        <ContinueCard key={e.media.id} entry={e} />
      ))}
    </div>
  );
}

function ContinueCard({ entry }: { entry: LibraryEntry }) {
  const setProgress = useWaku((s) => s.setProgress);
  const { media } = entry;
  const total = entryTotal(entry);
  const pct = total ? Math.min(100, (entry.progress / total) * 100) : entry.progress > 0 ? 100 : 0;
  const atMax = total != null && entry.progress >= total;

  const bump = () => {
    if (atMax) return;
    setProgress(media.id, entry.progress + 1);
  };

  const next = entry.progress + 1;

  return (
    <div className="glass relative flex w-[13.5rem] shrink-0 items-center gap-2.5 rounded-2xl p-2">
      <Link
        href={`/media/${media.id}`}
        className="group flex min-w-0 flex-1 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-waku-400"
      >
        <div className="relative h-[3.5rem] w-10 shrink-0 overflow-hidden rounded-lg bg-abyss-700 ring-1 ring-white/10">
          {media.cover ? (
            <Image src={media.cover} alt="" fill sizes="40px" className="object-cover" style={{ backgroundColor: media.color || "#0c1122" }} />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-white/25">
              <Play className="h-4 w-4" />
            </div>
          )}
          {entry.status === "REWATCHING" && (
            <span className="absolute left-0 top-0 rounded-br-md bg-iris-500/90 px-1 py-0.5 text-[8px] font-bold uppercase leading-none text-white">
              R
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-[13px] font-semibold leading-tight text-white group-hover:text-waku-cinematic">
            {media.title}
          </h3>
          <div className="mt-1.5 flex items-center gap-1.5">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/12">
              <div className="h-full rounded-full bg-gradient-to-r from-waku-400 to-waku-600" style={{ width: `${pct}%` }} />
            </div>
            <span className="shrink-0 text-[10px] tabular-nums text-white/50">
              {total ? `${entry.progress}/${total}` : `${entry.progress}`}
            </span>
          </div>
        </div>
      </Link>

      <button
        type="button"
        onClick={bump}
        disabled={atMax}
        aria-label={atMax ? `${media.title} is complete` : `Mark ${unitWord(entry)} ${next} of ${media.title}`}
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full outline-none ring-1 ring-inset transition-all focus-visible:ring-2 focus-visible:ring-waku-400",
          atMax
            ? "bg-white/5 text-white/30 ring-white/10"
            : "bg-gradient-to-b from-waku-400 to-waku-600 text-white shadow-glow ring-transparent hover:from-waku-300 hover:to-waku-500",
        )}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
