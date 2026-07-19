"use client";

import { useRef, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import {
  activeFilterCount,
  defaultFilters,
  type LibraryFilters,
  type RatedFilter,
} from "@/lib/library-filters";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Advanced filter popover (portaled — always floats above page content).
 * High-value facets live behind one compact control; a badge shows the
 * active count.
 */
export function FilterPopover({
  filters,
  setFilters,
}: {
  filters: LibraryFilters;
  setFilters: (updater: (f: LibraryFilters) => LibraryFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const count = activeFilterCount(filters);

  const patch = (p: Partial<LibraryFilters>) => setFilters((f) => ({ ...f, ...p }));

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Filters${count ? `, ${count} active` : ""}`}
        className={cn(
          "relative flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium outline-none ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
          open || count > 0
            ? "bg-white/[0.1] text-white ring-white/20"
            : "bg-white/[0.04] text-white/75 ring-white/10 hover:bg-white/[0.08] hover:text-white",
        )}
      >
        <SlidersHorizontal className="h-4 w-4" />
        <span className="hidden sm:inline">Filters</span>
        {count > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-iris-500 px-1.5 text-[11px] font-bold tabular-nums text-white">
            {count}
          </span>
        )}
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={btnRef}
        label="Library filters"
        role="dialog"
        width={320}
        className="p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Filters</h3>
          <button
            type="button"
            onClick={() => setFilters(() => defaultFilters())}
            disabled={count === 0}
            className="text-xs font-medium text-iris-300 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400 disabled:opacity-40"
          >
            Clear all
          </button>
        </div>

        <FilterGroup label="Rating">
          <Segmented<RatedFilter>
            value={filters.rated}
            onChange={(v) => patch({ rated: v })}
            options={[
              { value: "all", label: "All" },
              { value: "rated", label: "Rated" },
              { value: "unrated", label: "Unrated" },
            ]}
          />
        </FilterGroup>

        <FilterGroup label="Show only">
          <div className="flex flex-wrap gap-1.5">
            <Toggle on={filters.inProgressOnly} onClick={() => patch({ inProgressOnly: !filters.inProgressOnly })}>
              In progress
            </Toggle>
            <Toggle on={filters.favoritesOnly} onClick={() => patch({ favoritesOnly: !filters.favoritesOnly })}>
              Favorites
            </Toggle>
            <Toggle on={filters.rewatchedOnly} onClick={() => patch({ rewatchedOnly: !filters.rewatchedOnly })}>
              Rewatched
            </Toggle>
          </div>
        </FilterGroup>

        <FilterGroup label="Hide">
          <div className="flex flex-wrap gap-1.5">
            <Toggle on={filters.hideCompleted} onClick={() => patch({ hideCompleted: !filters.hideCompleted })}>
              Completed
            </Toggle>
            <Toggle on={filters.hideDropped} onClick={() => patch({ hideDropped: !filters.hideDropped })}>
              Dropped
            </Toggle>
          </div>
        </FilterGroup>

        <button
          type="button"
          onClick={() => setOpen(false)}
          className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-full bg-white/8 py-2 text-sm font-medium text-white/80 outline-none ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/12 hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
        >
          <X className="h-3.5 w-3.5" /> Done
        </button>
      </Popover>
    </>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wider text-white/40">{label}</p>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="flex gap-1 rounded-full bg-white/5 p-1 ring-1 ring-inset ring-white/10">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "flex-1 rounded-full px-2 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
            value === o.value
              ? "bg-gradient-to-b from-iris-400 to-iris-600 text-white"
              : "text-white/60 hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium outline-none ring-1 ring-inset transition-all focus-visible:ring-2 focus-visible:ring-waku-400",
        on
          ? "bg-iris-500/20 text-iris-300 ring-iris-400/40"
          : "bg-white/5 text-white/55 ring-white/10 hover:bg-white/10 hover:text-white/80",
      )}
    >
      {children}
    </button>
  );
}
