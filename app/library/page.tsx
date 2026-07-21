"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Compass,
  Search,
  X,
  SearchX,
  Clapperboard,
  BookOpen,
  BookText,
  Clock,
  Star,
  Percent,
  ChevronRight,
  Rows3,
  LayoutGrid,
  List,
} from "lucide-react";
import {
  useEntriesList,
  useWaku,
  STATUS_LABEL,
  STATUS_ORDER,
  type LibraryEntry,
  type WatchStatus,
} from "@/lib/store";
import { useLibraryPrefs, type LibraryLayout } from "@/lib/library-prefs";
import {
  applyLibrary,
  defaultFilters,
  activeFilterCount,
  matchesType,
  compareEntries,
  entryTotal,
  type LibraryFilters,
  type TypeFilter,
} from "@/lib/library-filters";
import { useMounted } from "@/lib/use-mounted";
import { cn, formatScore } from "@/lib/utils";
import { STATUS_META } from "@/components/media/status-meta";
import { ScoreBadge } from "@/components/media/score-badge";
import { ProgressStepper } from "@/components/media/progress-stepper";
import { Button } from "@/components/ui/button";
import { EntryCard } from "@/components/library/entry-card";
import { SortMenu } from "@/components/library/sort-menu";
import { FilterPopover } from "@/components/library/filter-popover";
import { RefreshButton } from "@/components/library/refresh-button";

// Dense grid — small posters + name below, so more titles fit per screen. The
// extra gap-y leaves room for the two-line title under each poster.
const GRID_CLS =
  "grid grid-cols-3 gap-x-2.5 gap-y-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10";

/** How many posters to show per shelf before "View all". */
const SHELF_CAP = 20;

const TYPE_TABS: { value: TypeFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ANIME", label: "Anime" },
  { value: "MANGA", label: "Manga" },
  { value: "NOVEL", label: "Novels" },
];

export default function LibraryPage() {
  const mounted = useMounted();
  const entries = useEntriesList();

  const sort = useLibraryPrefs((s) => s.sort);
  const setSort = useLibraryPrefs((s) => s.setSort);
  const layout = useLibraryPrefs((s) => s.layout);
  const setLayout = useLibraryPrefs((s) => s.setLayout);

  const [statusTab, setStatusTab] = useState<WatchStatus | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<LibraryFilters>(defaultFilters);

  const mediaType = filters.type;
  const setMediaType = (t: TypeFilter) => setFilters((f) => ({ ...f, type: t }));

  const filterCount = activeFilterCount(filters);
  const trimmedSearch = search.trim();
  const isFiltering = statusTab !== "ALL" || trimmedSearch !== "" || filterCount > 0;

  const typeCounts = useMemo(() => {
    const c: Record<TypeFilter, number> = { ALL: entries.length, ANIME: 0, MANGA: 0, NOVEL: 0 };
    for (const e of entries) {
      if (matchesType(e, "ANIME")) c.ANIME++;
      else if (matchesType(e, "NOVEL")) c.NOVEL++;
      else c.MANGA++;
    }
    return c;
  }, [entries]);

  const inType = useMemo(
    () => entries.filter((e) => matchesType(e, mediaType)),
    [entries, mediaType],
  );

  // Count per status within the active type — drives the quick-filter chips.
  const statusCounts = useMemo(() => {
    const c = {} as Record<WatchStatus, number>;
    for (const s of STATUS_ORDER) c[s] = 0;
    for (const e of inType) c[e.status]++;
    return c;
  }, [inType]);

  // Headline stats for the masthead strip.
  const summary = useMemo(() => {
    let animeUnits = 0;
    let ratedSum = 0;
    let ratedN = 0;
    let completed = 0;
    for (const e of inType) {
      if (e.media.type === "ANIME") animeUnits += e.progress + (e.media.episodes ?? 0) * e.rewatches;
      if (e.score != null) {
        ratedSum += e.score;
        ratedN++;
      }
      if (e.status === "COMPLETED") completed++;
    }
    return {
      total: inType.length,
      hours: Math.round((animeUnits * 24) / 60),
      avg: ratedN ? ratedSum / ratedN : 0,
      rate: inType.length ? Math.round((completed / inType.length) * 100) : 0,
    };
  }, [inType]);

  // Shelves: entries grouped by status, each sorted by the active sort.
  const shelves = useMemo(() => {
    const map: Record<string, LibraryEntry[]> = {};
    for (const s of STATUS_ORDER) map[s] = [];
    for (const e of inType) (map[e.status] ??= []).push(e);
    for (const s of STATUS_ORDER) map[s].sort((a, b) => compareEntries(a, b, sort));
    return map;
  }, [inType, sort]);

  // Flat, filtered result set (used for grid/compact and whenever filtering).
  const results = useMemo(
    () => applyLibrary(entries, { search, statusTab, filters, sort }),
    [entries, search, statusTab, filters, sort],
  );

  if (!mounted) return <PageShell />;

  const clearAll = () => {
    setSearch("");
    setStatusTab("ALL");
    setFilters({ ...defaultFilters(), type: mediaType });
  };

  // Shelves view only makes sense unfiltered; a single-status view flattens to a grid.
  const showShelves = layout === "shelves" && !isFiltering;

  return (
    <div className="container pb-24 pt-16 md:pt-20">
      {/* ── Masthead — compact: title + inline stat chips ── */}
      <header className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <h1 className="flex items-baseline gap-2.5 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Library
            {entries.length > 0 && (
              <span className="text-sm font-bold tabular-nums text-white/35">{summary.total}</span>
            )}
          </h1>
          {entries.length > 0 && (
            <div className="flex items-center gap-2">
              <RefreshButton entries={entries} />
              <LayoutToggle layout={layout} setLayout={setLayout} />
            </div>
          )}
        </div>

        {/* slim inline stat chips */}
        {entries.length > 0 && (
          <div className="no-scrollbar mt-3 flex gap-1.5 overflow-x-auto pb-0.5">
            <StatPill icon={<Clock className="h-3.5 w-3.5" />} label="Hours" value={summary.hours.toLocaleString()} accent="#9a83ff" />
            <StatPill icon={<Star className="h-3.5 w-3.5" />} label="Avg" value={formatScore(summary.avg || null)} accent="#2fb765" />
            <StatPill icon={<Percent className="h-3.5 w-3.5" />} label="Done" value={`${summary.rate}%`} accent="#3fc4f7" />
          </div>
        )}
      </header>

      {entries.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          {/* ── Type tabs ── */}
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {TYPE_TABS.map((t) => {
              const active = mediaType === t.value;
              return (
                <button
                  key={t.value}
                  onClick={() => setMediaType(t.value)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold outline-none ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
                    active
                      ? "bg-white text-abyss-950 ring-transparent"
                      : "bg-white/[0.04] text-white/55 ring-white/10 hover:bg-white/[0.08] hover:text-white",
                  )}
                >
                  {t.label}
                  <span className={cn("text-xs font-semibold tabular-nums", active ? "text-abyss-950/50" : "text-white/35")}>
                    {typeCounts[t.value]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── Status quick-filters ── */}
          <div className="no-scrollbar -mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
            <StatusPill active={statusTab === "ALL"} onClick={() => setStatusTab("ALL")}>
              All
            </StatusPill>
            {STATUS_ORDER.filter((s) => statusCounts[s] > 0).map((s) => {
              const meta = STATUS_META[s];
              const Icon = meta.icon;
              const active = statusTab === s;
              return (
                <StatusPill
                  key={s}
                  active={active}
                  color={meta.color}
                  onClick={() => setStatusTab(active ? "ALL" : s)}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: active ? undefined : meta.color }} />
                  {STATUS_LABEL[s]}
                  <span className="text-[11px] font-bold tabular-nums opacity-60">{statusCounts[s]}</span>
                </StatusPill>
              );
            })}
          </div>

          {/* ── Search + sort + filter ── */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-[12rem] flex-1">
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
            <SortMenu value={sort} onChange={setSort} />
            <FilterPopover filters={filters} setFilters={setFilters} />
          </div>

          {/* ── Active filter chips ── */}
          {isFiltering && (
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              {statusTab !== "ALL" && (
                <Chip label={STATUS_LABEL[statusTab]} onRemove={() => setStatusTab("ALL")} />
              )}
              {trimmedSearch !== "" && <Chip label={`"${trimmedSearch}"`} onRemove={() => setSearch("")} />}
              {filters.rated !== "all" && (
                <Chip label={filters.rated === "rated" ? "Rated" : "Unrated"} onRemove={() => setFilters((f) => ({ ...f, rated: "all" }))} />
              )}
              {filters.inProgressOnly && <Chip label="In progress" onRemove={() => setFilters((f) => ({ ...f, inProgressOnly: false }))} />}
              {filters.favoritesOnly && <Chip label="Favorites" onRemove={() => setFilters((f) => ({ ...f, favoritesOnly: false }))} />}
              {filters.rewatchedOnly && <Chip label="Rewatched" onRemove={() => setFilters((f) => ({ ...f, rewatchedOnly: false }))} />}
              {filters.hideCompleted && <Chip label="Hide completed" onRemove={() => setFilters((f) => ({ ...f, hideCompleted: false }))} />}
              {filters.hideDropped && <Chip label="Hide dropped" onRemove={() => setFilters((f) => ({ ...f, hideDropped: false }))} />}
              <button
                onClick={clearAll}
                className="rounded-full px-3 py-1 text-xs font-medium text-waku-cinematic outline-none hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
              >
                Clear all
              </button>
            </div>
          )}

          {/* ── Body ── */}
          {inType.length === 0 ? (
            <TypeEmptyState type={mediaType} />
          ) : layout === "compact" ? (
            results.length === 0 ? (
              <NoResults onClear={clearAll} />
            ) : (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {results.map((e) => (
                    <CompactRow key={e.media.id} entry={e} />
                  ))}
                </div>
                <ResultCount n={results.length} />
              </>
            )
          ) : showShelves ? (
            <div className="space-y-6">
              {STATUS_ORDER.filter((s) => shelves[s].length > 0).map((s) => (
                <Shelf key={s} status={s} entries={shelves[s]} onViewAll={() => setStatusTab(s)} />
              ))}
            </div>
          ) : results.length === 0 ? (
            <NoResults onClear={clearAll} />
          ) : (
            <>
              <div className={GRID_CLS}>
                {results.map((e) => (
                  <EntryCard key={e.media.id} entry={e} />
                ))}
              </div>
              <ResultCount n={results.length} />
            </>
          )}
        </>
      )}
    </div>
  );
}

/** One status shelf: a labeled, status-tinted header + a horizontal poster rail. */
function Shelf({
  status,
  entries,
  onViewAll,
}: {
  status: WatchStatus;
  entries: LibraryEntry[];
  onViewAll: () => void;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const shown = entries.slice(0, SHELF_CAP);
  const overflow = entries.length > SHELF_CAP;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2.5">
        <span
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ background: meta.soft, color: meta.color, boxShadow: `inset 0 0 0 1px ${meta.color}55` }}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <h2 className="font-display text-lg font-extrabold tracking-tight text-white">
          {STATUS_LABEL[status]}
        </h2>
        <span
          className="rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums"
          style={{ background: meta.soft, color: meta.color }}
        >
          {entries.length}
        </span>
        <span
          aria-hidden
          className="h-px flex-1"
          style={{ background: `linear-gradient(to right, ${meta.color}55, transparent)` }}
        />
        {overflow && (
          <button
            onClick={onViewAll}
            className="flex shrink-0 items-center gap-0.5 rounded-full text-xs font-semibold text-white/55 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
          >
            View all <ChevronRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="rail -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-2">
        {shown.map((e) => (
          <div key={e.media.id} className="w-[88px] shrink-0 snap-start sm:w-[100px]">
            <EntryCard entry={e} />
          </div>
        ))}
        {overflow && (
          <button
            onClick={onViewAll}
            className="flex aspect-[2/3] w-[88px] shrink-0 flex-col items-center justify-center gap-2 rounded-xl bg-white/[0.03] text-white/60 outline-none ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400 sm:w-[100px]"
          >
            <ChevronRight className="h-5 w-5" />
            <span className="text-xs font-semibold">
              +{entries.length - SHELF_CAP} more
            </span>
          </button>
        )}
      </div>
    </section>
  );
}

/** Shelves ↔ grid ↔ compact switch. */
function LayoutToggle({
  layout,
  setLayout,
}: {
  layout: LibraryLayout;
  setLayout: (l: LibraryLayout) => void;
}) {
  const opts = [
    { value: "shelves" as const, icon: Rows3, label: "Status shelves" },
    { value: "grid" as const, icon: LayoutGrid, label: "Poster grid" },
    { value: "compact" as const, icon: List, label: "Compact list" },
  ];
  return (
    <div className="flex items-center gap-1 rounded-full bg-white/5 p-1 ring-1 ring-inset ring-white/10">
      {opts.map((o) => {
        const Icon = o.icon;
        const active = layout === o.value;
        return (
          <button
            key={o.value}
            onClick={() => setLayout(o.value)}
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

/** Dense, poster-less box: name + status + score, with an inline progress stepper. */
function CompactRow({ entry }: { entry: LibraryEntry }) {
  const { media } = entry;
  const meta = STATUS_META[entry.status];
  const total = entryTotal(entry);
  const setProgress = useWaku((s) => s.setProgress);

  return (
    <div className="group flex items-center gap-2.5 rounded-xl bg-white/[0.025] p-2.5 ring-1 ring-inset ring-white/[0.07] transition-colors hover:bg-white/[0.05]">
      <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: meta.color }} aria-hidden />
      <Link
        href={`/media/${media.id}`}
        className="min-w-0 flex-1 rounded outline-none focus-visible:ring-2 focus-visible:ring-waku-400"
      >
        <span className="block truncate text-[13px] font-bold leading-tight text-white transition-colors group-hover:text-waku-cinematic">
          {media.title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold">
          <span style={{ color: meta.color }}>{STATUS_LABEL[entry.status]}</span>
          {entry.score != null && (
            <>
              <span className="text-white/25">·</span>
              <ScoreBadge score={entry.score} size="sm" plate={false} />
            </>
          )}
        </span>
      </Link>
      <ProgressStepper
        value={entry.progress}
        total={total}
        onChange={(n) => setProgress(media.id, n)}
        size="sm"
        label={media.title}
      />
    </div>
  );
}

function ResultCount({ n }: { n: number }) {
  return (
    <p className="mt-6 text-center text-xs text-white/35" aria-live="polite">
      {n} {n === 1 ? "title" : "titles"}
    </p>
  );
}

function StatPill({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 ring-1 ring-inset"
      style={{ background: `${accent}12`, boxShadow: `inset 0 0 0 1px ${accent}2e` }}
    >
      <span style={{ color: accent }}>{icon}</span>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-white/45">{label}</span>
      <span className="font-display text-sm font-extrabold tabular-nums leading-none text-white">{value}</span>
    </div>
  );
}

function StatusPill({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-semibold outline-none ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
        !active && "bg-white/[0.03] text-white/60 ring-white/10 hover:bg-white/[0.07] hover:text-white",
      )}
      style={
        active
          ? color
            ? { background: `${color}26`, color, boxShadow: `inset 0 0 0 1.5px ${color}` }
            : { background: "rgba(255,255,255,0.16)", color: "#fff", boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.3)" }
          : undefined
      }
    >
      {children}
    </button>
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
    <div className="mx-auto my-12 flex max-w-md flex-col items-center gap-3 rounded-3xl border border-white/[0.08] bg-white/[0.015] p-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/50">
        <SearchX className="h-5 w-5" />
      </span>
      <p className="text-sm text-white/60">No titles match your search and filters.</p>
      <Button variant="glass" size="sm" onClick={onClear}>
        Clear search &amp; filters
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
    <div className="mx-auto my-12 flex max-w-md flex-col items-center gap-3 rounded-3xl border border-white/[0.08] bg-white/[0.015] p-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-waku-500/15 text-waku-cinematic">
        <Icon className="h-6 w-6" />
      </span>
      <h2 className="font-display text-lg font-extrabold text-white">No {label} yet</h2>
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
    <div className="mx-auto mt-12 flex max-w-md flex-col items-center gap-4 rounded-4xl border border-white/[0.08] bg-white/[0.02] p-12 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-waku-500/20 text-waku-cinematic">
        <Compass className="h-6 w-6" />
      </span>
      <h2 className="font-display text-2xl font-extrabold tracking-tight text-white">Your library is empty</h2>
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
      <div className="skeleton h-12 w-52 rounded-2xl" />
      <div className="mt-5 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-[60px] w-40 rounded-2xl" />
        ))}
      </div>
      <div className="mt-8 space-y-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton h-6 w-40 rounded-full" />
            <div className="mt-3 flex gap-3">
              {Array.from({ length: 7 }).map((_, j) => (
                <div key={j} className="skeleton aspect-[2/3] w-[104px] shrink-0 rounded-xl sm:w-[120px]" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
