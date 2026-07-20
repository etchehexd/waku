"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, Star } from "lucide-react";
import { useWaku } from "@/lib/store";
import { useAuthGate } from "@/lib/use-auth-gate";
import { tierForScore } from "@/lib/rating";
import { SMART_MIN_REFERENCES } from "@/lib/smart-rating";
import { RatingSlider } from "./rating-slider";
import { ScoreBadge } from "./score-badge";
import { Button } from "@/components/ui/button";

const QUICK = [3, 5, 6, 7, 8, 9, 9.5, 10];

/**
 * The dedicated rating menu. Mounted once globally; opens whenever the store
 * has a `pendingRate` — set automatically when a title is completed, or on
 * demand via `requestRate` (e.g. tapping an existing score to edit it).
 *
 * Flat and editorial to match the site's rating display: the tier-colored
 * numeral is the hero, a linear slider sets it, and quick chips jump to common
 * scores. Smart Rate leads once enough references exist.
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
      if (e.key === "Escape") {
        clearPendingRate();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        setDraft((d) => Math.min(10, Math.round((d + 0.1) * 10) / 10));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        setDraft((d) => Math.max(0, Math.round((d - 0.1) * 10) / 10));
      } else if (e.key === "Enter") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingRate, clearPendingRate]);

  const open = pendingRate != null && !!entry && !gated;
  const smartUnlocked = referenceCount >= SMART_MIN_REFERENCES;
  const tier = tierForScore(draft);

  const save = () => {
    if (pendingRate != null) rateById(pendingRate, Math.round(draft * 10) / 10);
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
            {/* header row — flat, no blurred banner */}
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

            {/* editorial numeral + verdict */}
            <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
              <div className="flex flex-col items-center">
                <ScoreBadge score={draft} size="xl" plate={false} />
                <p
                  className="mt-2 font-display text-xl font-extrabold uppercase tracking-wide"
                  style={{ color: tier.text }}
                  aria-live="polite"
                >
                  {tier.label}
                  <span className="sr-only"> — {draft.toFixed(1)} out of 10</span>
                </p>
                {previous != null && (
                  <p className="mt-1 text-xs text-white/45">
                    Previously{" "}
                    <span className="font-semibold tabular-nums text-white/75">{previous.toFixed(1)}</span>
                  </p>
                )}
              </div>

              {/* slider */}
              <div className="mt-4">
                <RatingSlider value={draft} onChange={setDraft} onCommit={setDraft} />
              </div>

              {/* quick numeric chips */}
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                {QUICK.map((v) => {
                  const t = tierForScore(v);
                  const active = Math.abs(draft - v) < 0.05;
                  return (
                    <button
                      key={v}
                      onClick={() => setDraft(v)}
                      className="rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-waku-400"
                      style={{
                        background: t.soft,
                        color: t.text,
                        boxShadow: active ? `inset 0 0 0 1.5px ${t.color}` : `inset 0 0 0 1px ${t.color}33`,
                      }}
                    >
                      {v.toFixed(1)}
                    </button>
                  );
                })}
              </div>

              {/* actions */}
              <div className="mt-6 w-full space-y-2">
                {smartUnlocked ? (
                  <>
                    <Link href={`/rate?focus=${pendingRate}`} onClick={clearPendingRate} className="block">
                      <Button variant="accent" size="lg" className="w-full glow-accent">
                        <Sparkles className="h-4 w-4" /> Smart Rate — place it by comparison
                      </Button>
                    </Link>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="md" className="flex-1" onClick={clearPendingRate}>
                        Not now
                      </Button>
                      <Button
                        variant="glass"
                        size="md"
                        className="flex-1"
                        onClick={save}
                        aria-label={`Save rating of ${draft.toFixed(1)} out of 10 for ${entry.media.title}`}
                      >
                        <Star className="h-4 w-4 fill-current" /> Save {draft.toFixed(1)}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Button
                      variant="accent"
                      size="lg"
                      className="w-full glow-accent"
                      onClick={save}
                      aria-label={`Save rating of ${draft.toFixed(1)} out of 10 for ${entry.media.title}`}
                    >
                      <Star className="h-4 w-4 fill-current" /> Save {draft.toFixed(1)}
                    </Button>
                    <Button variant="ghost" size="md" className="w-full" onClick={clearPendingRate}>
                      Not now
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
