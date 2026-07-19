"use client";

import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { useWaku, type LibraryEntry } from "@/lib/store";
import { entryTotal, unitWord } from "@/lib/library-filters";
import { cn } from "@/lib/utils";

/**
 * Fast progress editor for a library entry: decrement, direct numeric entry,
 * and increment. Clamps to [0, total] on manual edits, blocks incrementing
 * past a known total, and floors at zero. When AniList publishes no total the
 * count stays free-form and is labelled with its unit instead of a fraction.
 * A refresh that lowers the total below the user's progress is never
 * destructive — the stored value is preserved and shown as-is.
 */
export function ProgressControl({
  entry,
  size = "md",
}: {
  entry: LibraryEntry;
  size?: "sm" | "md";
}) {
  const setProgress = useWaku((s) => s.setProgress);
  const total = entryTotal(entry);
  const value = entry.progress;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  // Stay in sync when the value changes underneath us (e.g. a refresh).
  useEffect(() => {
    if (!editing) setDraft(String(value));
  }, [value, editing]);

  const atMax = total != null && value >= total;
  const canDec = value > 0;

  const commit = () => {
    let n = parseInt(draft, 10);
    if (!Number.isFinite(n)) n = value;
    n = Math.max(0, n);
    if (total != null) n = Math.min(n, total); // clamp manual entry to the total
    setProgress(entry.media.id, n);
    setEditing(false);
  };

  const dec = () => canDec && setProgress(entry.media.id, value - 1);
  const inc = () => !atMax && setProgress(entry.media.id, value + 1);

  const stepBtn =
    "flex items-center justify-center rounded-full text-white/80 outline-none ring-1 ring-inset ring-white/12 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400 disabled:opacity-30 disabled:hover:bg-transparent";
  // Row height is set by the 56px cover, so 32px targets cost no vertical space.
  const dim = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const title = entry.media.title;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={dec}
        disabled={!canDec}
        className={cn(stepBtn, dim)}
        aria-label={`Decrease progress for ${title}`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          min={0}
          max={total ?? undefined}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(String(value));
              setEditing(false);
            }
          }}
          aria-label={`Set progress for ${title}${total != null ? `, 0 to ${total}` : ""}`}
          className="input-field h-8 w-12 !rounded-lg px-1 text-center text-xs font-semibold tabular-nums !ring-waku-400/70"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(String(value));
            setEditing(true);
          }}
          className="flex h-8 min-w-[3rem] items-center justify-center rounded-lg px-1.5 text-center text-xs font-semibold tabular-nums text-white outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-waku-400"
          aria-label={`Edit progress for ${title}, currently ${value}${total != null ? ` of ${total}` : ` ${unitWord(entry, true)}`}`}
        >
          <span className="text-white">{value}</span>
          {total != null ? (
            <span className="text-white/45">/{total}</span>
          ) : (
            <span className="ml-1 text-[10px] font-medium uppercase tracking-wide text-white/40">
              {unitWord(entry, true)}
            </span>
          )}
        </button>
      )}

      <button
        type="button"
        onClick={inc}
        disabled={atMax}
        className={cn(stepBtn, dim)}
        aria-label={
          atMax
            ? `Progress complete for ${title}`
            : `Increase progress for ${title}`
        }
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
