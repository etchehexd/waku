/**
 * Waku rating tiers — 0.0 to 10.0 on a single-decimal scale.
 * Colours are intentionally cohesive with the dark-navy palette while
 * remaining WCAG-AA legible on the deep background.
 */

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
  label: string;
  /** Inclusive lower bound on the 0–10 scale. */
  min: number;
  /** Solid representative color. */
  color: string;
  /** Soft translucent fill for chips/badges. */
  soft: string;
  /** Text color that reads AA on `soft`. */
  text: string;
}

export const TIERS: Tier[] = [
  {
    key: "terrible",
    label: "Terrible",
    min: 0,
    color: "#7b2fb5",
    soft: "rgba(123,47,181,0.18)",
    text: "#d9b6f2",
  },
  {
    key: "bad",
    label: "Bad",
    min: 3,
    color: "#e23b4e",
    soft: "rgba(226,59,78,0.18)",
    text: "#f6a8b1",
  },
  {
    key: "meh",
    label: "Meh",
    min: 5,
    color: "#f6871f",
    soft: "rgba(246,135,31,0.18)",
    text: "#ffca8f",
  },
  {
    key: "good",
    label: "Good",
    min: 7,
    color: "#f7c63a",
    soft: "rgba(247,198,58,0.18)",
    text: "#ffe08a",
  },
  {
    key: "great",
    label: "Great",
    min: 8,
    color: "#2fb765",
    soft: "rgba(47,183,101,0.18)",
    text: "#9fe9bf",
  },
  {
    key: "excellent",
    label: "Excellent",
    min: 9,
    color: "#17994f",
    soft: "rgba(23,153,79,0.2)",
    text: "#8fe4b3",
  },
  {
    key: "peak",
    label: "Peak",
    min: 9.6,
    color: "#3fc4f7",
    soft: "rgba(63,196,247,0.2)",
    text: "#aee6ff",
  },
];

const UNRATED: Tier = {
  key: "unrated",
  label: "Unrated",
  min: -1,
  color: "#6b7694",
  soft: "rgba(107,118,148,0.16)",
  text: "#b7c0d8",
};

/** Resolve the tier for a given 0–10 score. */
export function tierForScore(score?: number | null): Tier {
  if (score == null || Number.isNaN(score)) return UNRATED;
  let match = TIERS[0];
  for (const t of TIERS) {
    if (score >= t.min) match = t;
  }
  return match;
}

/** A perfect 10.0 earns the special animated gold treatment. */
export function isPerfect(score?: number | null): boolean {
  return score != null && score >= 10;
}

export const GOLD = "#ffcf4d";
