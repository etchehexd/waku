"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEntriesList } from "@/lib/store";
import { STATUS_META } from "@/components/media/status-meta";
import { useMounted } from "@/lib/use-mounted";
import { STATUS_LABEL, STATUS_ORDER, type WatchStatus } from "@/lib/store";

/**
 * A slim, personal "your shelf at a glance" strip for the home page. Shows a
 * live status breakdown bar plus a couple of headline numbers, so a returning
 * user immediately sees their collection taking shape. Renders nothing until
 * there's a library to summarise, so new users aren't shown an empty box.
 */
export function LibraryPulse() {
  const mounted = useMounted();
  const entries = useEntriesList();

  const data = useMemo(() => {
    const counts = {} as Record<WatchStatus, number>;
    for (const s of STATUS_ORDER) counts[s] = 0;
    let animeEps = 0;
    for (const e of entries) {
      counts[e.status] = (counts[e.status] ?? 0) + 1;
      if (e.media.type === "ANIME") animeEps += e.progress + (e.media.episodes ?? 0) * e.rewatches;
    }
    const hours = Math.round((animeEps * 24) / 60);
    return { counts, total: entries.length, hours };
  }, [entries]);

  if (!mounted || data.total === 0) return null;

  const segments = STATUS_ORDER.filter((s) => data.counts[s] > 0);

  return (
    <section className="container">
      <Link
        href="/library"
        className="glass glass-interactive group block rounded-3xl p-4 outline-none focus-visible:ring-2 focus-visible:ring-waku-400 sm:p-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-waku-500/15 text-waku-cinematic ring-1 ring-inset ring-waku-400/25">
              <Sparkles className="h-[18px] w-[18px]" />
            </span>
            <div>
              <h2 className="font-display text-base font-bold text-white sm:text-lg">Your shelf</h2>
              <p className="text-xs text-white/45">
                {data.total} {data.total === 1 ? "title" : "titles"}
                {data.hours > 0 && <> · {data.hours.toLocaleString()}h watched</>}
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-sm font-medium text-white/60 transition-colors group-hover:text-white">
            Open library
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>

        {/* status breakdown bar */}
        <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
          {segments.map((s) => (
            <span
              key={s}
              className="h-full transition-[flex-grow] duration-500"
              style={{ flexGrow: data.counts[s], background: STATUS_META[s].color, opacity: 0.9 }}
              title={`${STATUS_LABEL[s]}: ${data.counts[s]}`}
            />
          ))}
        </div>

        {/* legend */}
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
          {segments.map((s) => {
            const meta = STATUS_META[s];
            return (
              <span key={s} className="flex items-center gap-1.5 text-xs text-white/55">
                <span className="h-2 w-2 rounded-full" style={{ background: meta.color }} />
                {STATUS_LABEL[s]}
                <span className="font-semibold tabular-nums text-white/80">{data.counts[s]}</span>
              </span>
            );
          })}
        </div>
      </Link>
    </section>
  );
}
