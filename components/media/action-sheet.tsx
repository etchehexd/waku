"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Heart,
  RotateCcw,
  Undo2,
  Trash2,
  Sparkles,
  Check,
  Library as LibraryIcon,
} from "lucide-react";
import type { MediaSummary } from "@/lib/anilist/types";
import { useWaku, STATUS_LABEL, STATUS_ORDER, type WatchStatus } from "@/lib/store";
import { STATUS_META } from "./status-meta";
import { ProgressStepper } from "./progress-stepper";
import { GRADE_TIERS, tierForScore } from "@/lib/rating";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { cn } from "@/lib/utils";

interface ActionSheetProps {
  media: MediaSummary;
  open: boolean;
  onClose: () => void;
}

const DEFAULT_ADD_STATUS: WatchStatus = "CURRENT";

/**
 * Add-to-library "track card" — a centered command modal (not a list sheet).
 *
 * Add mode: the choices are a draft; nothing is written until "Add to library".
 * Edit mode: every control applies immediately, matching the rest of the app.
 * The store call sequence is preserved so the completion → rating-prompt and
 * rewatch conventions still hold.
 */
export function ActionSheet({ media, open, onClose }: ActionSheetProps) {
  const entry = useWaku((s) => s.entries[media.id]);
  const pendingRate = useWaku((s) => s.pendingRate);
  const setStatus = useWaku((s) => s.setStatus);
  const setProgress = useWaku((s) => s.setProgress);
  const requestRate = useWaku((s) => s.requestRate);
  const rate = useWaku((s) => s.rate);
  const rateById = useWaku((s) => s.rateById);
  const toggleFavorite = useWaku((s) => s.toggleFavorite);
  const incrementRewatch = useWaku((s) => s.incrementRewatch);
  const decrementRewatch = useWaku((s) => s.decrementRewatch);
  const upsertEntry = useWaku((s) => s.upsertEntry);
  const removeEntry = useWaku((s) => s.removeEntry);

  const inList = !!entry;
  const title = media.title.english || media.title.romaji || media.title.native || "";
  const cover = media.coverImage.large || media.coverImage.extraLarge || "";
  const total = media.episodes || media.chapters || null;
  const unitWord = media.type === "ANIME" ? "episodes" : "chapters";

  const [draftStatus, setDraftStatus] = useState<WatchStatus>(DEFAULT_ADD_STATUS);
  const [draftProgress, setDraftProgress] = useState(0);
  const [draftScore, setDraftScore] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (open && !inList) {
      setDraftStatus(DEFAULT_ADD_STATUS);
      setDraftProgress(0);
      setDraftScore(null);
    }
  }, [open, inList]);

  // Completing a title hands off to the global rating modal — step aside.
  useEffect(() => {
    if (open && pendingRate != null) onClose();
  }, [open, pendingRate, onClose]);

  const clamp = (n: number) => Math.max(0, total ? Math.min(n, total) : n);
  const progress = inList ? entry.progress : draftProgress;
  const activeStatus = inList ? entry.status : draftStatus;
  const activeScore = inList ? entry.score : draftScore;
  const meta = STATUS_META[activeStatus];
  const pct = total ? Math.min(100, (progress / total) * 100) : progress > 0 ? 100 : 0;

  const chooseStatus = (s: WatchStatus) => (inList ? setStatus(media, s) : setDraftStatus(s));
  const setProgressValue = (n: number) => (inList ? setProgress(media.id, clamp(n)) : setDraftProgress(clamp(n)));
  const chooseScore = (v: number) => (inList ? rateById(media.id, v) : setDraftScore(v));

  const commitAdd = () => {
    upsertEntry(media, { progress: draftProgress });
    if (draftScore != null) rate(media, draftScore);
    setStatus(media, draftStatus);
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-[105] flex items-end justify-center sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="dialog"
            aria-modal="true"
            aria-label={inList ? `Library options for ${title}` : `Add ${title} to your library`}
          >
            <div className="absolute inset-0 bg-abyss-950/85 backdrop-blur-md" onClick={onClose} />

            <motion.div
              initial={{ opacity: 0, y: 60, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 40, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 330, damping: 32 }}
              className="relative z-10 flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-t-4xl border border-white/10 bg-abyss-900 shadow-[0_-20px_60px_-20px_rgba(0,0,0,0.85)] sm:rounded-4xl sm:shadow-[0_30px_80px_-24px_rgba(0,0,0,0.85)]"
            >
              {/* cover header */}
              <div className="relative h-24 shrink-0">
                {cover && (
                  <Image src={cover} alt="" fill sizes="448px" className="scale-110 object-cover opacity-40 blur-xl" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-abyss-900 via-abyss-900/60 to-abyss-900/10" />
                <button
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute right-3 top-3 z-10 rounded-full bg-abyss-950/50 p-1.5 text-white/70 outline-none backdrop-blur-md transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="absolute inset-x-0 bottom-0 flex items-end gap-3 p-4">
                  <div className="relative h-[4.5rem] w-12 shrink-0 overflow-hidden rounded-xl bg-abyss-700 shadow-lg ring-1 ring-white/15">
                    {cover && <Image src={cover} alt="" fill sizes="48px" className="object-cover" />}
                  </div>
                  <div className="min-w-0 pb-0.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-waku-cinematic">
                      {inList ? "In your library" : "Add to library"}
                    </p>
                    <h2 className="line-clamp-1 font-display text-lg font-extrabold leading-tight text-white">
                      {title}
                    </h2>
                  </div>
                </div>
              </div>

              {/* body */}
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 pb-4 pt-4">
                {/* status tiles */}
                <div>
                  <Label>{inList ? "Status" : "How are you tracking it?"}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {STATUS_ORDER.map((s) => {
                      const m = STATUS_META[s];
                      const Icon = m.icon;
                      const active = activeStatus === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          aria-pressed={active}
                          onClick={() => chooseStatus(s)}
                          className={cn(
                            "flex flex-col items-center gap-1.5 rounded-2xl px-1 py-3 outline-none transition-all focus-visible:ring-2 focus-visible:ring-waku-400",
                            active ? "" : "bg-white/[0.04] ring-1 ring-inset ring-white/8 hover:bg-white/[0.08]",
                          )}
                          style={active ? { background: m.soft, boxShadow: `inset 0 0 0 1.5px ${m.color}` } : undefined}
                        >
                          <span
                            className="flex h-8 w-8 items-center justify-center rounded-xl"
                            style={{ background: active ? `${m.color}2e` : "rgba(255,255,255,0.05)" }}
                          >
                            <Icon className="h-4 w-4" style={{ color: m.color }} />
                          </span>
                          <span className={cn("text-[11px] font-bold", active ? "text-white" : "text-white/70")}>
                            {STATUS_LABEL[s]}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* progress */}
                <div>
                  <Label hint={total ? `${progress} / ${total} ${unitWord}` : `${progress} ${unitWord}`}>Progress</Label>
                  <div className="flex items-center gap-3">
                    <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-waku-400 to-waku-600 transition-[width] duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <ProgressStepper value={progress} total={total} onChange={setProgressValue} size="sm" label={title} />
                  </div>
                </div>

                {/* rating — verdict grade */}
                <div>
                  <Label hint={activeScore != null ? tierForScore(activeScore).label : undefined}>Your verdict</Label>
                  <div className="flex items-center gap-1.5">
                    {GRADE_TIERS.map((t) => {
                      const active = activeScore != null && tierForScore(activeScore).key === t.key;
                      return (
                        <button
                          key={t.key}
                          type="button"
                          aria-pressed={active}
                          aria-label={`${t.grade} — ${t.label}`}
                          onClick={() => chooseScore(t.anchor)}
                          className="flex h-9 flex-1 items-center justify-center rounded-xl text-base font-black outline-none transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-waku-400"
                          style={{
                            background: t.soft,
                            color: t.text,
                            boxShadow: active ? `inset 0 0 0 2px ${t.color}` : `inset 0 0 0 1px ${t.color}33`,
                            transform: active ? "scale(1.06)" : undefined,
                          }}
                        >
                          {t.grade}
                        </button>
                      );
                    })}
                    {!inList && draftScore != null && (
                      <button
                        type="button"
                        onClick={() => setDraftScore(null)}
                        aria-label="Clear rating"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white/45 outline-none ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {inList && (
                    <button
                      type="button"
                      onClick={() => requestRate(media.id)}
                      className="mt-2.5 flex w-full items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2 text-left outline-none ring-1 ring-inset ring-white/8 transition-colors hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-waku-400"
                    >
                      <Sparkles className="h-4 w-4 shrink-0 text-waku-cinematic" />
                      <span className="flex-1 text-sm font-semibold text-white">
                        {entry.score != null ? `Adjust verdict · ${tierForScore(entry.score).grade}` : "Rate this title"}
                      </span>
                      <span className="text-xs text-white/45">{entry.smart ? "Smart Rated" : "Open"}</span>
                    </button>
                  )}
                </div>

                {/* extras — edit mode only */}
                {inList && (
                  <div className="flex flex-wrap gap-2 border-t border-white/[0.07] pt-4">
                    <ExtraBtn
                      active={entry.favorite}
                      color="#ff5b8f"
                      icon={<Heart className={cn("h-3.5 w-3.5", entry.favorite && "fill-current")} />}
                      label={entry.favorite ? "Favorited" : "Favorite"}
                      onClick={() => toggleFavorite(media.id)}
                    />
                    {entry.status === "COMPLETED" && (
                      <ExtraBtn
                        icon={<RotateCcw className="h-3.5 w-3.5" />}
                        label="Rewatch"
                        onClick={() => {
                          incrementRewatch(media.id);
                          setStatus(media, "REWATCHING");
                        }}
                      />
                    )}
                    {entry.rewatches > 0 && (
                      <ExtraBtn
                        icon={<Undo2 className="h-3.5 w-3.5" />}
                        label={`Undo rewatch (${entry.rewatches})`}
                        onClick={() => decrementRewatch(media.id)}
                      />
                    )}
                    <ExtraBtn
                      danger
                      icon={<Trash2 className="h-3.5 w-3.5" />}
                      label="Remove"
                      onClick={() => setConfirmRemove(true)}
                    />
                  </div>
                )}
              </div>

              {/* footer */}
              <div className="shrink-0 border-t border-white/[0.07] p-4">
                {inList ? (
                  <button
                    onClick={onClose}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/10 text-sm font-bold text-white outline-none transition-colors hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-waku-400"
                  >
                    <Check className="h-4 w-4" /> Done
                  </button>
                ) : (
                  <>
                    <button
                      onClick={commitAdd}
                      className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-waku-500 to-iris-600 text-sm font-bold text-white outline-none transition-[filter] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-waku-400"
                    >
                      <LibraryIcon className="h-4 w-4" /> Add to library
                    </button>
                    <p className="mt-2 text-center text-[11px] text-white/35">
                      Saving as <span className="text-white/60">{STATUS_LABEL[draftStatus]}</span>
                      {draftProgress > 0 && <> · {draftProgress} {unitWord}</>}
                      {draftScore != null && <> · verdict {tierForScore(draftScore).grade}</>}
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmRemove}
        destructive
        title={`Remove ${title}?`}
        description="Your progress, score and rewatch history for this title will be deleted. This can't be undone."
        confirmLabel="Remove"
        cancelLabel="Keep it"
        onConfirm={() => {
          removeEntry(media.id);
          setConfirmRemove(false);
          onClose();
        }}
        onCancel={() => setConfirmRemove(false)}
      />
    </>
  );
}

function Label({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">{children}</span>
      {hint && <span className="text-[11px] font-semibold tabular-nums text-white/55">{hint}</span>}
    </div>
  );
}

function ExtraBtn({
  icon,
  label,
  onClick,
  active,
  color,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  color?: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold outline-none ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
        danger
          ? "text-rose-300/90 ring-white/8 hover:bg-rose-500/12 hover:text-rose-200"
          : active
            ? "ring-transparent"
            : "text-white/80 ring-white/10 hover:bg-white/[0.08]",
      )}
      style={active && color ? { background: `${color}22`, color, boxShadow: `inset 0 0 0 1.5px ${color}` } : undefined}
    >
      {icon}
      {label}
    </button>
  );
}
