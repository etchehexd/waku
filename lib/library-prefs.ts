"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** How the library browser renders its entries. */
export type LibraryView = "list" | "grid" | "groups";

/** Top-level library layout: status shelves, or a dense poster-less list. */
export type LibraryLayout = "shelves" | "compact";

/** Sort orders offered by the library toolbar. */
export type LibrarySort =
  | "updated" // recently updated (default)
  | "added" // recently added
  | "title" // A–Z
  | "score" // your score, high → low
  | "progress" // furthest along
  | "community" // AniList average, high → low
  | "year" // newest release first
  | "favorites"; // favorites first

export const SORT_LABEL: Record<LibrarySort, string> = {
  updated: "Recently updated",
  added: "Recently added",
  title: "Title A–Z",
  score: "Your score",
  progress: "Progress",
  community: "Community score",
  year: "Release year",
  favorites: "Favorites first",
};

/** Order the sort menu presents its options in. */
export const SORT_ORDER: LibrarySort[] = [
  "updated",
  "added",
  "title",
  "score",
  "progress",
  "community",
  "year",
  "favorites",
];

interface LibraryPrefsState {
  view: LibraryView;
  /** Shelves (default) vs a dense poster-less list. */
  layout: LibraryLayout;
  sort: LibrarySort;
  /** Whether the compact summary/stats strip is expanded. */
  summaryOpen: boolean;
  /** Whether the "Continue" active rail is shown. */
  continueOpen: boolean;
  setView: (view: LibraryView) => void;
  setLayout: (layout: LibraryLayout) => void;
  setSort: (sort: LibrarySort) => void;
  setSummaryOpen: (open: boolean) => void;
  setContinueOpen: (open: boolean) => void;
}

/**
 * View + sort preferences for the Library page. Kept in its own persisted
 * store, deliberately separate from the cloud-synced `waku-store` — these are
 * device-local display choices, not user data worth syncing.
 */
export const useLibraryPrefs = create<LibraryPrefsState>()(
  persist(
    (set) => ({
      view: "list",
      layout: "shelves",
      sort: "updated",
      summaryOpen: true,
      continueOpen: true,
      setView: (view) => set({ view }),
      setLayout: (layout) => set({ layout }),
      setSort: (sort) => set({ sort }),
      setSummaryOpen: (summaryOpen) => set({ summaryOpen }),
      setContinueOpen: (continueOpen) => set({ continueOpen }),
    }),
    { name: "waku-library-prefs" },
  ),
);
