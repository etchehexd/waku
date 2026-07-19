"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Search, Loader2, Compass, RotateCw, X, Dices } from "lucide-react";
import type { MediaSummary, PageResult } from "@/lib/anilist/types";
import { useMounted } from "@/lib/use-mounted";
import { useRecentSearches } from "@/lib/use-recent-searches";
import { MediaCard } from "@/components/media/media-card";
import { GenreTag } from "@/components/media/genre-tag";
import { FilterSheet } from "./filter-sheet";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";
import {
  type FilterState, type MediaKind,
  defaultFilters, filtersFromParams, filtersToUrl, filtersToApi,
} from "./filters";

type DiscoverResponse = {
  media: MediaSummary[];
  pageInfo: PageResult<MediaSummary>["Page"]["pageInfo"];
};

async function fetchDiscover(qs: string): Promise<DiscoverResponse> {
  // no-store: results are driven entirely by the filter query string, so never
  // let a browser/proxy HTTP cache serve a stale page for a changed filter.
  const res = await fetch(`/api/discover?${qs}`, { cache: "no-store" });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || "Search is temporarily unavailable.");
  }
  return res.json();
}

function dedupe(list: MediaSummary[]): MediaSummary[] {
  const seen = new Set<number>();
  return list.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
}

/**
 * Discover — a deliberately focused search surface. The controls beneath the
 * search bar are stripped back to a single "Surprise Me": no preset chips, no
 * facet drawer, no library toggles. Deep-links from genre tags elsewhere still
 * filter results (the genre rides in the URL and shows as a clearable pill),
 * but the browse experience itself stays calm and scannable.
 */
export function DiscoverClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mounted = useMounted();

  const initial = useMemo(
    () => filtersFromParams(new URLSearchParams(searchParams.toString())),
    // read once on mount; subsequent URL writes are ours
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [filters, setFilters] = useState<FilterState>(initial.filters);
  const [search, setSearch] = useState(initial.search);
  const [debounced, setDebounced] = useState(initial.search);
  const [surprising, setSurprising] = useState(false);

  const { recent, add: addRecent, remove: removeRecent, clear: clearRecent } = useRecentSearches();

  // debounce the raw search box
  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (debounced.length >= 2) addRecent(debounced);
  }, [debounced, addRecent]);

  // Sync filters + settled search → URL.
  const urlQuery = useMemo(() => filtersToUrl(filters, debounced), [filters, debounced]);
  const selfWrites = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!mounted) return;
    if (selfWrites.current.size > 30) selfWrites.current.clear();
    selfWrites.current.add(urlQuery);
    router.replace(`/discover?${urlQuery}`, { scroll: false });
  }, [urlQuery, mounted, router]);

  // Adopt external URL changes (nav links, back/forward, genre deep-links).
  const externalQuery = searchParams.toString();
  useEffect(() => {
    if (!mounted) return;
    if (externalQuery === urlQuery) return;
    if (selfWrites.current.has(externalQuery)) return;
    const next = filtersFromParams(new URLSearchParams(externalQuery));
    if (filtersToUrl(next.filters, next.search) === urlQuery) return;
    setFilters(next.filters);
    setSearch(next.search);
    setDebounced(next.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalQuery, mounted]);

  // One infinite query keyed purely by the active filters + search. The
  // displayed list is derived directly from the query's pages, so a filter
  // change starts a fresh query and the results can never drift out of sync
  // with a separately-held items array (the old bug: "reloads, same titles").
  const filterKey = useMemo(
    () => filtersToApi(filters, debounced, 1).toString(),
    [filters, debounced],
  );

  const {
    data,
    isFetching,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["discover", filterKey],
    queryFn: ({ pageParam }) =>
      fetchDiscover(filtersToApi(filters, debounced, pageParam).toString()),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.pageInfo.hasNextPage ? last.pageInfo.currentPage + 1 : undefined,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });

  const items = useMemo(
    () => dedupe((data?.pages ?? []).flatMap((p) => p.media)),
    [data],
  );
  const hasNext = !!hasNextPage;

  // Infinite scroll via a plain scroll/resize listener — deliberately NOT an
  // IntersectionObserver, which can silently never fire in some environments.
  // `canLoadRef` holds the latest "safe to load" flag so the rAF-throttled
  // handler reads current state without re-subscribing on every fetch; React
  // Query also de-dupes concurrent fetchNextPage calls. Re-runs on items.length
  // so a short first page auto-fills the viewport.
  const canLoadRef = useRef(false);
  canLoadRef.current = hasNext && !isFetching && !isError;
  useEffect(() => {
    if (!hasNext) return;
    let ticking = false;
    const check = () => {
      ticking = false;
      if (!canLoadRef.current) return;
      const scrollBottom = window.innerHeight + window.scrollY;
      if (scrollBottom >= document.documentElement.scrollHeight - 600) fetchNextPage();
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(check);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    check(); // fill the viewport if the first page didn't reach the fold
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [hasNext, fetchNextPage, items.length]);

  const setType = useCallback((type: MediaKind) =>
    setFilters((f) => ({ ...f, type, format: null, thisSeason: false })), []);

  // Active deep-linked genre (from a tag elsewhere in the app), if any.
  const activeGenre = useMemo(() => {
    const inc = Object.entries(filters.genres).find(([, v]) => v === "include");
    return inc?.[0] ?? null;
  }, [filters.genres]);
  const hasContext = !!debounced || !!activeGenre;

  const clearContext = () => {
    setSearch("");
    setDebounced("");
    setFilters((f) => ({ ...f, genres: {}, tags: {} }));
  };

  const surprise = async () => {
    if (items.length > 0) {
      router.push(`/media/${items[Math.floor(Math.random() * items.length)].id}`);
      return;
    }
    setSurprising(true);
    try {
      const p = filtersToApi(filters, "", 1);
      p.set("perPage", "50");
      p.set("sort", "POPULARITY_DESC");
      const res = await fetch(`/api/discover?${p.toString()}`);
      const json: DiscoverResponse = await res.json();
      const list = json.media ?? [];
      if (list.length) router.push(`/media/${list[Math.floor(Math.random() * list.length)].id}`);
    } catch {
      /* leave the user where they are */
    } finally {
      setSurprising(false);
    }
  };

  const firstLoading = isLoading && !isError;
  const refetching = isFetching && !isFetchingNextPage && items.length > 0;

  return (
    <div className="container pt-20 md:pt-24">
      <PageHeader
        icon={<Compass className="h-5 w-5" />}
        title="Discover"
      />

      {/* Search + type toggle. */}
      <div className="glass glass-sheen mb-4 rounded-3xl p-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${filters.type === "ANIME" ? "anime" : "manga & light novels"}…`}
              aria-label="Search titles"
              className="input-field h-11 rounded-full pl-11 pr-10 text-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-white/40 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-1 rounded-full bg-white/5 p-1 ring-1 ring-inset ring-white/10">
            {(["ANIME", "MANGA"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                aria-pressed={filters.type === t}
                className={cn(
                  "rounded-full px-4 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
                  filters.type === t
                    ? "bg-gradient-to-b from-waku-400 to-waku-600 text-white"
                    : "text-white/60 hover:text-white",
                )}
              >
                {t === "ANIME" ? "Anime" : "Manga / LN"}
              </button>
            ))}
          </div>
        </div>

        {/* recent searches (only when the box is empty) */}
        {mounted && !search && recent.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-white/8 pt-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/35">Recent</span>
            {recent.map((r) => (
              <span key={r} className="group inline-flex items-center rounded-full bg-white/5 text-xs text-white/70 ring-1 ring-inset ring-white/10">
                <button
                  onClick={() => setSearch(r)}
                  className="rounded-l-full py-1 pl-3 pr-1.5 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
                >
                  {r}
                </button>
                <button
                  onClick={() => removeRecent(r)}
                  aria-label={`Remove ${r} from recent searches`}
                  className="rounded-r-full py-1 pl-0.5 pr-2 text-white/30 outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              onClick={clearRecent}
              className="ml-1 text-[11px] text-white/35 outline-none hover:text-white/70 focus-visible:ring-2 focus-visible:ring-waku-400"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Controls beneath the bar: filters + Surprise Me. */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterSheet filters={filters} setFilters={setFilters} />
        <button
          onClick={surprise}
          disabled={surprising}
          className="flex shrink-0 items-center gap-2 rounded-full bg-gradient-to-b from-iris-400 to-iris-600 px-5 py-2.5 text-sm font-semibold text-white shadow-glow-iris outline-none transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-waku-400 disabled:opacity-60"
        >
          {surprising ? <Loader2 className="h-4 w-4 animate-spin" /> : <Dices className="h-4 w-4" />}
          Surprise me
        </button>
        <span className="hidden text-xs text-white/40 sm:inline">Jump to a random title from these results.</span>
      </div>

      {/* results toolbar — count + deep-linked context (clearable). */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm text-white/50">
        <div className="flex flex-wrap items-center gap-2">
          <p aria-live="polite">
            {firstLoading ? "Searching…" : items.length === 0 ? "No results" : null}
          </p>
          {activeGenre && <GenreTag genre={activeGenre} size="sm" />}
          {hasContext && (
            <button
              onClick={clearContext}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-waku-cinematic outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
            >
              <X className="h-3 w-3" /> Clear
            </button>
          )}
        </div>
        {refetching && <Loader2 className="h-4 w-4 animate-spin text-waku-cinematic" aria-label="Updating results" />}
      </div>

      {/* results */}
      {isError && items.length === 0 ? (
        <div className="glass glass-sheen mx-auto my-12 flex max-w-sm flex-col items-center gap-3 rounded-3xl p-8 text-center">
          <p className="text-sm text-white/60">Search is temporarily unavailable.</p>
          <Button variant="primary" size="sm" onClick={() => refetch()}>
            <RotateCw className="h-3.5 w-3.5" /> Retry
          </Button>
        </div>
      ) : firstLoading ? (
        <SkeletonGrid />
      ) : items.length === 0 ? (
        <div className="mx-auto my-10 flex max-w-md flex-col items-center gap-4 text-center">
          <p className="text-white/60">Nothing matches your search.</p>
          {hasContext && (
            <Button variant="glass" size="sm" onClick={clearContext}>
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((m, i) => (
            <MediaCard key={m.id} media={m} index={i % 24} className="!w-full max-w-[176px]" />
          ))}
        </div>
      )}

      {/* Pagination — auto-loads on scroll (listener above), but ALSO offers an
          explicit button so loading never depends on scroll detection working
          in a given browser/embed. Belt and suspenders. */}
      {items.length > 0 && hasNext && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="glass"
            size="md"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Loading…
              </>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
      <div className="py-6" />
    </div>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-2 justify-items-center gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 18 }).map((_, i) => (
        <div key={i} className="w-full max-w-[176px]">
          <div className="skeleton aspect-[2/3] w-full rounded-2xl" />
        </div>
      ))}
    </div>
  );
}
