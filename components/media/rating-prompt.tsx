"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { useWaku, isRateable } from "@/lib/store";
import { useAuthGate } from "@/lib/use-auth-gate";
import { SMART_MIN_REFERENCES } from "@/lib/smart-rating";
import { Button } from "@/components/ui/button";
import { ScoreSlider } from "./score-slider";
import { ScoreDial } from "./score-dial";
import { formatScore } from "@/lib/utils";

/**
 * The rating menu — a 0–10 scale with decimals.
 *
 * Opens only for finished titles (the store guards `pendingRate`). Drag the
 * slider (½-point steps) or tap a quick pick; Smart Rating comparisons still
 * resolve exact ranking order for finer placement.
 */
export function RatingPrompt() {
  const pendingRate = useWaku((s) => s.pendingRate);
  const entries = useWaku((s) => s.entries);
  const rateById = useWaku((s) => s.rateById);
  const clearPendingRate = useWaku((s) => s.clearPendingRate);
  const { gated } = useAuthGate();

  const entry = pendingRate != null ? entries[pendingRate] : undefined;
  const previous = entry?.score ?? null;

  const referenceCount = Object.values(entries).filter(
    (e) => e.score != null && e.media.id !== pendingRate,
  ).length;

  const [draft, setDraft] = useState(previous ?? 7.5);
  const saveRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (pendingRate != null) setDraft(entry?.score ?? 7.5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRate]);

  useEffect(() => {
    if (pendingRate == null) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Escape") return clearPendingRate();
      if (e.key === "ArrowUp" || e.key === "ArrowRight") {
        e.preventDefault();
        setDraft((d) => Math.min(10, d + 0.5));
      } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
        e.preventDefault();
        setDraft((d) => Math.max(0, d - 0.5));
      } else if (e.key === "Enter") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingRate, clearPendingRate]);

  // Guard: only finished titles can be rated. @see isRateable
  const canRate = isRateable(entry);
  const open = pendingRate != null && canRate && !gated;
  const smartUnlocked = referenceCount >= SMART_MIN_REFERENCES;

  const save = () => {
    if (pendingRate != null) rateById(pendingRate, draft);
    clearPendingRate();
  };
  saveRef.current = save;

  return (
    <AnimatePresence>
      {open && entry && (
        <motion.div
          className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={`Rate ${entry.media.title}`}
        >
          <div className="absolute inset-0 bg-abyss-950/85 backdrop-blur-md" onClick={clearPendingRate} />

          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="relative z-10 w-full max-w-md overflow-hidden rounded-t-4xl border border-white/10 bg-abyss-900 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.8)] sm:rounded-4xl sm:shadow-[0_30px_80px_-24px_rgba(0,0,0,0.85)]"
          >
            {/* header */}
            <div className="flex items-center gap-3 border-b border-white/[0.07] p-4">
              <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-abyss-700 ring-1 ring-white/12">
                {entry.media.cover && (
                  <Image src={entry.media.cover} alt="" fill sizes="40px" className="object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-waku-cinematic">
                  {previous != null ? "Update your rating" : "You finished it"}
                </p>
                <h3 className="truncate font-display text-lg font-extrabold leading-tight text-white">
                  {entry.media.title}
                </h3>
              </div>
              <button
                onClick={clearPendingRate}
                className="shrink-0 rounded-full p-1.5 text-white/50 outline-none transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
              {/* live tier graphic */}
              <div className="flex flex-col items-center" aria-live="polite">
                <ScoreDial value={draft} />
                {previous != null && previous !== draft && (
                  <p className="mt-2 text-xs text-white/45">
                    Previously <span className="font-bold text-white/75">{formatScore(previous)}</span>
                  </p>
                )}
              </div>

              {/* the slider */}
              <div className="mt-5">
                <ScoreSlider value={draft} onChange={setDraft} />
              </div>

              {/* one clear primary action */}
              <div className="mt-6 space-y-2.5">
                <Button variant="accent" size="lg" className="w-full glow-accent" onClick={save}>
                  Save {formatScore(draft)} / 10
                </Button>
                <div className="flex items-center gap-2">
                  {smartUnlocked && (
                    <Link href={`/rate?focus=${pendingRate}`} onClick={clearPendingRate} className="flex-1">
                      <Button variant="glass" size="md" className="w-full">
                        <Sparkles className="h-4 w-4" /> Smart Rate
                      </Button>
                    </Link>
                  )}
                  <Button
                    variant="ghost"
                    size="md"
                    className={smartUnlocked ? "flex-1" : "w-full"}
                    onClick={clearPendingRate}
                  >
                    Not now
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
