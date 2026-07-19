/**
 * Smart Rating engine (Echo-inspired).
 *
 * The user rates a handful of titles manually to establish anchors, then
 * refines everything through pairwise "was X better than Y?" comparisons.
 * We run a lightweight Elo model over the comparison graph and then map the
 * resulting latent strengths onto the familiar 0–10 scale, gently pinned to
 * the user's own manual anchors so the numbers still feel like *theirs*.
 */

export interface Comparison {
  winnerId: number;
  loserId: number;
  /** unix ms */
  at: number;
}

export interface Anchor {
  mediaId: number;
  /** manual 0–10 score the user explicitly set */
  score: number;
}

const K = 32; // Elo sensitivity
const BASE = 1500;

export interface SmartResult {
  /** mediaId -> derived 0–10 score */
  scores: Record<number, number>;
  /** mediaId -> raw Elo rating */
  elo: Record<number, number>;
}

function expected(a: number, b: number): number {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

/**
 * Compute Elo from the comparison list. We iterate a few passes so early
 * matches keep getting nudged by later evidence (order-independence-ish).
 */
export function computeElo(
  comparisons: Comparison[],
  seeds: number[],
): Record<number, number> {
  const elo: Record<number, number> = {};
  for (const id of seeds) elo[id] = BASE;

  const passes = 4;
  for (let p = 0; p < passes; p++) {
    for (const c of comparisons) {
      if (elo[c.winnerId] == null) elo[c.winnerId] = BASE;
      if (elo[c.loserId] == null) elo[c.loserId] = BASE;
      const ew = expected(elo[c.winnerId], elo[c.loserId]);
      const el = 1 - ew;
      // decay K slightly on later passes for stability
      const k = K * (1 - p * 0.15);
      elo[c.winnerId] += k * (1 - ew);
      elo[c.loserId] += k * (0 - el);
    }
  }
  return elo;
}

/**
 * Map raw Elo onto 0–10, anchored to manual scores via linear regression.
 * With <2 anchors we fall back to a percentile spread across 4.0–9.5.
 */
export function deriveScores(
  elo: Record<number, number>,
  anchors: Anchor[],
): Record<number, number> {
  const ids = Object.keys(elo).map(Number);
  const scores: Record<number, number> = {};
  if (ids.length === 0) return scores;

  const usableAnchors = anchors.filter((a) => elo[a.mediaId] != null);

  if (usableAnchors.length >= 2) {
    // Least-squares fit score = m*elo + b using anchors
    const xs = usableAnchors.map((a) => elo[a.mediaId]);
    const ys = usableAnchors.map((a) => a.score);
    const n = xs.length;
    const sx = xs.reduce((s, v) => s + v, 0);
    const sy = ys.reduce((s, v) => s + v, 0);
    const sxx = xs.reduce((s, v) => s + v * v, 0);
    const sxy = xs.reduce((s, v, i) => s + v * ys[i], 0);
    const denom = n * sxx - sx * sx;
    const m = denom === 0 ? 0 : (n * sxy - sx * sy) / denom;
    const b = (sy - m * sx) / n;

    for (const id of ids) {
      let s = m * elo[id] + b;
      s = Math.max(0, Math.min(10, s));
      scores[id] = Math.round(s * 10) / 10;
    }
    // Pin anchors exactly to what the user chose.
    for (const a of usableAnchors) scores[a.mediaId] = a.score;
    return scores;
  }

  // Percentile fallback
  const sorted = [...ids].sort((a, b) => elo[a] - elo[b]);
  const lo = 4.0;
  const hi = 9.5;
  sorted.forEach((id, i) => {
    const pct = sorted.length === 1 ? 0.5 : i / (sorted.length - 1);
    scores[id] = Math.round((lo + pct * (hi - lo)) * 10) / 10;
  });
  for (const a of anchors) if (elo[a.mediaId] != null) scores[a.mediaId] = a.score;
  return scores;
}

export function computeSmart(
  comparisons: Comparison[],
  anchors: Anchor[],
  extraSeeds: number[] = [],
): SmartResult {
  const seeds = Array.from(
    new Set([
      ...anchors.map((a) => a.mediaId),
      ...extraSeeds,
      ...comparisons.flatMap((c) => [c.winnerId, c.loserId]),
    ]),
  );
  const elo = computeElo(comparisons, seeds);
  const scores = deriveScores(elo, anchors);
  return { scores, elo };
}

/** Order-independent key for a pair — one canonical key for A/B and B/A. */
export function pairKey(a: number, b: number): string {
  return a < b ? `${a}:${b}` : `${b}:${a}`;
}

/* ────────────────────────────────────────────────────────────────────────
 * Bounded insertion (Echo-style)
 *
 * The user rates ONE target title by comparing it against existing rated
 * titles. Each comparison tightens a [lower, upper] score interval until it is
 * narrow enough (or no untested reference sits inside it). The target's score
 * is then the midpoint of that interval. This is a binary search over the
 * user's own ordered ratings, so it converges in ~log2(pool) comparisons.
 * ──────────────────────────────────────────────────────────────────────── */

/** A title that can serve as a comparison reference (has a stable score). */
export interface Reference {
  id: number;
  score: number;
}

export interface Bounds {
  /** highest-scored reference the target BEAT (target sits above it) */
  lowerId: number | null;
  lowerScore: number; // -Infinity when unknown
  /** lowest-scored reference the target LOST to (target sits below it) */
  upperId: number | null;
  upperScore: number; // +Infinity when unknown
}

export interface BoundedState {
  bounds: Bounds;
  /** next reference to compare the target against, or null when finished */
  candidateId: number | null;
  /** comparisons already made involving the target */
  comparedCount: number;
  /** provisional midpoint score, honest about being an estimate */
  estimatedScore: number | null;
  /** interval is narrow enough to stop */
  settled: boolean;
  /** no untested reference remains inside the interval */
  exhausted: boolean;
  done: boolean;
}

/** Minimum eligible references (besides the target) to run Smart Rating. */
export const SMART_MIN_REFERENCES = 2;
/** Interval width (in score points) at which we consider the position pinned. */
export const SMART_INTERVAL_DONE = 0.2;

const clamp1 = (v: number) => Math.round(Math.max(0, Math.min(10, v)) * 10) / 10;

/**
 * Build the ordered reference pool for a target.
 *
 * Eligibility rule (the safe one): a reference must carry a *stable* 0–10
 * score. That means manually-rated titles AND previously Smart-Rated titles
 * (both persist a real `score`). Completed-but-unscored titles are excluded —
 * they carry no meaningful score to compare against, so including them would
 * produce arbitrary bounds. The target itself is always excluded.
 *
 * Sorted by score descending, ties broken by id ascending — fully deterministic.
 */
export function buildReferencePool(scored: Reference[], targetId: number): Reference[] {
  return scored
    .filter((r) => r.id !== targetId)
    .slice()
    .sort((a, b) => b.score - a.score || a.id - b.id);
}

function pairSet(comparisons: Comparison[]): Set<string> {
  const s = new Set<string>();
  for (const c of comparisons) s.add(pairKey(c.winnerId, c.loserId));
  return s;
}

/**
 * Derive the target's known bounds from the comparison history. Only
 * comparisons between the target and a current pool member count.
 */
export function computeBounds(
  targetId: number,
  pool: Reference[],
  comparisons: Comparison[],
): Bounds {
  const scoreOf = new Map(pool.map((r) => [r.id, r.score]));
  let lowerId: number | null = null;
  let lowerScore = -Infinity;
  let upperId: number | null = null;
  let upperScore = Infinity;

  for (const c of comparisons) {
    let other: number;
    let targetWon: boolean;
    if (c.winnerId === targetId) {
      other = c.loserId;
      targetWon = true;
    } else if (c.loserId === targetId) {
      other = c.winnerId;
      targetWon = false;
    } else {
      continue;
    }
    const os = scoreOf.get(other);
    if (os == null) continue;

    if (targetWon) {
      // target > other → tightest lower bound is the highest beaten score
      if (os > lowerScore || (os === lowerScore && (lowerId == null || other < lowerId))) {
        lowerScore = os;
        lowerId = other;
      }
    } else {
      // target < other → tightest upper bound is the lowest lost-to score
      if (os < upperScore || (os === upperScore && (upperId == null || other < upperId))) {
        upperScore = os;
        upperId = other;
      }
    }
  }
  return { lowerId, lowerScore, upperId, upperScore };
}

/**
 * Choose the next reference strictly inside the current bounds, skipping any
 * pair already compared (either direction) or skipped this session.
 *
 * - First pick (no comparisons yet): nearest a provisional estimate when one
 *   exists, otherwise the middle of the pool.
 * - Otherwise: the median of the eligible interval — a true binary search that
 *   halves the candidate set every round.
 */
export function nextCandidate(
  targetId: number,
  pool: Reference[],
  bounds: Bounds,
  comparisons: Comparison[],
  skipped: Set<string>,
  estimate?: number,
): number | null {
  const compared = pairSet(comparisons);
  const eligible = pool.filter(
    (r) =>
      r.id !== targetId &&
      r.score > bounds.lowerScore &&
      r.score < bounds.upperScore &&
      !compared.has(pairKey(targetId, r.id)) &&
      !skipped.has(pairKey(targetId, r.id)),
  );
  if (eligible.length === 0) return null;

  const noneYet = !comparisons.some((c) => c.winnerId === targetId || c.loserId === targetId);
  if (estimate != null && noneYet) {
    let best = eligible[0];
    let bestDiff = Math.abs(best.score - estimate);
    for (const r of eligible) {
      const d = Math.abs(r.score - estimate);
      if (d < bestDiff - 1e-9) {
        best = r;
        bestDiff = d;
      }
    }
    return best.id;
  }
  // eligible inherits pool's (score-desc, id-asc) order → median = middle
  return eligible[Math.floor(eligible.length / 2)].id;
}

/** Final/derived score: midpoint of the bounded interval, clamped & rounded. */
export function scoreFromBounds(bounds: Bounds, pool: Reference[]): number | null {
  if (pool.length === 0) return null;
  const scores = pool.map((r) => r.score);
  const poolMin = Math.min(...scores);
  const poolMax = Math.max(...scores);
  // When a side is unknown, fall back to just beyond the pool's edge so a
  // target that beat everything lands just above the best, and vice-versa.
  const lo = bounds.lowerScore === -Infinity ? Math.max(0, poolMin - 0.5) : bounds.lowerScore;
  const hi = bounds.upperScore === Infinity ? Math.min(10, poolMax + 0.5) : bounds.upperScore;
  return clamp1((lo + hi) / 2);
}

export function intervalSettled(bounds: Bounds): boolean {
  return (
    bounds.lowerScore !== -Infinity &&
    bounds.upperScore !== Infinity &&
    bounds.upperScore - bounds.lowerScore <= SMART_INTERVAL_DONE
  );
}

/** One-call snapshot of the bounded flow for the UI. */
export function boundedState(
  targetId: number,
  pool: Reference[],
  comparisons: Comparison[],
  skipped: Set<string>,
  estimate?: number,
): BoundedState {
  const bounds = computeBounds(targetId, pool, comparisons);
  const comparedCount = comparisons.filter(
    (c) => c.winnerId === targetId || c.loserId === targetId,
  ).length;
  const settled = intervalSettled(bounds);
  const candidateId = settled
    ? null
    : nextCandidate(targetId, pool, bounds, comparisons, skipped, estimate);
  return {
    bounds,
    candidateId,
    comparedCount,
    estimatedScore: scoreFromBounds(bounds, pool),
    settled,
    exhausted: candidateId == null && !settled,
    done: settled || candidateId == null,
  };
}
