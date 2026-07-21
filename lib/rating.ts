/**
 * Waku rating tiers — a **verdict grade** system.
 *
 * A rating is a letter grade (S → F), not an arbitrary 0–10 decimal. Seven
 * meaningful tiers differentiate far more than five stars, while Smart Rating
 * comparisons still resolve the exact ranking order between titles. Internally a
 * score is still stored on a 0–10 scale (so comparisons/rankings keep working);
 * each grade owns a range and a representative `anchor` used when a grade is
 * picked directly. Colours stay cohesive with the dark-navy palette and AA-legible.
 */

/**
 * THE precision standard for every score in the app: 0–10 in 0.1 increments.
 *
 * One decimal, everywhere — the rating gauge, Smart Rating's derived scores,
 * rankings, cards, averages. Anything that produces a score MUST pass it
 * through {@link snapScore} rather than doing its own arithmetic: that keeps
 * the whole app on one grid and kills float drift (7.3 stays 7.3, never
 * 7.299999999999999, which would break exact tie detection in the rankings).
 */
export const SCORE_MIN = 0;
export const SCORE_MAX = 10;
export const SCORE_STEP = 0.1;

/** Clamp to 0–10 and snap to the nearest 0.1. The only way to make a score. */
export function snapScore(n: number): number {
  const clamped = Math.max(SCORE_MIN, Math.min(SCORE_MAX, n));
  return Math.round(clamped * 10) / 10;
}

export type TierKey =
  | "unrated"
  | "terrible"
  | "bad"
  | "meh"
  | "good"
  | "great"
  | "excellent"
  | "peak";

export interface Tier {
  key: TierKey;
  /** Letter grade shown as the rating mark. */
  grade: string;
  /** Word verdict, e.g. "Great". */
  label: string;
  /** Inclusive lower bound on the internal 0–10 scale. */
  min: number;
  /** Representative 0–10 score used when this grade is chosen directly. */
  anchor: number;
  /** Solid representative color. */
  color: string;
  /** Soft translucent fill for chips/badges. */
  soft: string;
  /** Text color that reads AA on `soft`. */
  text: string;
}

export const TIERS: Tier[] = [
  { key: "terrible",  grade: "F", label: "Terrible",  min: 0,   anchor: 1.5, color: "#7b2fb5", soft: "rgba(123,47,181,0.18)", text: "#d9b6f2" },
  { key: "bad",       grade: "E", label: "Bad",       min: 3,   anchor: 4.0, color: "#e23b4e", soft: "rgba(226,59,78,0.18)",  text: "#f6a8b1" },
  { key: "meh",       grade: "D", label: "Okay",      min: 5,   anchor: 6.0, color: "#f6871f", soft: "rgba(246,135,31,0.18)", text: "#ffca8f" },
  { key: "good",      grade: "C", label: "Good",      min: 7,   anchor: 7.5, color: "#f7c63a", soft: "rgba(247,198,58,0.18)", text: "#ffe08a" },
  { key: "great",     grade: "B", label: "Great",     min: 8,   anchor: 8.5, color: "#2fb765", soft: "rgba(47,183,101,0.18)", text: "#9fe9bf" },
  { key: "excellent", grade: "A", label: "Excellent", min: 9,   anchor: 9.3, color: "#17994f", soft: "rgba(23,153,79,0.2)",   text: "#8fe4b3" },
  { key: "peak",      grade: "S", label: "Peak",      min: 9.6, anchor: 9.9, color: "#3fc4f7", soft: "rgba(63,196,247,0.2)",  text: "#aee6ff" },
];

const UNRATED: Tier = {
  key: "unrated",
  grade: "–",
  label: "Unrated",
  min: -1,
  anchor: 0,
  color: "#6b7694",
  soft: "rgba(107,118,148,0.16)",
  text: "#b7c0d8",
};

/** Grades presented best → worst in the rating menu. */
export const GRADE_TIERS: Tier[] = [...TIERS].reverse();

/** Resolve the tier (grade) for a given internal 0–10 score. */
export function tierForScore(score?: number | null): Tier {
  if (score == null || Number.isNaN(score)) return UNRATED;
  let match = TIERS[0];
  for (const t of TIERS) {
    if (score >= t.min) match = t;
  }
  return match;
}

/** The letter grade for a score, or "–" when unrated. */
export function gradeForScore(score?: number | null): string {
  return tierForScore(score).grade;
}

/** A perfect top-of-scale score earns the special gold treatment. */
export function isPerfect(score?: number | null): boolean {
  return score != null && score >= 10;
}

export const GOLD = "#ffcf4d";
