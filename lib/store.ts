"use client";

import { useMemo } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MediaStatus, MediaSummary } from "./anilist/types";
import {
  computeSmart,
  pairKey,
  type Comparison,
  type Anchor,
  SMART_MIN_REFERENCES,
} from "./smart-rating";

export type WatchStatus =
  | "CURRENT"
  | "REWATCHING"
  | "COMPLETED"
  | "PAUSED"
  | "DROPPED"
  | "PLANNING";

export const STATUS_LABEL: Record<WatchStatus, string> = {
  CURRENT: "Watching",
  REWATCHING: "Rewatching",
  COMPLETED: "Completed",
  PAUSED: "On Hold",
  DROPPED: "Dropped",
  PLANNING: "Planning",
};

export const STATUS_ORDER: WatchStatus[] = [
  "CURRENT",
  "REWATCHING",
  "COMPLETED",
  "PAUSED",
  "PLANNING",
  "DROPPED",
];

/** A title's next scheduled episode, kept small for the library snapshot. */
export interface NextAiring {
  airingAt: number;
  episode: number;
}

/**
 * Compact media snapshot stored locally so lists render without a refetch.
 *
 * The individual `title*` fields power multi-language library search; `title`
 * remains the resolved display string. Everything here is AniList-owned
 * metadata that a library refresh may safely overwrite — user-owned fields
 * live on {@link LibraryEntry}, never here.
 */
export interface MediaSnapshot {
  id: number;
  type: "ANIME" | "MANGA";
  format: string | null;
  title: string;
  /** Individual title variants — optional on legacy snapshots. */
  titleEnglish?: string | null;
  titleRomaji?: string | null;
  titleNative?: string | null;
  cover: string | null;
  color: string | null;
  episodes: number | null;
  chapters: number | null;
  /** Manga/novel volume count when known — optional on legacy snapshots. */
  volumes?: number | null;
  /** Release year — optional on legacy snapshots; backfilled by refresh. */
  seasonYear?: number | null;
  averageScore: number | null;
  /** AniList release status (RELEASING/FINISHED/…) — drives refresh eligibility. */
  mediaStatus?: MediaStatus | null;
  /** Next scheduled episode for releasing anime, when known. */
  nextAiring?: NextAiring | null;
}

export function toSnapshot(m: MediaSummary): MediaSnapshot {
  return {
    id: m.id,
    type: m.type,
    format: m.format,
    title: m.title.english || m.title.romaji || m.title.native || "Untitled",
    titleEnglish: m.title.english,
    titleRomaji: m.title.romaji,
    titleNative: m.title.native,
    cover: m.coverImage.extraLarge || m.coverImage.large,
    color: m.coverImage.color,
    episodes: m.episodes,
    chapters: m.chapters,
    volumes: m.volumes,
    seasonYear: m.seasonYear,
    averageScore: m.averageScore,
    mediaStatus: m.status,
    nextAiring: m.nextAiringEpisode
      ? { airingAt: m.nextAiringEpisode.airingAt, episode: m.nextAiringEpisode.episode }
      : null,
  };
}

/**
 * Media-only metadata patch used by a library refresh. Every field is
 * AniList-owned; applying it must never touch user progress, status, rating,
 * favorites, rewatches, review, or timestamps.
 */
export interface MediaMetadataPatch {
  id: number;
  type?: "ANIME" | "MANGA";
  format?: string | null;
  title?: string;
  titleEnglish?: string | null;
  titleRomaji?: string | null;
  titleNative?: string | null;
  cover?: string | null;
  color?: string | null;
  episodes?: number | null;
  chapters?: number | null;
  volumes?: number | null;
  seasonYear?: number | null;
  averageScore?: number | null;
  mediaStatus?: MediaStatus | null;
  nextAiring?: NextAiring | null;
}

/** Minimal shape needed to decide a completion auto-fill. */
interface CompletionInfo {
  type: "ANIME" | "MANGA";
  episodes?: number | null;
  chapters?: number | null;
  /** AniList release status (RELEASING/FINISHED/…), when known. */
  releaseStatus?: MediaStatus | null;
}

/**
 * The progress a title should jump to when marked Completed, or `null` to
 * leave it untouched.
 *
 * Only fills in when AniList publishes a real total AND the title isn't still
 * airing/unreleased — a releasing show's episode count is a *plan*, not a
 * fact, so auto-filling it would claim the user watched unaired episodes.
 * Never lowers an existing count, so a stale total can't destroy progress.
 */
export function completedProgress(info: CompletionInfo, current: number): number | null {
  if (info.releaseStatus === "RELEASING" || info.releaseStatus === "NOT_YET_RELEASED") return null;
  const total = info.type === "ANIME" ? info.episodes : info.chapters;
  if (total == null || total <= 0) return null;
  return Math.max(current, total);
}

export interface LibraryEntry {
  media: MediaSnapshot;
  status: WatchStatus;
  /** 0–10, one decimal, or null if unrated */
  score: number | null;
  /** true when the score came from Smart Rating rather than manual input */
  smart: boolean;
  progress: number;
  rewatches: number;
  favorite: boolean;
  review?: string;
  addedAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface UserProfile {
  username: string;
  displayName: string;
  bio: string;
  avatar: string | null;
  /** ordered mediaIds for Top 4 favorites showcase */
  favorites: number[];
}

/** A recorded overall-rank position at a point in time. */
export interface RankSnapshot {
  rank: number;
  /** unix ms */
  at: number;
}

export interface RankStats {
  current: number | null;
  peak: number | null;
  lowest: number | null;
  /** rank change vs the previous distinct snapshot (positive = moved up) */
  change: number | null;
  /** true once we have more than one snapshot to compare against */
  hasHistory: boolean;
  history: RankSnapshot[];
}

const MAX_RANK_HISTORY = 60;

/** Derive per-title rank stats from a recorded history. */
export function rankStatsFor(history: RankSnapshot[] | undefined): RankStats {
  const h = history ?? [];
  if (h.length === 0) {
    return { current: null, peak: null, lowest: null, change: null, hasHistory: false, history: h };
  }
  const current = h[h.length - 1].rank;
  const peak = Math.min(...h.map((s) => s.rank)); // best = smallest number
  const lowest = Math.max(...h.map((s) => s.rank));
  const prev = h.length > 1 ? h[h.length - 2].rank : null;
  const change = prev != null ? prev - current : null; // positive = climbed
  return { current, peak, lowest, change, hasHistory: h.length > 1, history: h };
}

interface WakuState {
  profile: UserProfile;
  entries: Record<number, LibraryEntry>;
  comparisons: Comparison[];
  /** manual anchors feeding the Smart engine */
  anchors: Anchor[];
  /** cached derived smart scores (mediaId -> 0–10) */
  smartScores: Record<number, number>;
  /** overall-rank history per mediaId (records begin after this feature ships) */
  rankHistory: Record<number, RankSnapshot[]>;
  /** ephemeral: mediaId currently awaiting a rating (drives the global modal) */
  pendingRate: number | null;

  // --- rating prompt ---
  /** Open the rating modal for a title (e.g. to edit an existing score). */
  requestRate: (mediaId: number) => void;
  clearPendingRate: () => void;

  // --- library ---
  upsertEntry: (media: MediaSummary, patch: Partial<LibraryEntry>) => void;
  setStatus: (media: MediaSummary, status: WatchStatus) => void;
  /**
   * Change an existing entry's status by id — the library-side counterpart to
   * {@link setStatus} when only a stored snapshot (not a full MediaSummary) is
   * on hand. Preserves the completion → rating prompt and rewatch semantics.
   */
  setStatusById: (mediaId: number, status: WatchStatus) => void;
  setProgress: (mediaId: number, progress: number) => void;
  rate: (media: MediaSummary, score: number, smart?: boolean) => void;
  rateById: (mediaId: number, score: number, smart?: boolean) => void;
  incrementRewatch: (mediaId: number) => void;
  /** Undo an accidental rewatch — floors at 0 and un-sets REWATCHING at 0. */
  decrementRewatch: (mediaId: number) => void;
  toggleFavorite: (mediaId: number) => void;
  removeEntry: (mediaId: number) => void;
  /**
   * Apply AniList metadata patches to existing entries' snapshots without
   * touching any user-owned field or bumping `updatedAt`. Returns how many
   * entries actually changed.
   */
  mergeMediaMetadata: (patches: MediaMetadataPatch[]) => number;

  // --- smart rating ---
  /** Record a comparison. No-ops if the pair (either order) was already compared. */
  recordComparison: (winnerId: number, loserId: number) => void;
  /**
   * Remove the most recent comparison and re-derive smart scores. Pass a
   * mediaId to remove the latest comparison involving that title specifically.
   */
  undoLastComparison: (mediaId?: number) => void;
  recomputeSmart: () => void;
  smartUnlocked: () => boolean;

  // --- rankings ---
  /** Recompute overall ranks and append a snapshot wherever a rank changed. */
  recordRankSnapshots: () => void;

  // --- profile ---
  updateProfile: (patch: Partial<UserProfile>) => void;

  // --- cloud sync ---
  /** Full serialisable snapshot of the user's data for cloud storage. */
  snapshot: () => CloudSnapshot;
  /** Merge a remote snapshot into local state (newest-wins per entry). */
  mergeRemote: (remote: CloudSnapshot) => void;
}

export interface CloudSnapshot {
  profile: UserProfile;
  entries: Record<number, LibraryEntry>;
  comparisons: Comparison[];
  anchors: Anchor[];
  smartScores: Record<number, number>;
  rankHistory?: Record<number, RankSnapshot[]>;
}

const DEFAULT_PROFILE: UserProfile = {
  username: "waku_fan",
  displayName: "Waku Fan",
  bio: "Chasing the next peak.",
  avatar: null,
  favorites: [],
};

export const useWaku = create<WakuState>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      entries: {},
      comparisons: [],
      anchors: [],
      smartScores: {},
      rankHistory: {},
      pendingRate: null,

      // A title can only be rated once it's been finished — you can't judge
      // what you haven't completed. Completing (or wrapping a rewatch) is the
      // only thing that opens the rating menu.
      requestRate: (mediaId) => {
        const e = get().entries[mediaId];
        if (!e || (e.status !== "COMPLETED" && e.status !== "REWATCHING")) return;
        set({ pendingRate: mediaId });
      },
      clearPendingRate: () => set({ pendingRate: null }),

      upsertEntry: (media, patch) => {
        const now = Date.now();
        const prev = get().entries[media.id];
        const { media: _ignoredMedia, ...safePatch } = patch;
        const entry: LibraryEntry = {
          status: prev?.status ?? "PLANNING",
          score: prev?.score ?? null,
          smart: prev?.smart ?? false,
          progress: prev?.progress ?? 0,
          rewatches: prev?.rewatches ?? 0,
          favorite: prev?.favorite ?? false,
          review: prev?.review,
          addedAt: prev?.addedAt ?? now,
          updatedAt: now,
          completedAt: prev?.completedAt,
          ...safePatch,
          media: toSnapshot(media), // always keep snapshot fresh
        };
        set((s) => ({ entries: { ...s.entries, [media.id]: entry } }));
      },

      setStatus: (media, status) => {
        const prev = get().entries[media.id];
        const patch: Partial<LibraryEntry> = {
          status,
          completedAt: status === "COMPLETED" ? Date.now() : prev?.completedAt,
        };
        // Finishing a title fills in the watched count for you.
        if (status === "COMPLETED") {
          const filled = completedProgress(
            {
              type: media.type,
              episodes: media.episodes,
              chapters: media.chapters,
              releaseStatus: media.status,
            },
            prev?.progress ?? 0,
          );
          if (filled != null) patch.progress = filled;
        }
        get().upsertEntry(media, patch);
        // Completing a title prompts a rating — either the first one, or a
        // fresh take after finishing a rewatch.
        if (status === "COMPLETED") {
          const e = get().entries[media.id];
          const finishedRewatch = prev?.status === "REWATCHING";
          if (e?.score == null || finishedRewatch) set({ pendingRate: media.id });
        }
      },

      setStatusById: (mediaId, status) => {
        const prev = get().entries[mediaId];
        if (!prev) return;
        // Mirror setStatus: completing auto-fills the watched count.
        const filled =
          status === "COMPLETED"
            ? completedProgress(
                {
                  type: prev.media.type,
                  episodes: prev.media.episodes,
                  chapters: prev.media.chapters,
                  releaseStatus: prev.media.mediaStatus,
                },
                prev.progress,
              )
            : null;
        set((s) => ({
          entries: {
            ...s.entries,
            [mediaId]: {
              ...prev,
              status,
              progress: filled ?? prev.progress,
              completedAt: status === "COMPLETED" ? Date.now() : prev.completedAt,
              updatedAt: Date.now(),
            },
          },
        }));
        // Mirror setStatus: completing prompts a rating on the first finish or
        // after wrapping a rewatch.
        if (status === "COMPLETED") {
          const finishedRewatch = prev.status === "REWATCHING";
          if (prev.score == null || finishedRewatch) set({ pendingRate: mediaId });
        }
      },

      setProgress: (mediaId, progress) =>
        set((s) => {
          const e = s.entries[mediaId];
          if (!e) return s;
          return {
            entries: {
              ...s.entries,
              [mediaId]: { ...e, progress: Math.max(0, progress), updatedAt: Date.now() },
            },
          };
        }),

      rate: (media, score, smart = false) => {
        get().upsertEntry(media, { score, smart });
        if (!smart) {
          // manual score becomes / updates an anchor
          set((s) => {
            const others = s.anchors.filter((a) => a.mediaId !== media.id);
            return { anchors: [...others, { mediaId: media.id, score }] };
          });
        }
        get().recomputeSmart();
      },

      rateById: (mediaId, score, smart = false) => {
        set((s) => {
          const e = s.entries[mediaId];
          if (!e) return s;
          const entries = {
            ...s.entries,
            [mediaId]: { ...e, score, smart, updatedAt: Date.now() },
          };
          let anchors = s.anchors;
          if (!smart) {
            anchors = [
              ...s.anchors.filter((a) => a.mediaId !== mediaId),
              { mediaId, score },
            ];
          }
          // recompute smart scores with the new anchor set
          const seeds = Object.keys(entries).map(Number);
          const { scores } = computeSmart(s.comparisons, anchors, seeds);
          return { entries, anchors, smartScores: scores };
        });
        get().recordRankSnapshots();
      },

      incrementRewatch: (mediaId) =>
        set((s) => {
          const e = s.entries[mediaId];
          if (!e) return s;
          return {
            entries: {
              ...s.entries,
              [mediaId]: { ...e, rewatches: e.rewatches + 1, updatedAt: Date.now() },
            },
          };
        }),

      decrementRewatch: (mediaId) =>
        set((s) => {
          const e = s.entries[mediaId];
          if (!e || e.rewatches <= 0) return s;
          const rewatches = e.rewatches - 1;
          // If this removed the last rewatch while still marked as rewatching,
          // fall back to COMPLETED so the UI doesn't claim a 0-count rewatch.
          const status =
            rewatches === 0 && e.status === "REWATCHING" ? "COMPLETED" : e.status;
          return {
            entries: {
              ...s.entries,
              [mediaId]: { ...e, rewatches, status, updatedAt: Date.now() },
            },
          };
        }),

      toggleFavorite: (mediaId) =>
        set((s) => {
          const e = s.entries[mediaId];
          if (!e) return s;
          const favorite = !e.favorite;
          const favorites = favorite
            ? [...s.profile.favorites, mediaId].slice(-8)
            : s.profile.favorites.filter((id) => id !== mediaId);
          return {
            entries: { ...s.entries, [mediaId]: { ...e, favorite } },
            profile: { ...s.profile, favorites },
          };
        }),

      removeEntry: (mediaId) => {
        set((s) => {
          const entries = { ...s.entries };
          delete entries[mediaId];
          const rankHistory = { ...s.rankHistory };
          delete rankHistory[mediaId];
          return {
            entries,
            rankHistory,
            anchors: s.anchors.filter((a) => a.mediaId !== mediaId),
            profile: {
              ...s.profile,
              favorites: s.profile.favorites.filter((id) => id !== mediaId),
            },
          };
        });
        get().recordRankSnapshots();
      },

      mergeMediaMetadata: (patches) => {
        let changed = 0;
        set((s) => {
          const entries = { ...s.entries };
          for (const p of patches) {
            const e = entries[p.id];
            if (!e) continue;
            const prevMedia = e.media;
            // Only overwrite a field when the patch actually carries a value,
            // so a sparse AniList response never wipes known metadata.
            const media: MediaSnapshot = {
              ...prevMedia,
              type: p.type ?? prevMedia.type,
              format: p.format !== undefined ? p.format : prevMedia.format,
              title: p.title ?? prevMedia.title,
              titleEnglish: p.titleEnglish !== undefined ? p.titleEnglish : prevMedia.titleEnglish,
              titleRomaji: p.titleRomaji !== undefined ? p.titleRomaji : prevMedia.titleRomaji,
              titleNative: p.titleNative !== undefined ? p.titleNative : prevMedia.titleNative,
              cover: p.cover ?? prevMedia.cover,
              color: p.color !== undefined ? p.color : prevMedia.color,
              episodes: p.episodes !== undefined ? p.episodes : prevMedia.episodes,
              chapters: p.chapters !== undefined ? p.chapters : prevMedia.chapters,
              volumes: p.volumes !== undefined ? p.volumes : prevMedia.volumes,
              seasonYear: p.seasonYear !== undefined ? p.seasonYear : prevMedia.seasonYear,
              averageScore: p.averageScore !== undefined ? p.averageScore : prevMedia.averageScore,
              mediaStatus: p.mediaStatus !== undefined ? p.mediaStatus : prevMedia.mediaStatus,
              nextAiring: p.nextAiring !== undefined ? p.nextAiring : prevMedia.nextAiring,
            };
            // Skip the write when nothing meaningfully moved.
            entries[p.id] = { ...e, media };
            changed++;
          }
          return changed ? { entries } : s;
        });
        return changed;
      },

      recordComparison: (winnerId, loserId) => {
        if (winnerId === loserId) return;
        // Never compare the same unordered pair twice — enforced here, not
        // just in the UI, so cloud sync / undo can't sneak a duplicate in.
        const key = pairKey(winnerId, loserId);
        if (get().comparisons.some((c) => pairKey(c.winnerId, c.loserId) === key)) return;
        set((s) => ({
          comparisons: [...s.comparisons, { winnerId, loserId, at: Date.now() }],
        }));
        get().recomputeSmart();
      },

      undoLastComparison: (mediaId) => {
        const comps = get().comparisons;
        if (comps.length === 0) return;
        let idx = comps.length - 1;
        if (mediaId != null) {
          idx = -1;
          for (let i = comps.length - 1; i >= 0; i--) {
            if (comps[i].winnerId === mediaId || comps[i].loserId === mediaId) {
              idx = i;
              break;
            }
          }
          if (idx === -1) return;
        }
        set((s) => ({ comparisons: s.comparisons.filter((_, i) => i !== idx) }));
        get().recomputeSmart();
      },

      recomputeSmart: () => {
        const { comparisons, anchors, entries } = get();
        const seeds = Object.keys(entries).map(Number);
        const { scores } = computeSmart(comparisons, anchors, seeds);
        set({ smartScores: scores });
        get().recordRankSnapshots();
      },

      recordRankSnapshots: () =>
        set((s) => {
          const rated = Object.values(s.entries)
            .filter((e) => e.score != null)
            .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
          const now = Date.now();
          const rankHistory = { ...s.rankHistory };
          let changed = false;
          rated.forEach((e, i) => {
            const rank = i + 1;
            const hist = rankHistory[e.media.id] ?? [];
            const last = hist[hist.length - 1];
            if (!last || last.rank !== rank) {
              rankHistory[e.media.id] = [...hist, { rank, at: now }].slice(-MAX_RANK_HISTORY);
              changed = true;
            }
          });
          return changed ? { rankHistory } : s;
        }),

      smartUnlocked: () =>
        Object.values(get().entries).filter((e) => e.score != null).length >=
        SMART_MIN_REFERENCES,

      updateProfile: (patch) =>
        set((s) => ({ profile: { ...s.profile, ...patch } })),

      snapshot: () => {
        const s = get();
        return {
          profile: s.profile,
          entries: s.entries,
          comparisons: s.comparisons,
          anchors: s.anchors,
          smartScores: s.smartScores,
          rankHistory: s.rankHistory,
        };
      },

      mergeRemote: (remote) => {
        const local = get();
        // Entries: union, keep whichever was updated most recently.
        const entries: Record<number, LibraryEntry> = { ...local.entries };
        for (const [id, rEntry] of Object.entries(remote.entries ?? {})) {
          const key = Number(id);
          const lEntry = entries[key];
          if (!lEntry || (rEntry.updatedAt ?? 0) >= (lEntry.updatedAt ?? 0)) {
            entries[key] = rEntry;
          }
        }
        // Comparisons: union by canonical unordered pair key (A/B == B/A),
        // keeping the most recent record when legacy duplicates exist.
        const byPair = new Map<string, Comparison>();
        for (const c of [...(remote.comparisons ?? []), ...local.comparisons]) {
          const k = pairKey(c.winnerId, c.loserId);
          const existing = byPair.get(k);
          if (!existing || c.at >= existing.at) byPair.set(k, c);
        }
        const comparisons = Array.from(byPair.values()).sort((a, b) => a.at - b.at);
        // Anchors: rebuild from manually-scored entries.
        const anchors: Anchor[] = Object.values(entries)
          .filter((e) => e.score != null && !e.smart)
          .map((e) => ({ mediaId: e.media.id, score: e.score as number }));
        // Profile: prefer the one that actually has content beyond defaults.
        const remoteHasProfile = remote.profile && remote.profile.username !== DEFAULT_PROFILE.username;
        const profile = remoteHasProfile ? remote.profile : local.profile;

        // Rank history: keep the longer recorded series per title.
        const rankHistory: Record<number, RankSnapshot[]> = { ...local.rankHistory };
        for (const [id, rHist] of Object.entries(remote.rankHistory ?? {})) {
          const key = Number(id);
          if (!rankHistory[key] || rHist.length > rankHistory[key].length) {
            rankHistory[key] = rHist;
          }
        }

        const { scores } = computeSmart(comparisons, anchors, Object.keys(entries).map(Number));
        set({ entries, comparisons, anchors, profile, smartScores: scores, rankHistory });
      },
    }),
    {
      name: "waku-store-v1",
      version: 1,
      // v1 normalization: collapse legacy comparisons to one record per
      // canonical unordered pair (older Elo data could hold A/B and B/A).
      migrate: (persisted, version) => {
        const state = persisted as Partial<WakuState> | undefined;
        if (state && Array.isArray(state.comparisons) && version < 1) {
          const byPair = new Map<string, Comparison>();
          for (const c of state.comparisons) {
            const k = pairKey(c.winnerId, c.loserId);
            const existing = byPair.get(k);
            if (!existing || c.at >= existing.at) byPair.set(k, c);
          }
          state.comparisons = Array.from(byPair.values()).sort((a, b) => a.at - b.at);
        }
        return state as WakuState;
      },
      partialize: (s) => ({
        profile: s.profile,
        entries: s.entries,
        comparisons: s.comparisons,
        anchors: s.anchors,
        smartScores: s.smartScores,
        rankHistory: s.rankHistory,
      }),
    },
  ),
);

/**
 * Stable list of library entries.
 *
 * NOTE: never `useWaku((s) => Object.values(s.entries))` directly — that
 * returns a fresh array reference every render and sends React 19's
 * useSyncExternalStore into an infinite update loop. Select the stable
 * `entries` record and memoise the array instead.
 */
export function useEntriesList(): LibraryEntry[] {
  const entries = useWaku((s) => s.entries);
  return useMemo(() => Object.values(entries), [entries]);
}
