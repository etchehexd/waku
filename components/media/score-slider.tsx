"use client";

import { tierForScore } from "@/lib/rating";
import { cn, formatScore } from "@/lib/utils";

/** Quick-pick anchors for common verdicts (decimals allowed). */
export const QUICK_SCORES = [3, 5, 6, 7, 8, 8.5, 9, 9.5, 10];

/**
 * The 0–10 decimal rating control — a tier-colored range slider (0.5 steps)
 * plus quick-pick chips. The track fills to the current value in the tier color
 * so the slider itself reads as a verdict, not just a widget.
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
  const tier = tierForScore(value);
  const pct = (value / 10) * 100;
  const commit = () => onCommit?.(value);

  return (
    <div>
      <div className="relative flex items-center">
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onPointerUp={commit}
          onKeyUp={commit}
          onTouchEnd={commit}
          aria-label={`${label}: ${formatScore(value)} out of 10`}
          className="score-range h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 outline-none focus-visible:ring-2 focus-visible:ring-waku-400"
          style={{
            background: `linear-gradient(to right, ${tier.color} 0%, ${tier.color} ${pct}%, rgba(255,255,255,0.1) ${pct}%, rgba(255,255,255,0.1) 100%)`,
          }}
        />
      </div>

      {/* scale ticks 0..10 */}
      <div className="mt-1.5 flex justify-between px-0.5 text-[10px] font-semibold tabular-nums text-white/30">
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
