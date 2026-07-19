"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  Heart,
  RotateCcw,
  Undo2,
  Trash2,
  Minus,
  Plus,
  Sparkles,
  Check,
  Library as LibraryIcon,
  ChevronRight,
} from "lucide-react";
import type { MediaSummary } from "@/lib/anilist/types";
import { useWaku, STATUS_LABEL, type WatchStatus } from "@/lib/store";
import { STATUS_META } from "./status-meta";
import { StatusPicker } from "./status-picker";
import { ScorePicker } from "./score-picker";
import { RatingChip } from "./rating-chip";
import { Sheet, SheetSection } from "@/components/ui/sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActionSheetProps {
  media: MediaSummary;
  open: boolean;
  onClose: () => void;
}

const DEFAULT_ADD_STATUS: WatchStatus = "CURRENT";

/**
 * The Add-to-Library sheet.
 *
 * Two deliberate modes:
 *  - **Add** (title not yet tracked): the choices are a *draft* — pick a
 *    status, optionally set progress and a score — and nothing is written
 *    until the single, obvious "Add to Library" action. Committing replays the
 *    exact same store calls the app has always used, in an order that
 *    preserves the completion → rating-prompt convention.
 *  - **Edit** (already tracked): controls apply immediately, matching the rest
 *    of the app (quick-add popovers, library rows), so nothing silently
 *    diverges. "Done" simply closes.
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

  // --- draft state, only used in Add mode ---
  const [draftStatus, setDraftStatus] = useState<WatchStatus>(DEFAULT_ADD_STATUS);
  const [draftProgress, setDraftProgress] = useState(0);
  const [draftScore, setDraftScore] = useState<number | null>(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Reset the draft each time the sheet opens for an untracked title.
  useEffect(() => {
    if (open && !inList) {
      setDraftStatus(DEFAULT_ADD_STATUS);
      setDraftProgress(0);
      setDraftScore(null);
    }
  }, [open, inList]);

  // Completing a title opens the global rating modal — step out of its way.
  useEffect(() => {
    if (open && pendingRate != null) onClose();
  }, [open, pendingRate, onClose]);

  const clamp = (n: number) => Math.max(0, total ? Math.min(n, total) : n);

  const progress = inList ? entry.progress : draftProgress;
  const stepProgress = (delta: number) => {
    const next = clamp(progress + delta);
    if (inList) setProgress(media.id, next);
    else setDraftProgress(next);
  };
  const commitProgressInput = (raw: string) => {
    const n = parseInt(raw, 10);
    const next = clamp(Number.isFinite(n) ? n : progress);
    if (inList) setProgress(media.id, next);
    else setDraftProgress(next);
  };

  /**
   * Commit the Add draft. Order matters and mirrors the app's conventions:
   * create the entry (with progress), apply any score, then set the status
   * last so `setStatus` only raises the rating prompt when the user hasn't
   * already scored it — exactly as tapping a status tile always behaved.
   */
  const commitAdd = () => {
    upsertEntry(media, { progress: draftProgress });
    if (draftScore != null) rate(media, draftScore);
    setStatus(media, draftStatus);
    onClose();
  };

  const activeStatus = inList ? entry.status : draftStatus;
  const meta = STATUS_META[activeStatus];
  const pct = total ? Math.min(100, (progress / total) * 100) : progress > 0 ? 100 : 0;

  const header = useMemo(
    () => (
      <div className="flex items-center gap-3.5 border-b border-white/8 p-5 pr-14">
        <div className="relative h-[4.5rem] w-12 shrink-0 overflow-hidden rounded-xl bg-abyss-700 ring-1 ring-white/10">
          {cover && <Image src={cover} alt="" fill sizes="48px" className="object-cover" />}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="line-clamp-2 font-display text-base font-semibold leading-snug text-white">
            {title}
          </h2>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/45">
            <span>{media.format?.replace(/_/g, " ") || (media.type === "ANIME" ? "Anime" : "Manga")}</span>
            {media.seasonYear && <span>· {media.seasonYear}</span>}
            {total && <span>· {total} {unitWord}</span>}
          </p>
          {inList && (
            <span
              className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
              style={{ background: meta.soft, color: meta.color }}
            >
              <meta.icon className="h-3 w-3" />
              In library · {STATUS_LABEL[activeStatus]}
            </span>
          )}
        </div>
      </div>
    ),
    [cover, title, media.format, media.seasonYear, media.type, total, unitWord, inList, meta, activeStatus],
  );

  const footer = inList ? (
    <Button variant="primary" size="lg" className="w-full" onClick={onClose}>
      <Check className="h-4 w-4" /> Done
    </Button>
  ) : (
    <div className="flex flex-col gap-2">
      <Button variant="accent" size="md" className="w-full glow-accent" onClick={commitAdd}>
        <LibraryIcon className="h-4 w-4" /> Add to Library
      </Button>
      <p className="text-center text-[11px] text-white/35">
        Saving as <span className="text-white/60">{STATUS_LABEL[draftStatus]}</span>
        {draftProgress > 0 && <> · {draftProgress} {unitWord}</>}
        {draftScore != null && <> · rated {draftScore.toFixed(1)}</>}
      </p>
    </div>
  );

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        label={inList ? `Library options for ${title}` : `Add ${title} to your library`}
        header={header}
        footer={footer}
      >
        {/* STATUS — the one required choice, so it leads. */}
        <SheetSection title={inList ? "Status" : "How are you tracking it?"}>
          <StatusPicker
            value={activeStatus}
            type={media.type}
            onSelect={(s) => (inList ? setStatus(media, s) : setDraftStatus(s))}
          />
        </SheetSection>

        <Divider />

        {/* PROGRESS — optional, and only meaningful once a status is chosen. */}
        <SheetSection
          title="Progress"
          hint={total ? `${progress} / ${total} ${unitWord}` : `${progress} ${unitWord}`}
        >
          <div className="flex items-center gap-2.5">
            <Button
              variant="glass"
              size="icon-sm"
              onClick={() => stepProgress(-1)}
              disabled={progress <= 0}
              aria-label="Decrease progress"
            >
              <Minus className="h-4 w-4" />
            </Button>

            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={total ?? undefined}
              value={progress}
              onChange={(e) => commitProgressInput(e.target.value)}
              aria-label={`Progress${total ? `, 0 to ${total}` : ""}`}
              className="input-field h-9 w-16 text-center text-sm font-semibold tabular-nums"
            />

            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-waku-400 to-waku-600 transition-[width] duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>

            <Button
              variant="glass"
              size="icon-sm"
              onClick={() => stepProgress(1)}
              disabled={total != null && progress >= total}
              aria-label="Increase progress"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {!total && (
            <p className="mt-2 text-[11px] text-white/35">
              No {unitWord} count published yet — track as far as you like.
            </p>
          )}
        </SheetSection>

        <Divider />

        {/* RATING — optional. Quick chips here; the dial for precision. */}
        <SheetSection title="Your rating">
          <ScorePicker
            value={inList ? entry.score : draftScore}
            onChange={(v) => (inList ? rateById(media.id, v) : setDraftScore(v))}
            onClear={!inList && draftScore != null ? () => setDraftScore(null) : undefined}
          />
          {inList && (
            <button
              type="button"
              onClick={() => requestRate(media.id)}
              className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] p-2.5 text-left outline-none ring-1 ring-inset ring-white/8 transition-colors hover:bg-white/[0.08] focus-visible:ring-2 focus-visible:ring-waku-400"
            >
              <RatingChip score={entry.score} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-white">
                  {entry.score != null ? "Fine-tune your score" : "Rate with the dial"}
                </span>
                <span className="block text-xs text-white/45">
                  {entry.smart ? "Smart Rated" : "Open the rating dial"}
                </span>
              </span>
              <Sparkles className="h-4 w-4 shrink-0 text-waku-cinematic/70" />
              <ChevronRight className="h-4 w-4 shrink-0 text-white/30" />
            </button>
          )}
        </SheetSection>

        {/* EXTRAS — progressive disclosure: only relevant once it's tracked. */}
        {inList && (
          <>
            <Divider />
            <SheetSection title="More">
              <div className="flex flex-col gap-1.5">
                <ToggleRow
                  label={entry.favorite ? "Favorited" : "Add to favorites"}
                  hint="Feature it on your profile"
                  active={entry.favorite}
                  activeColor="#ff5b8f"
                  onClick={() => toggleFavorite(media.id)}
                  icon={<Heart className={cn("h-4 w-4", entry.favorite && "fill-current")} />}
                />

                {entry.status === "COMPLETED" && (
                  <ToggleRow
                    label="Start a rewatch"
                    hint={entry.rewatches > 0 ? `Watched ${entry.rewatches}× before` : "Track another run"}
                    onClick={() => {
                      incrementRewatch(media.id);
                      setStatus(media, "REWATCHING");
                    }}
                    icon={<RotateCcw className="h-4 w-4" />}
                  />
                )}
                {entry.rewatches > 0 && (
                  <ToggleRow
                    label="Undo a rewatch"
                    hint={`Currently ${entry.rewatches}×`}
                    onClick={() => decrementRewatch(media.id)}
                    icon={<Undo2 className="h-4 w-4" />}
                  />
                )}

                <ToggleRow
                  label="Remove from library"
                  hint="Deletes your progress and score"
                  danger
                  onClick={() => setConfirmRemove(true)}
                  icon={<Trash2 className="h-4 w-4" />}
                />
              </div>
            </SheetSection>
          </>
        )}

        <div className="h-2" />
      </Sheet>

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

function Divider() {
  return <div className="mx-5 h-px bg-white/[0.07]" />;
}

function ToggleRow({
  label,
  hint,
  icon,
  active,
  activeColor,
  danger,
  onClick,
}: {
  label: string;
  hint?: string;
  icon: React.ReactNode;
  active?: boolean;
  activeColor?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex min-h-[3rem] w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left outline-none ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
        danger
          ? "bg-white/[0.04] text-rose-300/90 ring-white/8 hover:bg-rose-500/12 hover:text-rose-200"
          : active
            ? "ring-transparent"
            : "bg-white/[0.04] text-white/85 ring-white/8 hover:bg-white/[0.08]",
      )}
      style={active && activeColor ? { background: `${activeColor}22`, color: activeColor, boxShadow: `inset 0 0 0 1.5px ${activeColor}` } : undefined}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.06]">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold">{label}</span>
        {hint && <span className="block truncate text-xs text-white/45">{hint}</span>}
      </span>
    </button>
  );
}
