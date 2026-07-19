import type { Comparison } from "./smart-rating";
import type { LibraryEntry } from "./store";

/**
 * Ranking-specific derived stats. These lean on Waku's pairwise comparison
 * (Elo) engine and the community score, surfacing numbers that live nowhere
 * else in the app — the things that make the rankings page its own thing rather
 * than a re-skin of a library list.
 */

export interface HeadToHead {
  wins: number;
  losses: number;
  total: number;
  /** 0–1 win rate, or null when the title has never been in a matchup. */
  winRate: number | null;
}

/** A title's matchup record, derived from the comparison graph. */
export function headToHead(id: number, comparisons: Comparison[]): HeadToHead {
  let wins = 0;
  let losses = 0;
  for (const c of comparisons) {
    if (c.winnerId === id) wins++;
    else if (c.loserId === id) losses++;
  }
  const total = wins + losses;
  return { wins, losses, total, winRate: total > 0 ? wins / total : null };
}

/** Your score minus the community average, both on the 0–10 scale. */
export function communityDelta(e: LibraryEntry): number | null {
  if (e.score == null || e.media.averageScore == null) return null;
  return e.score - e.media.averageScore / 10;
}

/** Median of a numeric list (0 for an empty list). */
export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export interface CriticBias {
  /** mean signed delta vs community (positive = you rate higher). */
  mean: number;
  /** how many titles fed the average. */
  sampled: number;
  label: "Generous" | "Tough" | "In tune";
}

/** How your scores sit against the community, on average. */
export function criticBias(entries: LibraryEntry[]): CriticBias | null {
  const deltas = entries
    .map(communityDelta)
    .filter((d): d is number => d != null);
  if (deltas.length === 0) return null;
  const mean = deltas.reduce((s, d) => s + d, 0) / deltas.length;
  const label = mean > 0.3 ? "Generous" : mean < -0.3 ? "Tough" : "In tune";
  return { mean, sampled: deltas.length, label };
}
