"use client";

import { X } from "lucide-react";
import { tierForScore } from "@/lib/rating";
import { cn } from "@/lib/utils";

/** The same quick values the full rating dial offers. */
export const QUICK_SCORES = [3, 5, 6, 7, 8, 9, 9.5, 10];

/**
 * Compact optional score chips, tinted by rating tier. This is the quick path;
 * the full dial (RatingPrompt) remains the place for precise scoring.
 */
export function ScorePicker({
  value,
  onChange,
  onClear,
}: {
  value: number | null;
  onChange: (score: number) => void;
  /** When provided, shows a control to clear the selection. */
  onClear?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {QUICK_SCORES.map((v) => {
        const t = tierForScore(v);
        const active = value != null && Math.abs(value - v) < 0.05;
        return (
          <button
            key={v}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(v)}
            className={cn(
              "h-8 min-w-[2.5rem] rounded-xl px-2 text-xs font-semibold tabular-nums outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-waku-400",
            )}
            style={{
              background: t.soft,
              color: t.text,
              boxShadow: active ? `inset 0 0 0 1.5px ${t.color}` : `inset 0 0 0 1px ${t.color}33`,
            }}
          >
            {v.toFixed(1)}
          </button>
        );
      })}
      {onClear && value != null && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear rating"
          className="flex h-8 w-8 items-center justify-center rounded-xl text-white/45 outline-none ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
