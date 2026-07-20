"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { useWaku } from "@/lib/store";
import { useAuthGate } from "@/lib/use-auth-gate";
import { tierForScore, GRADE_TIERS, type Tier } from "@/lib/rating";
import { SMART_MIN_REFERENCES } from "@/lib/smart-rating";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * The dedicated rating menu — a verdict-grade picker.
 *
 * Mounted once globally; opens whenever the store has a `pendingRate` (set on
 * completion, or via `requestRate`). You pick a letter grade (S…F); the store
 * keeps a 0–10 anchor behind it so Smart Rating comparisons can still resolve
 * exact rankings. Smart Rate leads once enough references exist.
 */
export function RatingPrompt() {
  const pendingRate = useWaku((s) => s.pendingRate);
  const entries = useWaku((s) => s.entries);
  const rateById = useWaku((s) => s.rateById);
  const clearPendingRate = useWaku((s) => s.clearPendingRate);
  const { gated } = useAuthGate();

  const entry = pendingRate != null ? entries[pendingRate] : undefined;
  const previous = entry?.score ?? null;
  const prevTier = previous != null ? tierForScore(previous) : null;

  const referenceCount = Object.values(entries).filter(
    (e) => e.score != null && e.media.id !== pendingRate,
  ).length;

  // Draft holds the chosen grade's tier; default to "Great" (B).
  const defaultTier = GRADE_TIERS.find((t) => t.key === "great") ?? GRADE_TIERS[2];
  const [tier, setTier] = useState<Tier>(prevTier ?? defaultTier);
  const saveRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (pendingRate != null) {
      const t = entry?.score != null ? tierForScore(entry.score) : defaultTier;
      setTier(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingRate]);

  useEffect(() => {
    if (pendingRate == null) return;
    const idx = () => GRADE_TIERS.findIndex((t) => t.key === tier.key);
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Escape") return clearPendingRate();
      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        setTier(GRADE_TIERS[Math.max(0, idx() - 1)]);
      } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        setTier(GRADE_TIERS[Math.min(GRADE_TIERS.length - 1, idx() + 1)]);
      } else if (e.key === "Enter") {
        e.preventDefault();
        saveRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pendingRate, tier, clearPendingRate]);

  const open = pendingRate != null && !!entry && !gated;
  const smartUnlocked = referenceCount >= SMART_MIN_REFERENCES;

  const save = () => {
    if (pendingRate != null) rateById(pendingRate, tier.anchor);
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
                  {previous != null ? "Update your verdict" : "You finished it"}
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

            <div className="px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-6">
              {/* big verdict */}
              <div className="flex flex-col items-center" aria-live="polite">
                <span
                  className="flex h-24 w-24 items-center justify-center rounded-3xl font-black leading-none"
                  style={{ background: tier.soft, color: tier.text, boxShadow: `inset 0 0 0 2px ${tier.color}` }}
                >
                  <span className="text-6xl">{tier.grade}</span>
                </span>
                <p className="mt-3 font-display text-2xl font-extrabold uppercase tracking-wide" style={{ color: tier.text }}>
                  {tier.label}
                </p>
                {prevTier && prevTier.key !== tier.key && (
                  <p className="mt-1 text-xs text-white/45">
                    Previously <span className="font-bold text-white/75">{prevTier.grade}</span>
                  </p>
                )}
              </div>

              {/* grade ladder */}
              <div className="mt-6 grid grid-cols-7 gap-1.5" role="radiogroup" aria-label="Grade">
                {GRADE_TIERS.map((t) => {
                  const active = t.key === tier.key;
                  return (
                    <button
                      key={t.key}
                      role="radio"
                      aria-checked={active}
                      aria-label={`${t.grade} — ${t.label}`}
                      onClick={() => setTier(t)}
                      className={cn(
                        "flex aspect-square items-center justify-center rounded-xl text-lg font-black outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-waku-400",
                      )}
                      style={{
                        background: t.soft,
                        color: t.text,
                        boxShadow: active ? `inset 0 0 0 2px ${t.color}` : `inset 0 0 0 1px ${t.color}44`,
                        transform: active ? "scale(1.08)" : undefined,
                      }}
                    >
                      {t.grade}
                    </button>
                  );
                })}
              </div>
              <div className="mt-1.5 flex justify-between px-0.5 text-[9px] font-bold uppercase tracking-wider text-white/30">
                <span>Peak</span>
                <span>Terrible</span>
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
                      <Button variant="glass" size="md" className="flex-1" onClick={save}>
                        Save {tier.grade}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Button variant="accent" size="lg" className="w-full glow-accent" onClick={save}>
                      Save verdict · {tier.grade}
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
