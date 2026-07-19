"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles } from "lucide-react";
import { useWaku } from "@/lib/store";
import { tierForScore } from "@/lib/rating";
import { SMART_MIN_REFERENCES } from "@/lib/smart-rating";
import { RatingRing } from "./rating-ring";
import { Button } from "@/components/ui/button";

const QUICK = [3, 5, 6, 7, 8, 9, 9.5, 10];

/**
 * The dedicated rating menu. Mounted once globally; opens whenever the store
 * has a `pendingRate` — set automatically when a title is completed, or on
 * demand via `requestRate` (e.g. tapping an existing score to edit it).
 */
export function RatingPrompt() {
  const pendingRate = useWaku((s) => s.pendingRate);
  const entries = useWaku((s) => s.entries);
  const rateById = useWaku((s) => s.rateById);
  const clearPendingRate = useWaku((s) => s.clearPendingRate);

  const entry = pendingRate != null ? entries[pendingRate] : undefined;
  const previous = entry?.score ?? null;

  // Smart Rating needs a few OTHER scored titles to compare against.
  const referenceCount = Object.values(entries).filter(
    (e) => e.score != null && e.media.id !== pendingRate,
  ).length;

  const [draft, setDraft] = useState(previous ?? 7.5);
  /** Always points at the freshest save(), so the key handler never goes stale. */
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
      // Arrow keys nudge the score by a tenth; Enter commits.
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

  const open = pendingRate != null && !!entry;
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
          <div className="absolute inset-0 bg-abyss-950/80 backdrop-blur-md" onClick={clearPendingRate} />

          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="glass-menu relative z-10 w-full max-w-md overflow-hidden rounded-t-4xl sm:rounded-4xl"
          >
            {/* cinematic header */}
            <div className="relative h-24 w-full overflow-hidden">
              {entry.media.cover && (
                <Image
                  src={entry.media.cover}
                  alt=""
                  fill
                  sizes="448px"
                  className="scale-110 object-cover blur-xl brightness-[0.5]"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-abyss-950 via-abyss-950/50 to-abyss-950/20" />
              <button
                onClick={clearPendingRate}
                className="absolute right-3 top-3 z-10 rounded-full bg-abyss-950/50 p-1.5 text-white/70 outline-none backdrop-blur-md transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
                <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-abyss-700 shadow-lg ring-1 ring-white/15">
                  {entry.media.cover && (
                    <Image src={entry.media.cover} alt="" fill sizes="44px" className="object-cover" />
                  )}
                </div>
                <div className="min-w-0 pb-0.5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-waku-cinematic">
                    {previous != null ? "Update your rating" : "You finished it"}
                  </p>
                  <h3 className="line-clamp-1 font-display text-lg font-semibold leading-tight text-white">
                    {entry.media.title}
                  </h3>
                </div>
              </div>
            </div>

            {/* ring + controls */}
            <div className="flex flex-col items-center px-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5">
              <p className="mb-4 text-center text-sm text-white/55">
                {previous != null ? "Drag to change your score" : "How would you rate it?"}
              </p>

              <div className="relative flex items-center justify-center">
                {/* soft glow behind the ring, tinted by the live score */}
                <div
                  className="pointer-events-none absolute h-40 w-40 rounded-full opacity-40 blur-2xl transition-colors duration-300"
                  style={{ background: tier.color }}
                  aria-hidden
                />
                <RatingRing value={draft} onChange={setDraft} onCommit={setDraft} />
              </div>

              {/* Live verdict — names the tier so the number means something,
                  and announces changes to screen readers as you drag. */}
              <p className="mt-3 text-sm font-semibold" style={{ color: tier.text }} aria-live="polite">
                {tier.label}
                <span className="sr-only"> — {draft.toFixed(1)} out of 10</span>
              </p>

              {previous != null && (
                <p className="mt-1 text-xs text-white/45">
                  Previously{" "}
                  <span className="font-semibold tabular-nums text-white/75">{previous.toFixed(1)}</span>
                </p>
              )}

              {/* quick numeric chips */}
              <div className="mt-5 flex flex-wrap justify-center gap-1.5">
                {QUICK.map((v) => {
                  const t = tierForScore(v);
                  const active = Math.abs(draft - v) < 0.05;
                  return (
                    <button
                      key={v}
                      onClick={() => setDraft(v)}
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums outline-none ring-1 ring-inset transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-waku-400"
                      style={{
                        background: t.soft,
                        color: t.text,
                        // @ts-expect-error CSS var
                        "--tw-ring-color": active ? t.color : "transparent",
                        boxShadow: active ? `inset 0 0 0 1.5px ${t.color}` : undefined,
                      }}
                    >
                      {v.toFixed(1)}
                    </button>
                  );
                })}
              </div>

              {/* actions — Smart Rating leads once it's unlocked (the app's
                  signature way to place a title by comparison); the manual dial
                  above stays as the quick fallback. Before unlock, Save leads. */}
              <div className="mt-6 w-full space-y-2">
                {smartUnlocked ? (
                  <>
                    <Link
                      href={`/rate?focus=${pendingRate}`}
                      onClick={clearPendingRate}
                      className="block"
                    >
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
                        Save {draft.toFixed(1)}
                      </Button>
                    </div>
                    <p className="text-center text-[11px] text-white/40">
                      Smart Rate ranks it against your other titles — or keep the dial score.
                    </p>
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
                      Save {draft.toFixed(1)}
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
