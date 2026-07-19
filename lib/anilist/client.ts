import { GraphQLClient } from "graphql-request";
import {
  BROWSE_QUERY,
  MEDIA_DETAIL_QUERY,
  AIRING_QUERY,
  HOME_QUERY,
  TAXONOMY_QUERY,
  LIBRARY_REFRESH_QUERY,
} from "./queries";
import type { MediaDetail, MediaSummary, PageResult } from "./types";
import { seasonNow } from "@/lib/utils";

export const ANILIST_ENDPOINT = "https://graphql.anilist.co";

export const anilist = new GraphQLClient(ANILIST_ENDPOINT, {
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/**
 * Thin request wrapper with basic AniList rate-limit awareness.
 * AniList caps at ~90 req/min; on a 429 we back off once and retry.
 */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Request wrapper with retry/backoff. AniList is flaky under bursts — it
 * answers 429 (rate limit) and, more often, 500 when several requests land
 * concurrently. We retry both a few times with exponential-ish backoff.
 */
async function request<T>(
  query: string,
  variables?: object,
  init?: RequestInit,
): Promise<T> {
  const vars = variables as Record<string, unknown> | undefined;
  const maxAttempts = 4;
  let lastErr: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await anilist.request<T>(query, vars, init?.headers as HeadersInit);
    } catch (err: unknown) {
      lastErr = err;
      const resp = (err as { response?: { status?: number; headers?: Headers } })?.response;
      const status = resp?.status;
      const retryable = status === 429 || status == null || (status != null && status >= 500 && status < 600);
      if (!retryable || attempt === maxAttempts - 1) throw err;
      // Honour Retry-After on 429 when present, else exponential-ish backoff.
      let wait = 600 * (attempt + 1) + Math.random() * 300;
      const ra = Number(resp?.headers?.get?.("retry-after"));
      if (status === 429 && Number.isFinite(ra) && ra > 0) wait = Math.min(ra * 1000 + 250, 8000);
      await sleep(wait);
    }
  }
  throw lastErr;
}

/** Run async tasks with a bounded concurrency to avoid bursting AniList. */
export async function pooled<T>(
  tasks: (() => Promise<T>)[],
  concurrency = 3,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let cursor = 0;
  async function worker() {
    while (cursor < tasks.length) {
      const i = cursor++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, worker),
  );
  return results;
}

export interface BrowseVars {
  page?: number;
  perPage?: number;
  type?: "ANIME" | "MANGA";
  sort?: string[];
  search?: string;
  season?: string;
  seasonYear?: number;
  format?: string;
  format_in?: string[];
  status?: string;
  genre_in?: string[];
  genre_not_in?: string[];
  tag_in?: string[];
  tag_not_in?: string[];
  averageScore_greater?: number;
  /** FuzzyDateInt (YYYYMMDD) lower bound for the start date. */
  startDate_greater?: number;
  /** FuzzyDateInt (YYYYMMDD) upper bound for the start date. */
  startDate_lesser?: number;
  isAdult?: boolean;
}

export async function browse(vars: BrowseVars): Promise<PageResult<MediaSummary>> {
  return request<PageResult<MediaSummary>>(BROWSE_QUERY, vars, {
    // Discover results depend ENTIRELY on `vars` (sort / filters / page), so
    // they must never be cached. AniList is a GraphQL POST — same URL every
    // time, with the filters in the request BODY — and Next's fetch Data Cache
    // keys POST requests unreliably, so a shared cache entry ends up serving the
    // FIRST filter's result for every other filter. That's invisible in dev
    // (the Data Cache is off) but in production it made every sort/genre/format
    // return the same list. Always fetch fresh; `request()` handles backoff.
    cache: "no-store",
  } as RequestInit);
}

export async function browseMedia(vars: BrowseVars): Promise<MediaSummary[]> {
  const data = await browse(vars);
  return data.Page.media;
}

export interface TaxonomyTag {
  name: string;
  category: string;
  isAdult: boolean;
  isGeneralSpoiler: boolean;
}

export interface Taxonomy {
  genres: string[];
  tags: TaxonomyTag[];
}

/** AniList's canonical genre + tag collections. Cached hard at the edge. */
export async function getTaxonomy(): Promise<Taxonomy> {
  const data = await request<{
    GenreCollection: (string | null)[] | null;
    MediaTagCollection: (TaxonomyTag | null)[] | null;
  }>(TAXONOMY_QUERY, {}, { next: { revalidate: 60 * 60 * 24 } } as RequestInit);
  return {
    genres: (data.GenreCollection ?? []).filter((g): g is string => !!g),
    tags: (data.MediaTagCollection ?? []).filter((t): t is TaxonomyTag => !!t),
  };
}

export type HeroItem = MediaSummary & { description: string | null };

/**
 * Round-robin interleave of the hero pools (trending, popular, top-rated, this
 * season), de-duplicated by id, so the featured carousel mixes categories
 * rather than showing one sort. Caps at `limit` slides.
 */
function mixHero(pools: (HeroItem[] | undefined)[], limit = 8): HeroItem[] {
  const lists = pools.map((p) => p ?? []);
  const seen = new Set<number>();
  const out: HeroItem[] = [];
  const maxLen = Math.max(0, ...lists.map((l) => l.length));
  for (let i = 0; i < maxLen && out.length < limit; i++) {
    for (const list of lists) {
      const item = list[i];
      if (!item || seen.has(item.id)) continue;
      seen.add(item.id);
      out.push(item);
      if (out.length >= limit) break;
    }
  }
  return out;
}

export interface HomepageData {
  hero: HeroItem[];
  trendingAnime: MediaSummary[];
  seasonAnime: MediaSummary[];
  popularAnime: MediaSummary[];
  topAnime: MediaSummary[];
  trendingManga: MediaSummary[];
  popularManga: MediaSummary[];
  topManga: MediaSummary[];
  lightNovels: MediaSummary[];
  trendingNovels: MediaSummary[];
  topNovels: MediaSummary[];
}

const EMPTY_HOME: HomepageData = {
  hero: [],
  trendingAnime: [],
  seasonAnime: [],
  popularAnime: [],
  topAnime: [],
  trendingManga: [],
  popularManga: [],
  topManga: [],
  lightNovels: [],
  trendingNovels: [],
  topNovels: [],
};

/**
 * Fetch the entire homepage (hero + every rail) in a single aliased request
 * to stay well within AniList's ~30 req/min limit. Returns empty rails rather
 * than throwing so a transient hiccup never blanks the page.
 */
export async function getHomepage(): Promise<HomepageData> {
  const { season, year } = seasonNow();
  try {
    const data = await request<Record<string, { media: MediaSummary[] }>>(
      HOME_QUERY,
      { season, year },
      { next: { revalidate: 60 * 15 } } as RequestInit,
    );
    return {
      hero: mixHero([
        data.heroTrending?.media as HeroItem[] | undefined,
        data.heroPopular?.media as HeroItem[] | undefined,
        data.heroTop?.media as HeroItem[] | undefined,
        data.heroSeason?.media as HeroItem[] | undefined,
      ]),
      trendingAnime: data.trendingAnime?.media ?? [],
      seasonAnime: data.seasonAnime?.media ?? [],
      popularAnime: data.popularAnime?.media ?? [],
      topAnime: data.topAnime?.media ?? [],
      trendingManga: data.trendingManga?.media ?? [],
      popularManga: data.popularManga?.media ?? [],
      topManga: data.topManga?.media ?? [],
      lightNovels: data.lightNovels?.media ?? [],
      trendingNovels: data.trendingNovels?.media ?? [],
      topNovels: data.topNovels?.media ?? [],
    };
  } catch {
    return EMPTY_HOME;
  }
}

/** A single title's freshly-fetched, refreshable metadata. */
export interface RefreshedMedia {
  id: number;
  type: "ANIME" | "MANGA";
  format: string | null;
  status: string | null;
  title: { romaji: string | null; english: string | null; native: string | null };
  coverImage: { extraLarge: string | null; large: string | null; color: string | null };
  episodes: number | null;
  chapters: number | null;
  volumes: number | null;
  seasonYear: number | null;
  averageScore: number | null;
  nextAiringEpisode: { airingAt: number; episode: number } | null;
}

/** AniList caps `perPage` at 50, so ids are refreshed in chunks of this size. */
export const REFRESH_CHUNK = 50;

/**
 * Fetch fresh metadata for a batch of library ids. Chunks into ≤50-id requests
 * and runs them with bounded concurrency to stay within AniList's rate limit.
 * Resolves with whatever succeeded plus a count of chunks that failed, so a
 * partial outage degrades gracefully instead of throwing the whole refresh away.
 */
export async function refreshLibraryMedia(
  ids: number[],
): Promise<{ media: RefreshedMedia[]; failedChunks: number; totalChunks: number }> {
  const unique = Array.from(new Set(ids.filter((n) => Number.isInteger(n) && n > 0)));
  const chunks: number[][] = [];
  for (let i = 0; i < unique.length; i += REFRESH_CHUNK) {
    chunks.push(unique.slice(i, i + REFRESH_CHUNK));
  }
  let failedChunks = 0;
  const tasks = chunks.map((chunk) => async () => {
    try {
      const data = await request<{ Page: { media: RefreshedMedia[] } }>(
        LIBRARY_REFRESH_QUERY,
        { ids: chunk, perPage: REFRESH_CHUNK },
        { cache: "no-store" } as RequestInit,
      );
      return data.Page.media ?? [];
    } catch (err) {
      console.error("[library/refresh] chunk failed:", err);
      failedChunks++;
      return [] as RefreshedMedia[];
    }
  });
  // Two at a time is comfortably under AniList's degraded ~30 req/min budget.
  const results = await pooled(tasks, 2);
  return { media: results.flat(), failedChunks, totalChunks: chunks.length };
}

export async function getMediaDetail(id: number): Promise<MediaDetail> {
  const data = await request<{ Media: MediaDetail }>(
    MEDIA_DETAIL_QUERY,
    { id },
    { next: { revalidate: 60 * 60 } } as RequestInit,
  );
  return data.Media;
}

export interface AiringItem {
  id: number;
  airingAt: number;
  episode: number;
  media: {
    id: number;
    type: string;
    format: string | null;
    isAdult: boolean;
    title: { romaji: string | null; english: string | null };
    coverImage: { large: string | null; color: string | null };
    averageScore: number | null;
  };
}

export async function getAiring(
  start: number,
  end: number,
  page = 1,
): Promise<{ items: AiringItem[]; hasNextPage: boolean }> {
  const data = await request<{
    Page: { pageInfo: { hasNextPage: boolean }; airingSchedules: AiringItem[] };
  }>(AIRING_QUERY, { start, end, page, perPage: 50 });
  return {
    items: data.Page.airingSchedules,
    hasNextPage: data.Page.pageInfo.hasNextPage,
  };
}
