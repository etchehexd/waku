import {
  Sprout,
  Star,
  Flame,
  Gem,
  Crown,
  Shield,
  Swords,
  Trophy,
  type LucideIcon,
} from "lucide-react";

/**
 * Otaku rank ladder. Each rank has a distinct emblem (its "logo"), a two-stop
 * gradient for the medallion, and the number of tracked titles that unlocks it.
 * The progression runs cool → vivid → prestige, ending on a gold Legend.
 *
 * Shared here so the badge, the profile ladder, and any inline mark all agree
 * on names, colors, and thresholds.
 */
export interface OtakuRank {
  /** 0-based ladder index. */
  index: number;
  /** Display name, e.g. "Connoisseur". */
  name: string;
  /** One-line flavor shown in the ladder. */
  tagline: string;
  /** Titles tracked required to reach this rank. */
  threshold: number;
  /** Emblem icon — the rank's logo. */
  icon: LucideIcon;
  /** Medallion gradient stops. */
  from: string;
  to: string;
  /** Representative solid accent (used for text / rings). */
  accent: string;
}

export const OTAKU_RANKS: OtakuRank[] = [
  { index: 0, name: "Newcomer",    tagline: "The journey begins",        threshold: 1,    icon: Sprout, from: "#9fb3d6", to: "#5b6f9e", accent: "#9fb3d6" },
  { index: 1, name: "Fan",         tagline: "Hooked on the medium",      threshold: 10,   icon: Star,   from: "#5fd0ff", to: "#2f8fe0", accent: "#5fd0ff" },
  { index: 2, name: "Enthusiast",  tagline: "A shelf worth showing",     threshold: 25,   icon: Flame,  from: "#3fe0a0", to: "#14a06a", accent: "#3fe0a0" },
  { index: 3, name: "Devotee",     tagline: "Deep in the culture",       threshold: 50,   icon: Gem,    from: "#a58bff", to: "#6e5bff", accent: "#a58bff" },
  { index: 4, name: "Connoisseur", tagline: "A refined palate",          threshold: 100,  icon: Crown,  from: "#ffd75e", to: "#f0a51f", accent: "#ffd75e" },
  { index: 5, name: "Veteran",     tagline: "Seen it all, twice",        threshold: 250,  icon: Shield, from: "#ff9d5b", to: "#f0562f", accent: "#ff9d5b" },
  { index: 6, name: "Sage",        tagline: "Wisdom of a thousand arcs", threshold: 500,  icon: Swords, from: "#ff6ba0", to: "#e23b6e", accent: "#ff6ba0" },
  { index: 7, name: "Legend",      tagline: "The summit of fandom",      threshold: 1000, icon: Trophy, from: "#ffe7a0", to: "#f5b73a", accent: "#ffe08a" },
];

export interface OtakuStanding {
  rank: OtakuRank;
  /** 1-based level number (rank index + 1). */
  level: number;
  /** Titles tracked so far. */
  total: number;
  /** Threshold of the current rank. */
  floor: number;
  /** Next rank, or null at the summit. */
  nextRank: OtakuRank | null;
  /** Next rank's threshold, or null at the summit. */
  next: number | null;
  /** 0–1 progress toward the next rank. */
  progress: number;
  /** Titles remaining to the next rank, or 0 at the summit. */
  remaining: number;
  /** True once the top rank is reached. */
  maxed: boolean;
}

/** Resolve the current standing on the ladder from a tracked-title count. */
export function otakuStanding(total: number): OtakuStanding {
  let i = 0;
  for (let k = 0; k < OTAKU_RANKS.length; k++) {
    if (total >= OTAKU_RANKS[k].threshold) i = k;
  }
  const rank = OTAKU_RANKS[i];
  const nextRank = OTAKU_RANKS[i + 1] ?? null;
  const floor = rank.threshold;
  const next = nextRank?.threshold ?? null;
  const progress = next ? (total - floor) / (next - floor) : 1;
  return {
    rank,
    level: i + 1,
    total,
    floor,
    nextRank,
    next,
    progress: Math.max(0, Math.min(1, progress)),
    remaining: next ? Math.max(0, next - total) : 0,
    maxed: nextRank == null,
  };
}
