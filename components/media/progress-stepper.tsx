"use client";

import { Minus, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type StepperSize = "sm" | "md";

/**
 * The one progress control used everywhere — library rows, the add-to-library
 * sheet, and the detail page. A single rounded "box" with a minus, the live
 * count, and a plus. Controlled: the caller owns the value and clamps as needed.
 * At the known total the plus turns into a completed check.
 */
export function ProgressStepper({
  value,
  total,
  onChange,
  size = "md",
  label = "progress",
}: {
  value: number;
  total: number | null;
  onChange: (next: number) => void;
  size?: StepperSize;
  /** Accessible noun, e.g. the title, for the button labels. */
  label?: string;
}) {
  const atMax = total != null && value >= total;
  const canDec = value > 0;
  const btn = size === "sm" ? "h-8 w-8" : "h-9 w-9";
  const text = size === "sm" ? "text-[12px]" : "text-sm";

  return (
    <div className="inline-flex items-center rounded-xl bg-white/[0.05] p-0.5 ring-1 ring-inset ring-white/10">
      <button
        type="button"
        onClick={() => canDec && onChange(value - 1)}
        disabled={!canDec}
        aria-label={`Decrease ${label}`}
        className={cn(
          "flex items-center justify-center rounded-lg text-white/70 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400 disabled:opacity-30 disabled:hover:bg-transparent",
          btn,
        )}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>

      <span className={cn("min-w-[3.25rem] px-1 text-center font-bold tabular-nums text-white", text)}>
        {value}
        {total != null && <span className="font-medium text-white/40">/{total}</span>}
      </span>

      <button
        type="button"
        onClick={() => !atMax && onChange(value + 1)}
        disabled={atMax}
        aria-label={atMax ? `${label} complete` : `Increase ${label}`}
        className={cn(
          "flex items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
          btn,
          atMax
            ? "text-emerald-300"
            : "bg-gradient-to-br from-waku-500 to-iris-600 text-white hover:brightness-110",
        )}
      >
        {atMax ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
      </button>
    </div>
  );
}
