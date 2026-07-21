"use client";

import { useRef } from "react";
import { tierForScore, isPerfect, GOLD } from "@/lib/rating";
import { cn, formatScore } from "@/lib/utils";

const clamp = (n: number) => Math.max(0, Math.min(10, n));
const snap = (n: number) => Math.round(n * 2) / 2; // ½-point steps

/**
 * The rating input — a tall vertical gauge you drag to fill.
 *
 * Bottom is 0, top is 10; the fill rises in the tier color as you drag anywhere
 * on the column (or use the arrow keys). The score reads out huge alongside it.
 * Built for the immersive, cover-art rating sheet — deliberately nothing like a
 * horizontal slider.
 */
export function RateGauge({
  value,
  onChange,
}: {
  value: number;
  onChange: (next: number) => void;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const tier = tierForScore(value);
  const color = isPerfect(value) ? GOLD : tier.color;
  const pct = (value / 10) * 100;

  const fromClientY = (clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const ratio = 1 - (clientY - r.top) / r.height; // top = 10, bottom = 0
    onChange(snap(clamp(ratio * 10)));
  };

  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    fromClientY(e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging.current) fromClientY(e.clientY);
  };
  const endDrag = () => {
    dragging.current = false;
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    let next: number | null = null;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") next = clamp(value + 0.5);
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") next = clamp(value - 0.5);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 10;
    if (next != null) {
      e.preventDefault();
      onChange(next);
    }
  };

  return (
    <div className="flex items-stretch justify-center gap-6 sm:gap-8">
      {/* huge readout */}
      <div className="flex min-w-0 flex-col justify-center text-right" aria-live="polite">
        <span
          className="font-black leading-[0.85] tabular-nums drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)] transition-colors"
          style={{ color: tier.text, fontSize: "clamp(3.25rem, 15vw, 5.5rem)" }}
        >
          {formatScore(value)}
        </span>
        <span className="mt-1 text-sm font-bold text-white/40">out of 10</span>
        <span
          className="mt-3 self-end rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.2em] transition-colors"
          style={{ background: `${color}22`, color, boxShadow: `inset 0 0 0 1px ${color}66` }}
        >
          {tier.label}
        </span>
      </div>

      {/* the gauge */}
      <div className="flex items-center gap-2">
        {/* tick labels */}
        <div className="flex h-[clamp(200px,42vh,320px)] flex-col justify-between py-1 text-[10px] font-bold tabular-nums text-white/30">
          {[10, 8, 6, 4, 2, 0].map((n) => (
            <span key={n}>{n}</span>
          ))}
        </div>

        <div
          ref={trackRef}
          role="slider"
          tabIndex={0}
          aria-label="Your rating"
          aria-orientation="vertical"
          aria-valuemin={0}
          aria-valuemax={10}
          aria-valuenow={value}
          aria-valuetext={`${formatScore(value)} out of 10`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onKeyDown={onKeyDown}
          className="relative h-[clamp(200px,42vh,320px)] w-16 cursor-ns-resize touch-none select-none overflow-hidden rounded-3xl outline-none ring-1 ring-inset ring-white/15 backdrop-blur-md focus-visible:ring-2 focus-visible:ring-white/60"
          style={{ background: "rgba(6,10,20,0.45)" }}
        >
          {/* fill */}
          <div
            className="absolute inset-x-0 bottom-0 transition-[height,background-color] duration-100"
            style={{
              height: `${pct}%`,
              background: `linear-gradient(0deg, ${color}, ${color}bb)`,
              boxShadow: `0 0 24px ${color}55`,
            }}
          />
          {/* midline hints */}
          {[25, 50, 75].map((y) => (
            <span key={y} className="absolute inset-x-2 h-px bg-white/10" style={{ bottom: `${y}%` }} aria-hidden />
          ))}
          {/* grabber at the fill edge */}
          <div
            className="absolute inset-x-1.5 flex -translate-y-1/2 items-center justify-center"
            style={{ bottom: `${pct}%` }}
            aria-hidden
          >
            <div className="h-1.5 w-full rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.6)]" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Small quick-pick row shared with the sheet — decimals allowed. */
export const RATE_QUICK = [5, 6, 7, 8, 8.5, 9, 9.5, 10];

export function QuickPicks({
  value,
  onPick,
  className,
}: {
  value: number;
  onPick: (n: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap justify-center gap-1.5", className)}>
      {RATE_QUICK.map((n) => {
        const t = tierForScore(n);
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(n)}
            className="min-w-10 rounded-lg px-2.5 py-1.5 text-[13px] font-black tabular-nums outline-none backdrop-blur-md transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-white/60"
            style={{
              background: active ? t.color : `${t.color}22`,
              color: active ? "#0a0e1c" : t.text,
              boxShadow: `inset 0 0 0 1px ${t.color}${active ? "" : "55"}`,
            }}
          >
            {formatScore(n)}
          </button>
        );
      })}
    </div>
  );
}
