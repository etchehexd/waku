"use client";

import { useRef } from "react";
import { tierForScore, isPerfect, GOLD } from "@/lib/rating";
import { cn, formatScore } from "@/lib/utils";

/** Quick-pick anchors for common verdicts (decimals allowed). */
export const QUICK_SCORES = [3, 5, 6, 7, 8, 8.5, 9, 9.5, 10];

const clamp = (n: number) => Math.max(0, Math.min(10, n));
const snap = (n: number) => Math.round(n * 2) / 2; // ½-point steps

/**
 * The 0–10 rating control — a bespoke, pointer-driven slider (not a stock HTML
 * range). A thick rounded rail fills to the value in the tier color; a large
 * grabbable puck rides the fill and shows the number while you drag. Tap or
 * drag anywhere on the rail, use arrow keys, or hit a quick-pick chip. Commits
 * (persist) fire on release, so dragging never spams the store.
 */
export function ScoreSlider({
  value,
  onChange,
  onCommit,
  quickPicks = true,
  label = "Score",
}: {
  value: number;
  onChange: (next: number) => void;
  /** Fired when the user finishes choosing (pointer/key release, or quick pick). */
  onCommit?: (value: number) => void;
  quickPicks?: boolean;
  label?: string;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const latest = useRef(value);
  latest.current = value;

  const tier = tierForScore(value);
  const color = isPerfect(value) ? GOLD : tier.color;
  const pct = (value / 10) * 100;

  const valueFromClientX = (clientX: number) => {
    const el = railRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const ratio = (clientX - rect.left) / rect.width;
    const next = snap(clamp(ratio * 10));
    if (next !== latest.current) onChange(next);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    valueFromClientX(e.clientX);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) valueFromClientX(e.clientX);
  };
  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    onCommit?.(latest.current);
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") next = clamp(value + 0.5);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = clamp(value - 0.5);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 10;
    if (next != null) {
      e.preventDefault();
      onChange(next);
      onCommit?.(next);
    }
  };

  return (
    <div>
      {/* rail */}
      <div
        ref={railRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={10}
        aria-valuenow={value}
        aria-valuetext={`${formatScore(value)} out of 10`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className="relative h-10 cursor-pointer touch-none select-none outline-none"
      >
        {/* base rail */}
        <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 overflow-hidden rounded-full bg-white/[0.08] ring-1 ring-inset ring-white/10">
          <div
            className="h-full rounded-full transition-[width,background-color] duration-150"
            style={{
              width: `${pct}%`,
              background: `linear-gradient(90deg, ${color}cc, ${color})`,
            }}
          />
        </div>
        {/* focus ring target */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full ring-waku-400/70 [.group:focus-visible_&]:ring-2" />
        {/* puck */}
        <div
          className="pointer-events-none absolute top-1/2 flex h-8 min-w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white px-2 text-[13px] font-black tabular-nums text-abyss-950 shadow-[0_3px_10px_-2px_rgba(0,0,0,0.6)] transition-[left] duration-150"
          style={{ left: `${pct}%`, boxShadow: `0 0 0 4px ${color}55, 0 3px 10px -2px rgba(0,0,0,0.6)` }}
        >
          {formatScore(value)}
        </div>
      </div>

      {/* scale ticks */}
      <div className="mt-2 flex justify-between px-1 text-[10px] font-semibold tabular-nums text-white/30">
        {[0, 2, 4, 6, 8, 10].map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>

      {quickPicks && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {QUICK_SCORES.map((n) => {
            const t = tierForScore(n);
            const active = value === n;
            return (
              <button
                key={n}
                type="button"
                aria-pressed={active}
                aria-label={`${formatScore(n)} out of 10`}
                onClick={() => {
                  onChange(n);
                  onCommit?.(n);
                }}
                className={cn(
                  "min-w-9 rounded-lg px-2 py-1.5 text-[13px] font-black tabular-nums outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-waku-400",
                )}
                style={{
                  background: t.soft,
                  color: t.text,
                  boxShadow: active ? `inset 0 0 0 2px ${t.color}` : `inset 0 0 0 1px ${t.color}33`,
                }}
              >
                {formatScore(n)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
