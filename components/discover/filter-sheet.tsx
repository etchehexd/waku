"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { SlidersHorizontal, Search, RotateCcw } from "lucide-react";
import { Sheet, SheetSection } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ThreeStateChip, nextState, type TriState } from "./three-state-chip";
import {
  type FilterState,
  SORTS,
  STATUSES,
  ANIME_FORMATS,
  MANGA_FORMATS,
  FORMAT_LABEL,
  FALLBACK_GENRES,
  MAX_TAXONOMY,
  MIN_YEAR,
  MAX_YEAR,
  activeFilterCount,
  defaultFilters,
} from "./filters";
import { cn } from "@/lib/utils";

interface Meta {
  genres: string[];
  tags: { name: string; category: string }[];
}

async function fetchMeta(): Promise<Meta> {
  const res = await fetch("/api/discover/meta");
  if (!res.ok) throw new Error("meta");
  return res.json();
}

/**
 * Discover's advanced filters — a single button (with an active-count badge)
 * that opens a sheet covering every facet the browse API supports: sort,
 * format, release status, season/year, minimum score, and genre/tag include
 * or exclude. Edits apply live through the parent's filter state; the sheet is
 * purely an editor.
 */
export function FilterSheet({
  filters,
  setFilters,
}: {
  filters: FilterState;
  setFilters: (updater: (f: FilterState) => FilterState) => void;
}) {
  const [open, setOpen] = useState(false);
  const count = activeFilterCount(filters);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Filters${count ? `, ${count} active` : ""}`}
        className={cn(
          "relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium outline-none ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
          count > 0
            ? "bg-white/[0.1] text-white ring-white/20"
            : "bg-white/[0.05] text-white/75 ring-white/12 hover:bg-white/[0.09] hover:text-white",
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        Filters
        {count > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-iris-500 px-1.5 text-[11px] font-bold tabular-nums text-white">
            {count}
          </span>
        )}
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        label="Discover filters"
        header={
          <div className="flex items-center justify-between border-b border-white/8 p-5 pr-14">
            <h2 className="font-display text-base font-semibold text-white">Filters</h2>
            <button
              type="button"
              onClick={() => setFilters((f) => ({ ...defaultFilters(), type: f.type }))}
              disabled={count === 0}
              className="flex items-center gap-1.5 text-xs font-medium text-iris-300 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400 disabled:opacity-40"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
          </div>
        }
        footer={
          <Button variant="accent" size="md" className="w-full" onClick={() => setOpen(false)}>
            Show results
          </Button>
        }
      >
        <FilterBody filters={filters} setFilters={setFilters} />
      </Sheet>
    </>
  );
}

function FilterBody({
  filters,
  setFilters,
}: {
  filters: FilterState;
  setFilters: (updater: (f: FilterState) => FilterState) => void;
}) {
  const patch = (p: Partial<FilterState>) => setFilters((f) => ({ ...f, ...p }));
  const { data: meta } = useQuery({
    queryKey: ["discover-meta"],
    queryFn: fetchMeta,
    staleTime: 1000 * 60 * 60,
  });

  const genres = meta?.genres?.length ? meta.genres : FALLBACK_GENRES;
  const formats = filters.type === "ANIME" ? ANIME_FORMATS : MANGA_FORMATS;

  const taxonomyCount =
    Object.keys(filters.genres).length + Object.keys(filters.tags).length;
  const atLimit = taxonomyCount >= MAX_TAXONOMY;

  const cycleGenre = (g: string) => {
    setFilters((f) => {
      const cur = f.genres[g] ?? "off";
      const next = nextState(cur);
      const genresNext = { ...f.genres };
      if (next === "off") delete genresNext[g];
      else genresNext[g] = next;
      return { ...f, genres: genresNext };
    });
  };

  return (
    <div className="pb-2">
      {/* SORT */}
      <SheetSection title="Sort by">
        <PillRow>
          {SORTS.map((s) => (
            <Pill key={s.value} active={filters.sort === s.value} onClick={() => patch({ sort: s.value })}>
              {s.label}
            </Pill>
          ))}
        </PillRow>
      </SheetSection>

      <Divider />

      {/* FORMAT */}
      <SheetSection title="Format">
        <PillRow>
          <Pill active={!filters.format} onClick={() => patch({ format: null })}>
            Any
          </Pill>
          {formats.map((fmt) => (
            <Pill key={fmt} active={filters.format === fmt} onClick={() => patch({ format: fmt })}>
              {FORMAT_LABEL[fmt] ?? fmt}
            </Pill>
          ))}
        </PillRow>
      </SheetSection>

      <Divider />

      {/* STATUS */}
      <SheetSection title="Release status">
        <PillRow>
          <Pill active={!filters.status} onClick={() => patch({ status: null })}>
            Any
          </Pill>
          {STATUSES.map((s) => (
            <Pill key={s.value} active={filters.status === s.value} onClick={() => patch({ status: s.value })}>
              {s.label}
            </Pill>
          ))}
        </PillRow>
      </SheetSection>

      <Divider />

      {/* SEASON / YEAR */}
      <SheetSection title="Release window">
        <div className="flex flex-col gap-3">
          {filters.type === "ANIME" && (
            <Pill
              active={filters.thisSeason}
              onClick={() => patch({ thisSeason: !filters.thisSeason, year: null, fromYear: null, toYear: null })}
            >
              This season
            </Pill>
          )}
          <div className={cn("flex items-center gap-2", filters.thisSeason && "pointer-events-none opacity-40")}>
            <YearInput
              label="From"
              value={filters.fromYear}
              onChange={(v) => patch({ fromYear: v, thisSeason: false })}
            />
            <span className="text-white/30">–</span>
            <YearInput
              label="To"
              value={filters.toYear}
              onChange={(v) => patch({ toYear: v, thisSeason: false })}
            />
          </div>
        </div>
      </SheetSection>

      <Divider />

      {/* MIN SCORE */}
      <SheetSection title="Minimum score" hint={filters.minScore > 0 ? `${filters.minScore.toFixed(1)}+` : "Any"}>
        <input
          type="range"
          min={0}
          max={10}
          step={0.5}
          value={filters.minScore}
          onChange={(e) => patch({ minScore: Number(e.target.value) })}
          aria-label="Minimum score"
          className="w-full accent-waku-500"
        />
      </SheetSection>

      <Divider />

      {/* GENRES */}
      <SheetSection title="Genres" hint={atLimit ? `${MAX_TAXONOMY} max` : undefined}>
        <p className="mb-2.5 text-[11px] text-white/35">Tap to include, again to exclude.</p>
        <div className="flex flex-wrap gap-1.5">
          {genres.map((g) => {
            const state: TriState = filters.genres[g] ?? "off";
            return (
              <ThreeStateChip
                key={g}
                label={g}
                state={state}
                onClick={() => cycleGenre(g)}
                disabled={state === "off" && atLimit}
              />
            );
          })}
        </div>
      </SheetSection>

      {meta?.tags && meta.tags.length > 0 && (
        <>
          <Divider />
          <TagSection filters={filters} setFilters={setFilters} tags={meta.tags} atLimit={atLimit} />
        </>
      )}
    </div>
  );
}

function TagSection({
  filters,
  setFilters,
  tags,
  atLimit,
}: {
  filters: FilterState;
  setFilters: (updater: (f: FilterState) => FilterState) => void;
  tags: { name: string; category: string }[];
  atLimit: boolean;
}) {
  const [q, setQ] = useState("");

  const selected = Object.keys(filters.tags);
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [] as string[];
    return tags
      .map((t) => t.name)
      .filter((n) => n.toLowerCase().includes(term) && !filters.tags[n])
      .slice(0, 24);
  }, [q, tags, filters.tags]);

  const cycleTag = (name: string) => {
    setFilters((f) => {
      const cur = f.tags[name] ?? "off";
      const next = nextState(cur);
      const tagsNext = { ...f.tags };
      if (next === "off") delete tagsNext[name];
      else tagsNext[name] = next;
      return { ...f, tags: tagsNext };
    });
  };

  return (
    <SheetSection title="Tags">
      <div className="relative mb-2.5">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search tags…"
          aria-label="Search tags"
          className="input-field h-10 rounded-full pl-10 pr-3 text-sm"
        />
      </div>
      {(selected.length > 0 || shown.length > 0) && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((name) => (
            <ThreeStateChip
              key={name}
              label={name}
              state={filters.tags[name] as TriState}
              onClick={() => cycleTag(name)}
            />
          ))}
          {shown.map((name) => (
            <ThreeStateChip
              key={name}
              label={name}
              state="off"
              onClick={() => cycleTag(name)}
              disabled={atLimit}
            />
          ))}
        </div>
      )}
    </SheetSection>
  );
}

function Divider() {
  return <div className="mx-5 h-px bg-white/[0.07]" />;
}

function PillRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-wrap gap-1.5">{children}</div>;
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-xs font-medium outline-none ring-1 ring-inset transition-all focus-visible:ring-2 focus-visible:ring-waku-400",
        active
          ? "bg-gradient-to-b from-waku-400 to-waku-600 text-white ring-transparent"
          : "bg-white/5 text-white/65 ring-white/10 hover:bg-white/10 hover:text-white/85",
      )}
    >
      {children}
    </button>
  );
}

function YearInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <label className="flex flex-1 items-center gap-2">
      <span className="text-[11px] uppercase tracking-wider text-white/40">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        min={MIN_YEAR}
        max={MAX_YEAR}
        placeholder="—"
        value={value ?? ""}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          onChange(Number.isFinite(n) && n >= MIN_YEAR && n <= MAX_YEAR ? n : null);
        }}
        className="input-field h-9 flex-1 px-2.5 text-center text-sm tabular-nums"
      />
    </label>
  );
}
