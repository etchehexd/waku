"use client";

import { useCallback, useRef, useState } from "react";
import { tierForScore, isPerfect, GOLD } from "@/lib/rating";
import { cn } from "@/lib/utils";

interface RatingRingProps {
  /** current 0–10 value (one decimal) */
  value: number;
  onChange: (v: number) => void;
  /** fired when the user releases the drag / finishes a keyboard change */
  onCommit?: (v: number) => void;
  size?: number;
  className?: string;
}

const clamp = (v: number) => Math.min(10, Math.max(0, Math.round(v * 10) / 10));

/**
 * The score ring as the input itself: drag anywhere around the circle to
 * fill it, the number updates live in the center. Also keyboard-accessible
 * as a slider (arrows ±0.1, PageUp/Down ±1, Home/End).
 */
export function RatingRing({ value, onChange, onCommit, size = 176, className }: RatingRingProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const lastRef = useRef(value);
  const [dragging, setDragging] = useState(false);

  const stroke = 12;
  const pad = 10; // room for the knob
  const r = (size - stroke) / 2 - pad;
  const cx = size / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / 10));
  const tier = tierForScore(value);
  const perfect = isPerfect(value);
  // Perfect 10 stays the tier's blue and gains a gold outline — never all gold.
  const color = tier.color;
  const goldR = r + stroke / 2 + 4;

  // knob position — angle measured clockwise from 12 o'clock
  const theta = pct * Math.PI * 2;
  const knobX = cx + r * Math.sin(theta);
  const knobY = cx - r * Math.cos(theta);

  const scoreFromPoint = useCallback((clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const dx = clientX - (rect.left + rect.width / 2);
    const dy = clientY - (rect.top + rect.height / 2);
    let ang = Math.atan2(dx, -dy); // 0 at top, clockwise positive
    if (ang < 0) ang += Math.PI * 2;
    return clamp((ang / (Math.PI * 2)) * 10);
  }, []);

  const applyPoint = useCallback(
    (clientX: number, clientY: number) => {
      let s = scoreFromPoint(clientX, clientY);
      // wrap guard — don't let a drag past 12 o'clock snap 10 → 0 (or back)
      if (Math.abs(s - lastRef.current) > 8) s = lastRef.current > 5 ? 10 : 0;
      lastRef.current = s;
      onChange(s);
    },
    [scoreFromPoint, onChange],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setDragging(true);
    lastRef.current = value;
    applyPoint(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging) applyPoint(e.clientX, e.clientY);
  };
  const endDrag = () => {
    if (!dragging) return;
    setDragging(false);
    onCommit?.(lastRef.current);
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
      lastRef.current = next;
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
        "relative select-none rounded-full outline-none focus-visible:ring-2 focus-visible:ring-waku-400 focus-visible:ring-offset-4 focus-visible:ring-offset-abyss-950",
        dragging ? "cursor-grabbing" : "cursor-pointer",
        className,
      )}
      style={{ width: size, height: size, touchAction: "none" }}
    >
      <svg
        ref={svgRef}
        width={size}
        height={size}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        aria-hidden
      >
        {/* track */}
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={stroke} />
        {/* tick marks at whole numbers */}
        {Array.from({ length: 10 }, (_, i) => {
          const a = ((i + 1) / 10) * Math.PI * 2;
          const x1 = cx + (r - stroke / 2 - 3) * Math.sin(a);
          const y1 = cx - (r - stroke / 2 - 3) * Math.cos(a);
          const x2 = cx + (r + stroke / 2 + 3) * Math.sin(a);
          const y2 = cx - (r + stroke / 2 + 3) * Math.cos(a);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.14)" strokeWidth={1} />
          );
        })}
        {/* progress arc */}
        <circle
          cx={cx}
          cy={cx}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${cx} ${cx})`}
          style={{ transition: dragging ? "none" : "stroke-dashoffset 0.35s cubic-bezier(0.22,1,0.36,1)" }}
        />
        {/* gold outline ring for a perfect 10 — static, no pulse */}
        {perfect && (
          <circle cx={cx} cy={cx} r={goldR} fill="none" stroke={GOLD} strokeWidth={2.5} opacity={0.85} />
        )}
        {/* knob */}
        <circle
          cx={knobX}
          cy={knobY}
          r={dragging ? 11 : 9}
          fill="#0b1124"
          stroke={color}
          strokeWidth={3}
          style={{ transition: dragging ? "none" : "all 0.35s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>

      {/* center readout */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold tabular-nums leading-none tracking-tight" style={{ color }}>
          {value.toFixed(1)}
        </span>
        <span className="mt-2 text-[10px] font-medium uppercase tracking-widest text-white/35">
          drag to rate
        </span>
      </div>
    </div>
  );
}
