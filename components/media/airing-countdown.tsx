"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(secs: number) {
  if (secs <= 0) return "Airing now";
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

/**
 * Live "next episode" indicator.
 *
 * Two forms: the default compact chip for quiet stat strips, and a `prominent`
 * banner — bigger type, a pulsing live dot, an accent-tinted plate — for the
 * detail hero, where "when's the next episode?" should be answerable at a
 * glance without hunting.
 */
export function AiringCountdown({
  airingAt,
  episode,
  prominent = false,
  className,
}: {
  airingAt: number;
  episode: number;
  prominent?: boolean;
  className?: string;
}) {
  // Start null so server and first client render agree, then tick on mount.
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(airingAt - Math.floor(Date.now() / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [airingAt]);

  const time = remaining == null ? "—" : fmt(remaining);

  if (prominent) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-3 rounded-2xl bg-waku-500/15 px-4 py-2.5 ring-1 ring-inset ring-waku-300/40 backdrop-blur-md",
          className,
        )}
        title={`Episode ${episode} airs ${new Date(airingAt * 1000).toLocaleString()}`}
      >
        {/* pulsing live dot */}
        <span className="relative flex h-3 w-3 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-waku-cinematic opacity-70 motion-reduce:hidden" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-waku-cinematic" />
        </span>
        <div className="leading-tight">
          <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-waku-cinematic">
            Next episode
          </span>
          <span className="flex items-baseline gap-1.5 font-display text-base font-extrabold text-white">
            EP {episode}
            <span className="text-white/40">·</span>
            <span className="tabular-nums">{time}</span>
          </span>
        </div>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-waku-500/15 px-3 py-1.5 text-xs font-medium text-waku-50 ring-1 ring-inset ring-waku-300/30 backdrop-blur-md",
        className,
      )}
      title={`Episode ${episode} airs ${new Date(airingAt * 1000).toLocaleString()}`}
    >
      <Radio className="h-3.5 w-3.5 shrink-0 text-waku-cinematic" />
      <span className="text-white/55">EP {episode}</span>
      <span className="tabular-nums text-white">{time}</span>
    </span>
  );
}
