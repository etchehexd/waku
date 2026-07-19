"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  Rows3,
  ListTree,
  Library as LibraryIcon,
  Compass,
  Search,
  X,
  PlayCircle,
  SearchX,
  Clapperboard,
  BookOpen,
  BookText,
} from "lucide-react";
import {
  useEntriesList,
  STATUS_LABEL,
  STATUS_ORDER,
  type LibraryEntry,
  type WatchStatus,
} from "@/lib/store";
import { useLibraryPrefs, type LibraryView } from "@/lib/library-prefs";
import {
  applyLibrary,
  defaultFilters,
  activeFilterCount,
  isActive,
  matchesType,
  compareEntries,
  type LibraryFilters,
  type TypeFilter,
} from "@/lib/library-filters";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { EntryCard } from "@/components/library/entry-card";
import { LibraryRow } from "@/components/library/library-row";
import { LibrarySummary } from "@/components/library/library-summary";
import { ContinueRail } from "@/components/library/continue-rail";
import { MediaTabs } from "@/components/library/media-tabs";
import { SortMenu } from "@/components/library/sort-menu";
import { FilterPopover } from "@/components/library/filter-popover";
import { RefreshButton } from "@/components/library/refresh-button";

/** Shared compact, responsive, non-overflowing grid. */
const GRID_CLS =
  "grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-8";

const MAX_CONTINUE = 12;

export default function LibraryPage() {
  const mounted = useMounted();
  const entries = useEntriesList();

  const view = useLibraryPrefs((s) => s.view);
  const setView = useLibraryPrefs((s) => s.setView);
  const sort = useLibraryPrefs((s) => s.sort);
  const setSort = useLibraryPrefs((s) => s.setSort);

  const [statusTab, setStatusTab] = useState<WatchStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<LibraryFilters>(defaultFilters);

  const mediaType = filters.type;
  const setMediaType = (t: TypeFilter) => setFilters((f) => ({ ...f, type: t }));

  const filterCount = activeFilterCount(filters);
  const trimmedSearch = search.trim();
  const isFiltering = statusTab !== "ALL" || trimmedSearch !== "" || filterCount > 0;

  // Live per-type counts for the segmented tabs.
  const typeCounts = useMemo(() => {
    const c: Record<TypeFilter, number> = { ALL: entries.length, ANIME: 0, MANGA: 0, NOVEL: 0 };
    for (const e of entries) {
      if (matchesType(e, "ANIME")) c.ANIME++;
      else if (matchesType(e, "NOVEL")) c.NOVEL++;
      else c.MANGA++;
    }
    return c;
  }, [entries]);

  // Titles within the current media tab (before search/status/filters), for
  // the type-scoped empty state and continue rail.
  const inType = useMemo(
    () => entries.filter((e) => matchesType(e, mediaType)),
    [entries, mediaType],
  );

  // Active titles for the Continue rail — scoped to the current media tab.
  const continueEntries = useMemo(
    () =>
      inType
        .filter(isActive)
        .sort((a, b) => compareEntries(a, b, "updated"))
        .slice(0, MAX_CONTINUE),
    [inType],
  );

  const visible = useMemo(
    () => applyLibrary(entries, { search, statusTab, filters, sort }),
    [entries, search, statusTab, filters, sort],
  );

  // Grouped view derives its sections from the already-filtered list.
  const grouped = useMemo(() => {
    const map: Record<string, LibraryEntry[]> = {};
    for (const s of STATUS_ORDER) map[s] = [];
    for (const e of visible) (map[e.status] ??= []).push(e);
    return map;
  }, [visible]);

  if (!mounted) return <PageShell />;

  const clearAll = () => {
    setSearch("");
    setStatusTab("ALL");
    setFilters({ ...defaultFilters(), type: mediaType });
  };

  return (
    <div className="container pb-16 pt-20 md:pt-24">
      <PageHeader
        icon={<LibraryIcon className="h-5 w-5" />}
        title="Library"
        meta={`${entries.length} ${entries.length === 1 ? "title" : "titles"}`}
        actions={
          entries.length > 0 ? (
            <>
              <RefreshButton entries={entries} />
              <ViewToggle view={view} setView={setView} />
            </>
          ) : undefined
        }
      />

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* Primary axis — Anime / Manga / Light Novels segmented tabs. */}
          <div className="mb-2.5">
            <MediaTabs value={mediaType} counts={typeCounts} onSelect={setMediaType} />
          </div>

          {/* status summary (also the status filter) */}
          <div className="mb-3">
            <LibrarySummary entries={inType} active={statusTab} onSelect={setStatusTab} />
          </div>

          {/* Continue — only when not actively searching/filtering */}
          {!isFiltering && continueEntries.length > 0 && (
            <section className="mb-4">
              <div className="mb-2 flex items-center gap-2">
                <PlayCircle className="h-4 w-4 text-waku-cinematic" />
                <h2 className="font-display text-xs font-semibold uppercase tracking-wider text-white/70">
                  Continue
                </h2>
                <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/55">
                  {continueEntries.length}
                </span>
              </div>
              <ContinueRail entries={continueEntries} />
            </section>
          )}

          {/* toolbar — search + sort + filters (deliberately not sticky) */}
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search your library…"
                aria-label="Search your library"
                className="input-field h-10 rounded-full pl-11 pr-10 text-[13px]"
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
            <div className="flex items-center gap-2">
              <SortMenu value={sort} onChange={setSort} />
              <FilterPopover filters={filters} setFilters={setFilters} />
            </div>
          </div>

          {/* active filter chips */}
          {isFiltering && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              {statusTab !== "ALL" && (
                <Chip label={STATUS_LABEL[statusTab]} onRemove={() => setStatusTab("ALL")} />
              )}
              {trimmedSearch !== "" && (
                <Chip label={`"${trimmedSearch}"`} onRemove={() => setSearch("")} />
              )}
              {filters.rated !== "all" && (
                <Chip
                  label={filters.rated === "rated" ? "Rated" : "Unrated"}
                  onRemove={() => setFilters((f) => ({ ...f, rated: "all" }))}
                />
              )}
              {filters.inProgressOnly && (
                <Chip label="In progress" onRemove={() => setFilters((f) => ({ ...f, inProgressOnly: false }))} />
              )}
              {filters.favoritesOnly && (
                <Chip label="Favorites" onRemove={() => setFilters((f) => ({ ...f, favoritesOnly: false }))} />
              )}
              {filters.rewatchedOnly && (
                <Chip label="Rewatched" onRemove={() => setFilters((f) => ({ ...f, rewatchedOnly: false }))} />
              )}
              {filters.hideCompleted && (
                <Chip label="Hide completed" onRemove={() => setFilters((f) => ({ ...f, hideCompleted: false }))} />
              )}
              {filters.hideDropped && (
                <Chip label="Hide dropped" onRemove={() => setFilters((f) => ({ ...f, hideDropped: false }))} />
              )}
              <button
                onClick={clearAll}
                className="rounded-full px-3 py-1 text-xs font-medium text-waku-cinematic outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
              >
                Clear all
              </button>
            </div>
          )}

          {/* results */}
          {inType.length === 0 ? (
            <TypeEmptyState type={mediaType} />
          ) : visible.length === 0 ? (
            <NoResults onClear={clearAll} />
          ) : view === "list" ? (
            <ul className="flex flex-col gap-2">
              {visible.map((e) => (
                <LibraryRow key={e.media.id} entry={e} />
              ))}
            </ul>
          ) : view === "groups" ? (
            <div className="space-y-8">
              {STATUS_ORDER.filter((s) => grouped[s].length > 0).map((s) => (
                <section key={s}>
                  <div className="mb-3 flex items-center gap-2">
                    <h2 className="font-display text-lg font-semibold text-white">{STATUS_LABEL[s]}</h2>
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/55">
                      {grouped[s].length}
                    </span>
                  </div>
                  <div className={GRID_CLS}>
                    {grouped[s].map((e) => (
                      <EntryCard key={e.media.id} entry={e} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className={GRID_CLS}>
              {visible.map((e) => (
                <EntryCard key={e.media.id} entry={e} />
              ))}
            </div>
          )}

          {/* result count footer */}
          {inType.length > 0 && visible.length > 0 && (
            <p className="mt-6 text-center text-xs text-white/35" aria-live="polite">
              Showing {visible.length} of {entries.length}{" "}
              {entries.length === 1 ? "title" : "titles"}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function ViewToggle({ view, setView }: { view: LibraryView; setView: (v: LibraryView) => void }) {
  const opts: { value: LibraryView; icon: typeof Rows3; label: string }[] = [
    { value: "list", icon: Rows3, label: "Compact list" },
    { value: "grid", icon: LayoutGrid, label: "Poster grid" },
    { value: "groups", icon: ListTree, label: "Grouped by status" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-full bg-white/5 p-1 ring-1 ring-inset ring-white/10">
      {opts.map((o) => {
        const Icon = o.icon;
        const active = view === o.value;
        return (
          <button
            key={o.value}
            onClick={() => setView(o.value)}
            aria-label={o.label}
            aria-pressed={active}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
              active ? "bg-white/15 text-white" : "text-white/50 hover:text-white",
            )}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
    </div>
  );
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="group inline-flex items-center gap-1.5 rounded-full bg-white/8 px-3 py-1 text-xs font-medium text-white/80 outline-none ring-1 ring-inset ring-white/12 transition-colors hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-waku-400"
    >
      {label}
      <X className="h-3 w-3 text-white/40 group-hover:text-white/80" />
    </button>
  );
}

function NoResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="glass glass-sheen mx-auto my-10 flex max-w-md flex-col items-center gap-3 rounded-3xl p-8 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/50">
        <SearchX className="h-5 w-5" />
      </span>
      <p className="text-sm text-white/60">No titles match your search and filters.</p>
      <Button variant="glass" size="sm" onClick={onClear}>
        Clear search & filters
      </Button>
    </div>
  );
}

const TYPE_EMPTY: Record<Exclude<TypeFilter, "ALL">, { icon: typeof Clapperboard; label: string; href: string }> = {
  ANIME: { icon: Clapperboard, label: "anime", href: "/discover?type=ANIME" },
  MANGA: { icon: BookOpen, label: "manga", href: "/discover?type=MANGA" },
  NOVEL: { icon: BookText, label: "light novels", href: "/discover?type=MANGA&format=NOVEL" },
};

function TypeEmptyState({ type }: { type: TypeFilter }) {
  if (type === "ALL") return <NoResults onClear={() => {}} />;
  const { icon: Icon, label, href } = TYPE_EMPTY[type];
  return (
    <div className="glass glass-sheen mx-auto my-10 flex max-w-md flex-col items-center gap-3 rounded-4xl p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-waku-500/15 text-waku-cinematic">
        <Icon className="h-6 w-6" />
      </span>
      <h2 className="font-display text-lg font-semibold text-white">No {label} yet</h2>
      <p className="text-sm text-white/55">Titles you track will collect here.</p>
      <Link href={href}>
        <Button variant="accent" size="md">
          <Compass className="h-4 w-4" /> Find {label}
        </Button>
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass glass-sheen mx-auto mt-10 flex max-w-md flex-col items-center gap-4 rounded-4xl p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-waku-500/20 text-waku-cinematic">
        <Compass className="h-6 w-6" />
      </span>
      <h2 className="font-display text-xl font-semibold text-white">Your library is empty</h2>
      <p className="text-sm text-white/55">
        Start adding anime and manga to track your progress, ratings, and rankings.
      </p>
      <Link href="/discover">
        <Button variant="primary" size="lg">
          Discover titles
        </Button>
      </Link>
    </div>
  );
}

function PageShell() {
  return (
    <div className="container pt-20 md:pt-24">
      <div className="skeleton h-10 w-48 rounded-full" />
      <div className="mt-6 skeleton h-16 w-full rounded-2xl" />
      <div className="mt-4 flex gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-8 w-24 rounded-full" />
        ))}
      </div>
      <div className="mt-6 flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton h-[4.75rem] w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
