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
 * Live "next episode" indicator. Deliberately a compact chip rather than a
 * panel: it belongs in the hero's quiet stat strip, present at a glance
 * without competing with the title or the primary action.
 */
export function AiringCountdown({
  airingAt,
  episode,
  className,
}: {
  airingAt: number;
  episode: number;
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
      <span className="tabular-nums text-white">
        {remaining == null ? "—" : fmt(remaining)}
      </span>
    </span>
  );
}
