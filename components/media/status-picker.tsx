"use client";

import { Check } from "lucide-react";
import { STATUS_LABEL, STATUS_ORDER, type WatchStatus } from "@/lib/store";
import { STATUS_META } from "./status-meta";
import { cn } from "@/lib/utils";

/** What each status means, so the choice is obvious rather than jargon. */
const STATUS_HINT: Record<WatchStatus, { anime: string; manga: string }> = {
  CURRENT: { anime: "Watching now", manga: "Reading now" },
  REWATCHING: { anime: "Watching again", manga: "Reading again" },
  COMPLETED: { anime: "Finished it", manga: "Finished it" },
  PAUSED: { anime: "Taking a break", manga: "Taking a break" },
  PLANNING: { anime: "Want to watch", manga: "Want to read" },
  DROPPED: { anime: "Gave up on it", manga: "Gave up on it" },
};

/**
 * A spacious, scannable status chooser: one full-width row per status with its
 * icon, label and a plain-English hint. Rows are large tap targets, and the
 * active one is filled in its status color — far easier to read and hit than a
 * dense grid of tiles.
 */
export function StatusPicker({
  value,
  type,
  onSelect,
}: {
  value?: WatchStatus | null;
  type: "ANIME" | "MANGA";
  onSelect: (s: WatchStatus) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5" role="radiogroup" aria-label="Watch status">
      {STATUS_ORDER.map((s) => {
        const meta = STATUS_META[s];
        const Icon = meta.icon;
        const active = value === s;
        const hint = type === "ANIME" ? STATUS_HINT[s].anime : STATUS_HINT[s].manga;
        return (
          <button
            key={s}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(s)}
            className={cn(
              "flex min-h-[3rem] w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left outline-none transition-all focus-visible:ring-2 focus-visible:ring-waku-400",
              active
                ? "text-white"
                : "bg-white/[0.04] ring-1 ring-inset ring-white/8 hover:bg-white/[0.08]",
            )}
            style={
              active
                ? { background: meta.soft, boxShadow: `inset 0 0 0 1.5px ${meta.color}` }
                : undefined
            }
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: active ? `${meta.color}2e` : "rgba(255,255,255,0.05)" }}
            >
              <Icon className="h-4 w-4" style={{ color: meta.color }} />
            </span>
            <span className="min-w-0 flex-1">
              <span className={cn("block text-sm font-semibold", active ? "text-white" : "text-white/85")}>
                {STATUS_LABEL[s]}
              </span>
              <span className="block truncate text-xs text-white/45">{hint}</span>
            </span>
            {active && (
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ background: meta.color }}
              >
                <Check className="h-3 w-3 text-abyss-950" strokeWidth={3} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
