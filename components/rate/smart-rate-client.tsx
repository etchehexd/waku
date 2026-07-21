"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Sparkles, Undo2, SkipForward, ArrowLeft, Trophy, Swords, ImageOff, Lock } from "lucide-react";
import {
  useWaku,
  useEntriesList,
  isRateable,
  useSmartRatingGate,
  type LibraryEntry,
} from "@/lib/store";
import { useMounted } from "@/lib/use-mounted";
import {
  buildReferencePool,
  boundedState,
  pairKey,
  SMART_MIN_REFERENCES,
  type Reference,
} from "@/lib/smart-rating";
import { ScoreDial } from "@/components/media/score-dial";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Smart Rating — a focused head-to-head flow.
 *
 * One question per round: two posters side by side, tap the one you enjoyed
 * more. Deliberately shows NO scores during a session — not the reference's
 * rating, not the running estimate, not the numeric bounds — because any of
 * those numbers anchors the very judgement being asked for. The result is
 * revealed only on the completion screen.
 *
 * All placement logic (bounded insertion, undo, skip, persistence) is
 * unchanged; this component is purely the new face on it.
 */
export function SmartRateClient() {
  const mounted = useMounted();
  const router = useRouter();
  const params = useSearchParams();
  const focusId = params.get("focus") ? Number(params.get("focus")) : undefined;

  const entries = useEntriesList();
  const comparisons = useWaku((s) => s.comparisons);
  const recordComparison = useWaku((s) => s.recordComparison);
  const undoLastComparison = useWaku((s) => s.undoLastComparison);
  const rateById = useWaku((s) => s.rateById);
  const smart = useSmartRatingGate();

  const reduce = useReducedMotion();

  /** pairs skipped this session — never re-offered until the session ends */
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set());

  const byId = useMemo(() => {
    const m: Record<number, LibraryEntry> = {};
    for (const e of entries) m[e.media.id] = e;
    return m;
  }, [entries]);

  const target = focusId != null ? byId[focusId] : undefined;

  const pool = useMemo<Reference[]>(() => {
    const scored: Reference[] = entries
      .filter((e) => e.score != null)
      .map((e) => ({ id: e.media.id, score: e.score as number }));
    return focusId != null ? buildReferencePool(scored, focusId) : [];
  }, [entries, focusId]);

  const estimate = target?.smart ? target.score ?? undefined : undefined;

  const state = useMemo(
    () =>
      focusId != null
        ? boundedState(focusId, pool, comparisons, skipped, estimate)
        : null,
    [focusId, pool, comparisons, skipped, estimate],
  );

  // Persist the derived score as bounds tighten.
  useEffect(() => {
    if (focusId == null || !state || target == null) return;
    if (state.comparedCount >= 1 && state.estimatedScore != null) {
      if (target.score !== state.estimatedScore || !target.smart) {
        rateById(focusId, state.estimatedScore, true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.estimatedScore, state?.comparedCount, focusId]);

  const choose = useCallback(
    (targetWon: boolean) => {
      if (focusId == null || !state?.candidateId) return;
      if (targetWon) recordComparison(focusId, state.candidateId);
      else recordComparison(state.candidateId, focusId);
    },
    [focusId, state?.candidateId, recordComparison],
  );

  const skip = useCallback(() => {
    if (focusId == null || !state?.candidateId) return;
    setSkipped((prev) => new Set(prev).add(pairKey(focusId, state.candidateId!)));
  }, [focusId, state?.candidateId]);

  const undo = useCallback(() => {
    if (focusId == null || state == null || state.comparedCount === 0) return;
    undoLastComparison(focusId);
  }, [focusId, state, undoLastComparison]);

  const finish = useCallback(() => {
    if (focusId != null && state?.estimatedScore != null && state.comparedCount >= 1) {
      rateById(focusId, state.estimatedScore, true);
    }
    router.push(focusId != null ? `/media/${focusId}` : "/rankings");
  }, [focusId, state, rateById, router]);

  // Keyboard: ←/→ pick left/right card, u undo, s skip.
  useEffect(() => {
    if (!state?.candidateId) return;
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement?.tagName;
      if (el === "INPUT" || el === "TEXTAREA") return;
      if (e.key === "ArrowLeft") choose(true);
      else if (e.key === "ArrowRight") choose(false);
      else if (e.key.toLowerCase() === "u") undo();
      else if (e.key.toLowerCase() === "s") skip();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [state?.candidateId, choose, undo, skip]);

  if (!mounted) return <Shell />;
  // Gate: Smart Rating needs a real taste profile behind it. Checked here as
  // well as in the UI that links here, so a bookmarked/typed /rate?focus= URL
  // can't walk around the lock. @see useSmartRatingGate
  if (!smart.unlocked) return <SmartLocked gate={smart} focusId={focusId} />;
  if (focusId == null || target == null) return <NoTarget />;
  // Gate: Smart Rating still writes a score, so it obeys the same completion
  // rule as every other rating path. @see isRateable
  if (!isRateable(target)) return <RateLocked target={target} />;
  // Defensive: the 10-manual-rating gate above already guarantees a pool this
  // size, but a title can't be compared against nothing.
  if (pool.length < SMART_MIN_REFERENCES) {
    return <SmartLocked gate={smart} focusId={focusId} />;
  }

  const candidate = state?.candidateId != null ? byId[state.candidateId] : undefined;

  if (!candidate) {
    return (
      <Completion
        target={target}
        score={state!.estimatedScore}
        reason={state!.settled ? "narrow" : "exhausted"}
        rounds={state!.comparedCount}
        onUndo={state!.comparedCount > 0 ? undo : undefined}
        href={`/media/${focusId}`}
      />
    );
  }

  const targetTitle = target.media.title;
  const refTitle = candidate.media.title;
  const round = state!.comparedCount + 1;
  // Bounded insertion is a binary search, so ~log2(pool) rounds settle it.
  const estRounds = Math.max(3, Math.ceil(Math.log2(pool.length + 1)));
  const progress = state!.comparedCount === 0 ? 0.06 : Math.min(state!.comparedCount / estRounds, 0.92);
  const { bounds } = state!;
  const loKnown = bounds.lowerScore !== -Infinity;
  const hiKnown = bounds.upperScore !== Infinity;

  return (
    <div className="container mx-auto flex max-w-xl flex-col px-4 pb-6 pt-6 sm:pt-20 md:min-h-[calc(100vh-3.5rem)] md:justify-center md:pb-10 md:pt-20">
      {/* Mobile sizes to content and uses a small top padding (main's pt-14
          already clears the fixed top bar); a viewport-filling min-height
          would bottom-align the Finish controls under the fixed bottom tab
          bar. Only desktop (no bottom nav) fills and centers the duel. */}
      {/* header: badge + progress */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-iris-500/25 to-waku-500/25 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-iris-300 ring-1 ring-inset ring-iris-300/30">
          <Sparkles className="h-3.5 w-3.5" /> Smart Rating
        </span>
        <span className="text-xs tabular-nums text-white/45" aria-live="polite">
          Round {round}
        </span>
      </div>

      {/* progress bar — motion feedback without leaking any numbers */}
      <div
        className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/8"
        role="progressbar"
        aria-label="Placement progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-iris-400 to-waku-cinematic transition-[width] duration-500 motion-reduce:transition-none"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <h1 className="mb-5 text-balance text-center font-display text-2xl font-bold leading-tight tracking-tight text-white sm:text-3xl">
        Which did you enjoy more?
      </h1>

      {/* the duel */}
      <div
        role="group"
        aria-label={`Round ${round}: ${targetTitle} versus ${refTitle}`}
        className="relative mx-auto grid w-full max-w-lg flex-1 grid-cols-2 content-center gap-3 sm:gap-4"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={candidate.media.id}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={{ duration: reduce ? 0.12 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="col-span-2 grid grid-cols-2 gap-3 sm:gap-4"
          >
            <DuelCard
              entry={target}
              accent="#9a83ff"
              kbd="←"
              onChoose={() => choose(true)}
              ariaLabel={`I enjoyed ${targetTitle} more`}
            />
            <DuelCard
              entry={candidate}
              accent="#5b8cff"
              kbd="→"
              onChoose={() => choose(false)}
              ariaLabel={`I enjoyed ${refTitle} more`}
            />
          </motion.div>
        </AnimatePresence>

        {/* VS medallion */}
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 z-10 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-abyss-900 font-display text-xs font-bold text-white ring-2 ring-iris-400/60 shadow-[0_0_24px_-4px_rgba(124,92,255,0.7)]"
          aria-hidden
        >
          <Swords className="mr-0.5 h-3.5 w-3.5 text-iris-300" />
          VS
        </span>
      </div>

      {/* narrowing context — qualitative only, never the bound scores */}
      <p className="mt-4 text-center text-xs text-white/45" aria-live="polite">
        {loKnown && hiKnown
          ? "Closing in on its place"
          : loKnown
            ? "Finding the ceiling"
            : hiKnown
              ? "Finding the floor"
              : "Each pick narrows it down"}
      </p>

      {/* controls */}
      <div className="mx-auto mt-3 flex w-fit items-center gap-1 rounded-full glass p-1.5">
        <Button variant="ghost" size="sm" onClick={undo} disabled={state!.comparedCount === 0} aria-label="Undo last comparison">
          <Undo2 className="h-3.5 w-3.5" /> Undo
        </Button>
        <span className="h-4 w-px bg-white/10" aria-hidden />
        <Button variant="ghost" size="sm" onClick={skip} aria-label="Too close to call — skip this pair">
          <SkipForward className="h-3.5 w-3.5" /> Too close
        </Button>
        <span className="h-4 w-px bg-white/10" aria-hidden />
        <Button variant="ghost" size="sm" onClick={finish} aria-label="Finish and save">
          <Trophy className="h-3.5 w-3.5" /> Finish
        </Button>
      </div>
    </div>
  );
}

/**
 * One side of the duel: the whole card is the button. Poster-forward, title
 * beneath, an accent ring on hover/focus, and a keyboard hint on desktop.
 * No score anywhere on it, by design.
 */
function DuelCard({
  entry,
  accent,
  kbd,
  onChoose,
  ariaLabel,
}: {
  entry: LibraryEntry;
  accent: string;
  kbd: string;
  onChoose: () => void;
  ariaLabel: string;
}) {
  const { media } = entry;
  return (
    <button
      type="button"
      onClick={onChoose}
      aria-label={ariaLabel}
      className="group flex min-w-0 flex-col outline-none"
    >
      {/* Width-capped frame: height derives from the 2/3 aspect, so a poster
          can never exceed ~40svh — it scales instead of cropping or spilling
          past the fold on short viewports. */}
      <span className="glass relative mx-auto w-full max-w-[22svh] overflow-hidden rounded-2xl p-1.5 transition-transform duration-200 group-hover:-translate-y-1 group-focus-visible:-translate-y-1 sm:max-w-[26svh] motion-reduce:transition-none motion-reduce:group-hover:translate-y-0">
        <span
          className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{ boxShadow: `inset 0 0 0 2px ${accent}, 0 8px 30px -10px ${accent}88` }}
          aria-hidden
        />
        <span className="relative block aspect-[2/3] w-full overflow-hidden rounded-xl">
          {media.cover ? (
            <Image
              src={media.cover}
              alt=""
              fill
              sizes="(max-width: 640px) 45vw, 240px"
              className="object-cover"
              style={{ backgroundColor: media.color || "#0c1122" }}
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-abyss-700 text-white/25">
              <ImageOff className="h-6 w-6" />
            </span>
          )}
        </span>
      </span>

      <span className="mt-2 line-clamp-2 text-center text-sm font-semibold leading-tight text-white transition-colors group-hover:text-iris-300">
        {media.title}
      </span>
      <span className="mt-0.5 flex items-center justify-center gap-1.5 text-center text-[11px] text-white/45">
        {media.format?.replace(/_/g, " ")}
        {media.seasonYear ? ` · ${media.seasonYear}` : ""}
        <kbd className="hidden rounded bg-white/8 px-1 font-sans text-[10px] text-white/40 sm:inline">{kbd}</kbd>
      </span>
    </button>
  );
}

function Completion({
  target,
  score,
  reason,
  rounds,
  onUndo,
  href,
}: {
  target: LibraryEntry;
  score: number | null;
  reason: "narrow" | "exhausted";
  rounds: number;
  onUndo?: () => void;
  href: string;
}) {
  return (
    <div className="container flex min-h-[70svh] max-w-md flex-col items-center justify-center pt-20 text-center md:pt-24">
      <div className="glass glass-sheen w-full rounded-4xl p-8">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-iris-500/30 to-waku-500/25 text-iris-300">
          <Sparkles className="h-6 w-6" />
        </span>
        <p className="text-[11px] font-medium uppercase tracking-wider text-white/40">
          {reason === "narrow" ? "Position pinned" : "No closer matches left"}
        </p>
        <h1 className="mt-1 font-display text-xl font-bold text-white">{target.media.title}</h1>
        {score != null ? (
          <>
            <div className="mx-auto my-5 flex justify-center">
              <ScoreDial value={score} size={190} />
            </div>
            <p className="text-sm text-white/55">
              Smart Rated from {rounds} comparison{rounds === 1 ? "" : "s"}. You can refine it any
              time.
            </p>
          </>
        ) : (
          <p className="my-5 text-sm text-white/55">Rate a couple of titles to compare against.</p>
        )}
        <div className="mt-6 flex flex-col gap-2">
          <Link href={href}>
            <Button variant="accent" size="lg" className="w-full">
              View details
            </Button>
          </Link>
          {onUndo && (
            <Button variant="ghost" size="md" onClick={onUndo}>
              <Undo2 className="h-4 w-4" /> Undo last comparison
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Shown when someone deep-links Smart Rating for a title they haven't finished. */
function RateLocked({ target }: { target: LibraryEntry }) {
  return (
    <div className="container flex min-h-[70svh] max-w-md flex-col items-center justify-center pt-20 text-center md:pt-24">
      <div className="glass glass-sheen w-full rounded-4xl p-8">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06] text-white/50">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="font-display text-xl font-bold text-white">Finish it first</h1>
        <p className="mt-2 text-sm text-white/55">
          You can only rate <span className="font-semibold text-white">{target.media.title}</span> once
          you&apos;ve marked it completed. Track your progress, finish the show, then Smart Rate it.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href={`/media/${target.media.id}`}>
            <Button variant="accent" size="lg" className="w-full">
              Open details
            </Button>
          </Link>
          <Link href="/library">
            <Button variant="ghost" size="md" className="w-full">
              Back to library
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function NoTarget() {
  return (
    <div className="container flex min-h-[70svh] max-w-md flex-col items-center justify-center pt-20 text-center md:pt-24">
      <div className="glass glass-sheen w-full rounded-4xl p-8">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-iris-500/30 to-waku-500/25 text-iris-300">
          <Sparkles className="h-6 w-6" />
        </span>
        <h1 className="font-display text-xl font-bold text-white">Pick a title to Smart Rate</h1>
        <p className="mt-2 text-sm text-white/55">
          Smart Rating places one title at a time by comparing it to others you&apos;ve rated. Open
          any title and choose Smart Rating from its rating menu.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href="/library">
            <Button variant="accent" size="lg" className="w-full">
              Go to your library
            </Button>
          </Link>
          <Link href="/rankings">
            <Button variant="ghost" size="md" className="w-full">
              <Trophy className="h-4 w-4" /> View rankings
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * The locked state for Smart Rating — shown whenever the user hasn't manually
 * rated {@link SMART_MIN_MANUAL_RATINGS} titles yet.
 *
 * Explains the requirement and shows progress toward it rather than dead-ending
 * or 404ing, and offers the two things that actually make progress: rating what
 * they've already finished, or finding more to watch.
 */
function SmartLocked({
  gate,
  focusId,
}: {
  gate: { manualCount: number; required: number; remaining: number };
  focusId?: number;
}) {
  const pct = Math.min(100, (gate.manualCount / gate.required) * 100);
  return (
    <div className="container flex min-h-[70svh] max-w-md flex-col items-center justify-center pt-20 text-center md:pt-24">
      <div className="glass glass-sheen w-full rounded-4xl p-8">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/[0.06] text-white/50">
          <Lock className="h-6 w-6" />
        </span>
        <h1 className="font-display text-xl font-bold text-white">
          Rate {gate.required} shows to unlock Smart Rating
        </h1>
        <p className="mt-2 text-sm text-white/55">
          Smart Rating places a title by comparing it against scores you set yourself, so it needs a
          bit of your taste to work from.{" "}
          {gate.remaining > 0 && (
            <>
              <span className="font-semibold text-white">{gate.remaining}</span> more to go.
            </>
          )}
        </p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-gradient-to-r from-waku-400 to-waku-cinematic transition-all motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs tabular-nums text-white/40">
          {gate.manualCount} / {gate.required} rated by hand
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link href={focusId != null ? `/media/${focusId}` : "/library"}>
            <Button variant="accent" size="lg" className="w-full">
              {focusId != null ? "Rate it yourself" : "Rate from your library"}
            </Button>
          </Link>
          <Link href="/discover">
            <Button variant="ghost" size="md" className="w-full">
              <ArrowLeft className="h-4 w-4" /> Find titles to rate
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Shell() {
  return (
    <div className="container mx-auto max-w-xl px-4 pt-24">
      <div className="skeleton mx-auto h-6 w-40 rounded-full" />
      <div className="skeleton mt-3 h-1.5 w-full rounded-full" />
      <div className="skeleton mx-auto mt-5 h-7 w-64 rounded-full" />
      <div className="mx-auto mt-5 grid max-w-lg grid-cols-2 gap-4">
        <div className="skeleton aspect-[2/3] rounded-2xl" />
        <div className="skeleton aspect-[2/3] rounded-2xl" />
      </div>
      <div className="skeleton mx-auto mt-6 h-10 w-64 rounded-full" />
    </div>
  );
}
