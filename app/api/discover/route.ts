import { NextRequest, NextResponse } from "next/server";
import { browse, type BrowseVars } from "@/lib/anilist/client";

// Results depend entirely on the query params — keep the handler dynamic so a
// changed filter is never answered from a cached render.
export const dynamic = "force-dynamic";

/**
 * Server-only boundary for browsing. The client talks to this same-origin
 * endpoint instead of calling AniList directly — that keeps the provider off
 * the wire the browser sees, lets us validate/normalise every param in one
 * place (never passing arbitrary values into the AniList query), and
 * centralises retry/backoff (in `browse`).
 */

const SORTS = new Set([
  "TRENDING_DESC",
  "POPULARITY_DESC",
  "SCORE_DESC",
  "FAVOURITES_DESC",
  "START_DATE_DESC", // newest
  "START_DATE", // oldest
  "SEARCH_MATCH",
]);
const TYPES = new Set(["ANIME", "MANGA"]);
const SEASONS = new Set(["WINTER", "SPRING", "SUMMER", "FALL"]);
const FORMATS = new Set([
  "TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA", "MUSIC",
  "MANGA", "NOVEL", "ONE_SHOT",
]);
const STATUSES = new Set([
  "FINISHED", "RELEASING", "NOT_YET_RELEASED", "CANCELLED", "HIATUS",
]);

const MIN_YEAR = 1940;
const MAX_YEAR = new Date().getFullYear() + 1;

function clampInt(v: string | null, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}

/** A validated year in [MIN_YEAR, MAX_YEAR], or undefined. */
function year(v: string | null): number | undefined {
  if (!v) return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < MIN_YEAR || n > MAX_YEAR) return undefined;
  return n;
}

function csv(v: string | null, limit = 12, maxLen = 60): string[] | undefined {
  if (!v) return undefined;
  const list = v
    .split(",")
    .map((s) => s.trim().slice(0, maxLen))
    .filter(Boolean)
    .slice(0, limit);
  return list.length ? list : undefined;
}

function csvAllowed(v: string | null, allow: Set<string>, limit = 8): string[] | undefined {
  const list = csv(v, limit)?.filter((s) => allow.has(s));
  return list && list.length ? list : undefined;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;

  const type = TYPES.has(sp.get("type") ?? "") ? (sp.get("type") as "ANIME" | "MANGA") : "ANIME";
  const search = (sp.get("search") ?? "").trim().slice(0, 100) || undefined;

  let sort = sp.get("sort") ?? "TRENDING_DESC";
  if (!SORTS.has(sort)) sort = "TRENDING_DESC";
  // A text search is always best served by relevance.
  if (search) sort = "SEARCH_MATCH";

  const format = FORMATS.has(sp.get("format") ?? "") ? (sp.get("format") as string) : undefined;
  const format_in = csvAllowed(sp.get("format_in"), FORMATS);
  const status = STATUSES.has(sp.get("status") ?? "") ? (sp.get("status") as string) : undefined;
  const season = SEASONS.has(sp.get("season") ?? "") ? (sp.get("season") as string) : undefined;
  const seasonYear = year(sp.get("seasonYear"));

  // Minimum community score is sent 0–100 (AniList's averageScore scale).
  const minScoreRaw = sp.get("minScore");
  const averageScore_greater =
    minScoreRaw != null ? clampInt(minScoreRaw, 0, 100, 0) || undefined : undefined;

  // Optional year range → FuzzyDateInt bounds. Invalid ranges are dropped.
  const fromYear = year(sp.get("fromYear"));
  const toYear = year(sp.get("toYear"));
  let startDate_greater: number | undefined;
  let startDate_lesser: number | undefined;
  if (fromYear != null && (toYear == null || fromYear <= toYear)) {
    startDate_greater = fromYear * 10000; // includes all of fromYear
  }
  if (toYear != null && (fromYear == null || fromYear <= toYear)) {
    startDate_lesser = toYear * 10000 + 9999; // includes all of toYear
  }

  const vars: BrowseVars = {
    type,
    page: clampInt(sp.get("page"), 1, 100, 1),
    perPage: clampInt(sp.get("perPage"), 1, 50, 24),
    sort: [sort],
    search,
    format,
    format_in,
    status,
    season,
    seasonYear,
    averageScore_greater,
    startDate_greater,
    startDate_lesser,
    genre_in: csv(sp.get("genre_in"), 10),
    genre_not_in: csv(sp.get("genre_not_in"), 10),
    tag_in: csv(sp.get("tag_in"), 10),
    tag_not_in: csv(sp.get("tag_not_in"), 10),
    isAdult: false,
  };

  try {
    const data = await browse(vars);
    return NextResponse.json(
      { media: data.Page.media, pageInfo: data.Page.pageInfo },
      // Never let a shared/CDN cache answer a different filter from a stale
      // entry — results are fully determined by the query params, and the edge
      // cache was serving one response across query strings in production.
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[discover] browse failed:", err);
    return NextResponse.json(
      { error: "Search is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }
}
