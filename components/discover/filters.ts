import { seasonNow } from "@/lib/utils";
import type { TriState } from "./three-state-chip";

export type MediaKind = "ANIME" | "MANGA";

export interface FilterState {
  type: MediaKind;
  sort: string;
  format: string | null;
  status: string | null;
  /** anime only — overrides exact/range year when true */
  thisSeason: boolean;
  year: number | null; // exact
  fromYear: number | null; // range start
  toYear: number | null; // range end
  /** 0–10 (0 = off) */
  minScore: number;
  genres: Record<string, TriState>;
  tags: Record<string, TriState>;
}

export const DEFAULT_SORT = "TRENDING_DESC";

export const SORTS: { value: string; label: string }[] = [
  { value: "TRENDING_DESC", label: "Trending" },
  { value: "POPULARITY_DESC", label: "Popularity" },
  { value: "SCORE_DESC", label: "Average score" },
  { value: "FAVOURITES_DESC", label: "Favorites" },
  { value: "START_DATE_DESC", label: "Newest" },
  { value: "START_DATE", label: "Oldest" },
];
const SORT_VALUES = new Set(SORTS.map((s) => s.value));

export const ANIME_FORMATS = ["TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA", "MUSIC"];
export const MANGA_FORMATS = ["MANGA", "NOVEL", "ONE_SHOT"];
const FORMAT_VALUES = new Set([...ANIME_FORMATS, ...MANGA_FORMATS]);

export const STATUSES: { value: string; label: string }[] = [
  { value: "FINISHED", label: "Finished" },
  { value: "RELEASING", label: "Releasing" },
  { value: "NOT_YET_RELEASED", label: "Upcoming" },
  { value: "HIATUS", label: "Hiatus" },
  { value: "CANCELLED", label: "Canceled" },
];
const STATUS_VALUES = new Set(STATUSES.map((s) => s.value));

export const FORMAT_LABEL: Record<string, string> = {
  TV: "TV", TV_SHORT: "TV Short", MOVIE: "Movie", SPECIAL: "Special",
  OVA: "OVA", ONA: "ONA", MUSIC: "Music", MANGA: "Manga", NOVEL: "Light Novel", ONE_SHOT: "One Shot",
};

/** Safe fallback genres before the taxonomy endpoint responds. */
export const FALLBACK_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Horror",
  "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological", "Romance",
  "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller",
];

export const MIN_YEAR = 1940;
export const MAX_YEAR = new Date().getFullYear() + 1;
/** Max include+exclude selections per taxonomy (genres, tags). */
export const MAX_TAXONOMY = 8;

export function defaultFilters(): FilterState {
  return {
    type: "ANIME",
    sort: DEFAULT_SORT,
    format: null,
    status: null,
    thisSeason: false,
    year: null,
    fromYear: null,
    toYear: null,
    minScore: 0,
    genres: {},
    tags: {},
  };
}

function validYear(v: string | null): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isInteger(n) && n >= MIN_YEAR && n <= MAX_YEAR ? n : null;
}

function triFromCsv(
  include: string | null,
  exclude: string | null,
  extraInclude?: string | null,
): Record<string, TriState> {
  const out: Record<string, TriState> = {};
  const push = (csv: string | null, state: TriState) => {
    csv?.split(",").map((s) => s.trim()).filter(Boolean).forEach((g) => {
      out[g] = state;
    });
  };
  push(include, "include");
  if (extraInclude) out[extraInclude.trim()] = "include";
  push(exclude, "exclude"); // exclude wins on conflict
  return out;
}

/** Read a shareable/reload-safe filter state from the URL (back-compatible). */
export function filtersFromParams(sp: URLSearchParams): { filters: FilterState; search: string } {
  const f = defaultFilters();
  f.type = sp.get("type") === "MANGA" ? "MANGA" : "ANIME";
  const sort = sp.get("sort");
  if (sort && SORT_VALUES.has(sort)) f.sort = sort;
  const format = sp.get("format");
  if (format && FORMAT_VALUES.has(format)) f.format = format;
  const status = sp.get("status");
  if (status && STATUS_VALUES.has(status)) f.status = status;
  f.thisSeason = sp.get("season") === "1";
  f.year = validYear(sp.get("seasonYear"));
  f.fromYear = validYear(sp.get("fromYear"));
  f.toYear = validYear(sp.get("toYear"));
  const ms = Number(sp.get("minScore"));
  if (Number.isFinite(ms) && ms > 0 && ms <= 10) f.minScore = Math.round(ms * 2) / 2;
  // legacy single ?genre=Action plus modern genre_in / genre_not_in
  f.genres = triFromCsv(sp.get("genre_in"), sp.get("genre_not_in"), sp.get("genre"));
  f.tags = triFromCsv(sp.get("tag_in"), sp.get("tag_not_in"));
  return { filters: f, search: (sp.get("search") ?? "").slice(0, 100) };
}

const csvOf = (rec: Record<string, TriState>, want: TriState) =>
  Object.entries(rec)
    .filter(([, v]) => v === want)
    .map(([k]) => k);

/** Build the browser URL query string (kept minimal + human-readable). */
export function filtersToUrl(f: FilterState, search: string): string {
  const p = new URLSearchParams();
  p.set("type", f.type);
  if (search.trim()) p.set("search", search.trim());
  if (f.sort !== DEFAULT_SORT) p.set("sort", f.sort);
  if (f.format) p.set("format", f.format);
  if (f.status) p.set("status", f.status);
  if (f.thisSeason) p.set("season", "1");
  else {
    if (f.year) p.set("seasonYear", String(f.year));
    if (f.fromYear) p.set("fromYear", String(f.fromYear));
    if (f.toYear) p.set("toYear", String(f.toYear));
  }
  if (f.minScore > 0) p.set("minScore", String(f.minScore));
  const gi = csvOf(f.genres, "include");
  const ge = csvOf(f.genres, "exclude");
  const ti = csvOf(f.tags, "include");
  const te = csvOf(f.tags, "exclude");
  if (gi.length) p.set("genre_in", gi.join(","));
  if (ge.length) p.set("genre_not_in", ge.join(","));
  if (ti.length) p.set("tag_in", ti.join(","));
  if (te.length) p.set("tag_not_in", te.join(","));
  return p.toString();
}

/** Build the params sent to /api/discover (resolves season, score scale…). */
export function filtersToApi(f: FilterState, search: string, page: number): URLSearchParams {
  const p = new URLSearchParams();
  p.set("type", f.type);
  p.set("page", String(page));
  p.set("perPage", "24");
  const term = search.trim();
  p.set("sort", term ? "SEARCH_MATCH" : f.sort);
  if (term) p.set("search", term);
  if (f.format) p.set("format", f.format);
  if (f.status) p.set("status", f.status);

  if (f.thisSeason && f.type === "ANIME") {
    const { season, year } = seasonNow();
    p.set("season", season);
    p.set("seasonYear", String(year));
  } else {
    if (f.year) p.set("seasonYear", String(f.year));
    if (f.fromYear) p.set("fromYear", String(f.fromYear));
    if (f.toYear) p.set("toYear", String(f.toYear));
  }
  if (f.minScore > 0) p.set("minScore", String(Math.max(0, Math.round(f.minScore * 10) - 1)));

  const gi = csvOf(f.genres, "include");
  const ge = csvOf(f.genres, "exclude");
  const ti = csvOf(f.tags, "include");
  const te = csvOf(f.tags, "exclude");
  if (gi.length) p.set("genre_in", gi.join(","));
  if (ge.length) p.set("genre_not_in", ge.join(","));
  if (ti.length) p.set("tag_in", ti.join(","));
  if (te.length) p.set("tag_not_in", te.join(","));
  return p;
}

/** Count of active *content* filters (excludes type + sort + search). */
export function activeFilterCount(f: FilterState): number {
  let n = 0;
  if (f.format) n++;
  if (f.status) n++;
  if (f.thisSeason) n++;
  if (f.year) n++;
  if (f.fromYear || f.toYear) n++;
  if (f.minScore > 0) n++;
  n += Object.keys(f.genres).length;
  n += Object.keys(f.tags).length;
  return n;
}

export function taxonomyCount(f: FilterState): number {
  return Object.keys(f.genres).length + Object.keys(f.tags).length;
}
