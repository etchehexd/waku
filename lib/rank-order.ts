/**
 * RANKING ORDER — rating picks the tier, head-to-head picks the placement.
 *
 * A rating value alone can't order a library: once several titles share a
 * score (and at 10/10 they always will), the numeric sort has nothing left to
 * say and whatever order the array happened to be in wins. That's the bug this
 * module exists to fix.
 *
 * The model:
 *
 *   1. **Tier** — the score buckets titles. A 9.1 always outranks a 9.0. The
 *      numeric rating is never rewritten to express an ordering.
 *   2. **Placement** — *within* a bucket of equal scores, order is decided by
 *      the head-to-head comparison graph (winner → loser), resolved by a
 *      topological sort. Because it's a topological sort and not a swap, chains
 *      resolve transitively: A beats B and B beats C puts A above both, even
 *      though A and C were never compared.
 *   3. **Seed** — pairs inside a bucket with no comparison path between them
 *      keep their existing relative order, taken from the persisted
 *      `rankOrder`. Nothing reshuffles on its own; only a real comparison moves
 *      a title.
 *
 * The resolved order is written back to the store (`rankOrder`) after every
 * rating and every comparison, so it survives reloads and cloud sync. It is
 * also fully deterministic given (scores, comparisons, seed), so recomputing it
 * on load can never disagree with what was persisted.
 */

import type { Comparison } from "./smart-rating";

/** The minimum a title needs to take part in the ranking order. */
export interface Rankable {
  id: number;
  /** 0–10, one decimal. */
  score: number;
}

/**
 * Bucket key for a score. Scores are snapped to 0.1 (see `snapScore`), so
 * fixing to one decimal groups exactly the titles the user considers tied and
 * is immune to any float dust that slipped through.
 */
const bucketKey = (score: number): string => score.toFixed(1);

/**
 * Order one group of equally-rated titles by head-to-head results.
 *
 * A topological sort of the winner → loser graph, built from the BOTTOM up:
 * we repeatedly take a title that has beaten nobody still unplaced, and put it
 * at the lowest free slot; among those, the one ranked LAST in the seed order
 * goes lowest. Uncompared pairs therefore keep exactly their existing relative
 * order, and the only thing a comparison moves is the winner — it rises to sit
 * directly above what it beat.
 *
 * (Building top-down instead is equally valid topologically but wrong for this
 * product: it resolves a conflict by pushing the *loser's* untouched
 * neighbours around, so a comparison the user made about A and B visibly
 * reorders C. Bottom-up keeps the change where the user put it.)
 *
 * Transitivity is free: A beat B and B beat C keeps A above both, because C is
 * placed before B and B before A regardless of whether A and C ever met.
 *
 * Cycles (A beat B, B beat C, C beat A — entirely possible from a real person)
 * would deadlock a plain topological sort. When every remaining title still has
 * an unresolved win we break the deadlock with the one holding the fewest
 * outstanding wins, seed order deciding that tie. The result stays a total
 * order, and no comparison is dropped from the graph.
 */
export function orderTiedGroup(
  ids: number[],
  comparisons: Comparison[],
  seedRank: (id: number) => number,
): number[] {
  if (ids.length < 2) return [...ids];

  const inGroup = new Set(ids);
  /** id -> ids that beat it */
  const lostTo = new Map<number, Set<number>>();
  /** id -> how many group members it beat that are still unplaced */
  const winsLeft = new Map<number, number>();
  for (const id of ids) {
    lostTo.set(id, new Set());
    winsLeft.set(id, 0);
  }

  for (const c of comparisons) {
    if (!inGroup.has(c.winnerId) || !inGroup.has(c.loserId)) continue;
    if (c.winnerId === c.loserId) continue;
    const beatenBy = lostTo.get(c.loserId)!;
    if (beatenBy.has(c.winnerId)) continue; // already recorded
    beatenBy.add(c.winnerId);
    winsLeft.set(c.winnerId, winsLeft.get(c.winnerId)! + 1);
  }

  const remaining = new Set(ids);
  /** filled back to front — index 0 ends up the top of the group */
  const out: number[] = new Array(ids.length);
  let slot = ids.length - 1;

  /** Of the candidates, the one sitting lowest in the seed order. */
  const lowest = (candidates: number[]): number =>
    candidates.reduce((worst, id) => (seedRank(id) > seedRank(worst) ? id : worst));

  while (remaining.size > 0) {
    const free = [...remaining].filter((id) => winsLeft.get(id) === 0);
    const next =
      free.length > 0
        ? lowest(free)
        : // Cycle: everyone still has an unplaced victim. Demote whoever has
          // the fewest wins outstanding, seed order breaking the tie.
          (() => {
            const fewest = Math.min(...[...remaining].map((id) => winsLeft.get(id)!));
            return lowest([...remaining].filter((id) => winsLeft.get(id) === fewest));
          })();

    out[slot--] = next;
    remaining.delete(next);
    for (const winner of lostTo.get(next)!) {
      if (remaining.has(winner)) winsLeft.set(winner, winsLeft.get(winner)! - 1);
    }
  }

  return out;
}

/**
 * The full ranked order of every scored title: buckets by score (high → low),
 * then head-to-head placement inside each bucket.
 *
 * `seed` is the previously persisted order; anything missing from it (a
 * newly-rated title, or a library restored from an older snapshot) sorts after
 * everything the seed knows about, by score then id, so the result is stable
 * and never depends on object key order.
 */
export function computeRankOrder(
  rated: Rankable[],
  comparisons: Comparison[],
  seed: number[] = [],
): number[] {
  if (rated.length === 0) return [];

  const seedIndex = new Map<number, number>();
  seed.forEach((id, i) => seedIndex.set(id, i));

  // Newcomers get seed ranks after every known title, ordered deterministically
  // (higher score first, then id) so two titles rated in the same tick don't
  // land in a random order.
  const unseeded = rated
    .filter((r) => !seedIndex.has(r.id))
    .sort((a, b) => b.score - a.score || a.id - b.id);
  unseeded.forEach((r, i) => seedIndex.set(r.id, seed.length + i));

  const seedRank = (id: number) => seedIndex.get(id) ?? Number.MAX_SAFE_INTEGER;

  const buckets = new Map<string, number[]>();
  for (const r of rated) {
    const key = bucketKey(r.score);
    const list = buckets.get(key);
    if (list) list.push(r.id);
    else buckets.set(key, [r.id]);
  }

  return [...buckets.keys()]
    .sort((a, b) => Number(b) - Number(a)) // highest score bucket first
    .flatMap((key) => orderTiedGroup(buckets.get(key)!, comparisons, seedRank));
}

/**
 * Sort any list of scored things into ranking order.
 *
 * Unscored items are dropped — rankings only contain rated titles.
 */
export function sortByRankOrder<T>(
  items: T[],
  getId: (item: T) => number,
  order: number[],
): T[] {
  const pos = new Map<number, number>();
  order.forEach((id, i) => pos.set(id, i));
  return [...items].sort(
    (a, b) =>
      (pos.get(getId(a)) ?? Number.MAX_SAFE_INTEGER) -
      (pos.get(getId(b)) ?? Number.MAX_SAFE_INTEGER),
  );
}
