"use client";

import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type TriState = "off" | "include" | "exclude";

export function nextState(s: TriState): TriState {
  return s === "off" ? "include" : s === "include" ? "exclude" : "off";
}

export function ThreeStateChip({
  label,
  state,
  onClick,
  disabled,
}: {
  label: string;
  state: TriState;
  onClick: () => void;
  disabled?: boolean;
}) {
  const stateWord = state === "include" ? "included" : state === "exclude" ? "excluded" : "off";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-pressed={state !== "off"}
      aria-label={`${label} — ${stateWord}. Tap to change.`}
      title={disabled ? "Filter limit reached" : undefined}
      className={cn(
        "group inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium outline-none ring-1 ring-inset transition-all duration-200 focus-visible:ring-2 focus-visible:ring-waku-400",
        state === "off" &&
          "bg-white/5 text-white/60 ring-white/10 hover:bg-white/10 hover:text-white/80",
        state === "include" &&
          "bg-emerald-500/20 text-emerald-100 ring-emerald-400/40",
        state === "exclude" &&
          "bg-rose-500/20 text-rose-100 ring-rose-400/40 line-through decoration-rose-300/60",
        disabled && "cursor-not-allowed opacity-40 hover:bg-white/5",
      )}
    >
      {state === "include" && <Check className="h-3 w-3 shrink-0" />}
      {state === "exclude" && <X className="h-3 w-3 shrink-0" />}
      <span className="truncate">{label}</span>
    </button>
  );
}
