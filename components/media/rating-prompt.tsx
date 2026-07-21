"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, Check, Lock } from "lucide-react";
import { useWaku, isRateable, useSmartRatingGate } from "@/lib/store";
import { useAuthGate } from "@/lib/use-auth-gate";
import { RateGauge, QuickPicks } from "./rate-gauge";
import { formatScore } from "@/lib/utils";

/**
 * The rating menu — an immersive, cover-art rating sheet.
 *
 * The title's own artwork fills the sheet (blurred + dimmed for legibility);
 * a tall vertical gauge is dragged to set the 0–10 score, which reads out huge
 * beside it and shifts color by tier. Opens only for finished titles (the store
 * guards `pendingRate` via {@link isRateable}). One clear Save action.
 */
export function RatingPrompt() {
  const pendingRate = useWaku((s) => s.pendingRate);
  const entries = useWaku((s) => s.entries);
  const rateById = useWaku((s) => s.rateById);
  const clearPendingRate = useWaku((s) => s.clearPendingRate);
  const { gated } = useAuthGate();

  const entry = pendingRate != null ? entries[pendingRate] : undefined;
  const previous = entry?.score ?? null;

  // Smart Rating stays locked until 10 manual ratings exist. Reads the live
  // store gate, so saving the 10th rating unlocks it with no reload.
  const smart = useSmartRatingGate();

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
      if (e.key === "Enter") {
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

  const save = () => {
    if (pendingRate != null) rateById(pendingRate, draft);
    clearPendingRate();
  };
  saveRef.current = save;

  const art = entry?.media.cover ?? null;

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
            className="relative z-10 flex max-h-[94vh] w-full max-w-md flex-col overflow-hidden rounded-t-4xl border border-white/10 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.85)] sm:rounded-4xl sm:shadow-[0_30px_80px_-24px_rgba(0,0,0,0.85)]"
          >
            {/* immersive cover-art background */}
            <div className="absolute inset-0 -z-10">
              {art ? (
                <Image src={art} alt="" fill sizes="448px" className="scale-110 object-cover blur-2xl" priority />
              ) : (
                <div className="h-full w-full bg-abyss-800" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-abyss-950/80 via-abyss-950/75 to-abyss-950/92" />
              <div
                className="absolute inset-0"
                style={{ background: `radial-gradient(80% 50% at 50% 12%, ${entry.media.color || "#5b8cff"}33, transparent 70%)` }}
              />
            </div>

            {/* header */}
            <div className="flex items-center gap-3 p-4">
              <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-abyss-700 ring-1 ring-white/20">
                {art && <Image src={art} alt="" fill sizes="40px" className="object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/60">
                  {previous != null ? "Update your rating" : "Rate it"}
                </p>
                <h3 className="truncate font-display text-lg font-extrabold leading-tight text-white">
                  {entry.media.title}
                </h3>
              </div>
              <button
                onClick={clearPendingRate}
                className="shrink-0 rounded-full bg-white/10 p-1.5 text-white/70 outline-none backdrop-blur-md transition-colors hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* gauge */}
            <div className="flex min-h-0 flex-1 flex-col justify-center px-6 py-4">
              <RateGauge value={draft} onChange={setDraft} />
              <QuickPicks value={draft} onPick={setDraft} className="mt-6" />
              {previous != null && previous !== draft && (
                <p className="mt-4 text-center text-xs text-white/50">
                  Previously <span className="font-bold text-white/80">{formatScore(previous)}</span>
                </p>
              )}
            </div>

            {/* actions */}
            <div className="space-y-2.5 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button
                onClick={save}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white text-[15px] font-black text-abyss-950 outline-none transition-transform hover:scale-[1.01] focus-visible:ring-2 focus-visible:ring-white/60"
              >
                <Check className="h-5 w-5" /> Save {formatScore(draft)}
              </button>
              <div className="flex items-center gap-2">
                {/* Smart Rating is always SHOWN — locked with a reason, never
                    silently missing, so the feature is discoverable before it's
                    available. @see useSmartRatingGate */}
                {smart.unlocked ? (
                  <Link href={`/rate?focus=${pendingRate}`} onClick={clearPendingRate} className="flex-1">
                    <span className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl bg-white/10 text-sm font-bold text-white outline-none backdrop-blur-md transition-colors hover:bg-white/15">
                      <Sparkles className="h-4 w-4" /> Smart Rate
                    </span>
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled
                    aria-disabled
                    title={`Rate ${smart.required} titles by hand to unlock Smart Rating`}
                    className="flex h-10 flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-white/[0.06] text-sm font-bold text-white/40 backdrop-blur-md"
                  >
                    <Lock className="h-4 w-4" /> Smart Rate
                  </button>
                )}
                <button
                  onClick={clearPendingRate}
                  className="h-10 rounded-2xl px-4 text-sm font-semibold text-white/60 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-white/60"
                >
                  Not now
                </button>
              </div>
              {!smart.unlocked && (
                <p className="text-center text-[11px] text-white/45">
                  Rate {smart.required} shows to unlock Smart Rating ·{" "}
                  <span className="font-bold tabular-nums text-white/65">
                    {smart.manualCount}/{smart.required}
                  </span>
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
