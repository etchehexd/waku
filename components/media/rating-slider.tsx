"use client";

import { useCallback, useRef, useState } from "react";
import { tierForScore } from "@/lib/rating";
import { cn } from "@/lib/utils";

interface RatingSliderProps {
  /** current 0–10 value (one decimal) */
  value: number;
  onChange: (v: number) => void;
  /** fired when the user releases the drag / finishes a keyboard change */
  onCommit?: (v: number) => void;
  className?: string;
}

const clamp = (v: number) => Math.min(10, Math.max(0, Math.round(v * 10) / 10));

/**
 * Flat, editorial rating input — a horizontal track filled in the live tier
 * color, with integer ticks and a draggable knob. Matches the site's flat
 * rating display (no glowing dial); the big numeral lives above it in the menu.
 * Fully keyboard-accessible as a slider (arrows ±0.1, PageUp/Down ±1, Home/End).
 */
export function RatingSlider({ value, onChange, onCommit, className }: RatingSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const tier = tierForScore(value);
  const pct = Math.max(0, Math.min(1, value / 10));

  const scoreFromX = useCallback((clientX: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    const t = (clientX - rect.left) / rect.width;
    return clamp(t * 10);
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    onChange(scoreFromX(e.clientX));
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging) onChange(scoreFromX(e.clientX));
  };
  const endDrag = (e: React.PointerEvent) => {
    if (!dragging) return;
    setDragging(false);
    onCommit?.(scoreFromX(e.clientX));
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    let next: number | null = null;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") next = clamp(value + 0.1);
    else if (e.key === "ArrowDown" || e.key === "ArrowLeft") next = clamp(value - 0.1);
    else if (e.key === "PageUp") next = clamp(value + 1);
    else if (e.key === "PageDown") next = clamp(value - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = 10;
    if (next != null) {
      e.preventDefault();
      onChange(next);
      onCommit?.(next);
    }
  };

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label="Score"
      aria-valuemin={0}
      aria-valuemax={10}
      aria-valuenow={value}
      aria-valuetext={value.toFixed(1)}
      onKeyDown={onKeyDown}
      className={cn(
        "relative w-full select-none py-3 outline-none",
        dragging ? "cursor-grabbing" : "cursor-pointer",
        className,
      )}
      style={{ touchAction: "none" }}
    >
      {/* focus ring target */}
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative h-3 rounded-full bg-white/10"
      >
        {/* filled portion */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-150"
          style={{ width: `${pct * 100}%`, background: tier.color, transitionDuration: dragging ? "0ms" : undefined }}
        />
        {/* integer ticks */}
        {Array.from({ length: 9 }, (_, i) => (
          <span
            key={i}
            aria-hidden
            className="absolute top-1/2 h-1 w-px -translate-y-1/2 bg-white/25"
            style={{ left: `${((i + 1) / 10) * 100}%` }}
          />
        ))}
        {/* knob */}
        <span
          aria-hidden
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_8px_-2px_rgba(0,0,0,0.6)] transition-transform"
          style={{
            left: `${pct * 100}%`,
            width: dragging ? 22 : 18,
            height: dragging ? 22 : 18,
            boxShadow: `0 0 0 3px ${tier.color}`,
          }}
        />
      </div>

      {/* scale labels */}
      <div className="mt-2 flex justify-between px-0.5 text-[10px] font-medium tabular-nums text-white/30">
        <span>0</span>
        <span>5</span>
        <span>10</span>
      </div>
    </div>
  );
}
