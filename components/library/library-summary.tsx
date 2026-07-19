"use client";

import { Layers } from "lucide-react";
import {
  STATUS_LABEL,
  STATUS_ORDER,
  type LibraryEntry,
  type WatchStatus,
} from "@/lib/store";
import { STATUS_META } from "@/components/media/status-meta";
import { cn } from "@/lib/utils";

/**
 * Compact, horizontally-scrollable status summary. Doubles as the status
 * filter: each chip shows a live count and selecting one scopes the library to
 * that status. Kept to a single scrollable row so it never pushes the actual
 * titles down the page.
 */
export function LibrarySummary({
  entries,
  active,
  onSelect,
}: {
  entries: LibraryEntry[];
  active: WatchStatus | "ALL";
  onSelect: (s: WatchStatus | "ALL") => void;
}) {
  const counts: Record<string, number> = { ALL: entries.length };
  for (const s of STATUS_ORDER) counts[s] = 0;
  for (const e of entries) counts[e.status] = (counts[e.status] ?? 0) + 1;

  // Only show status chips that actually have entries (plus "All").
  const shown = STATUS_ORDER.filter((s) => counts[s] > 0);

  return (
    <div
      className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
      role="tablist"
      aria-label="Filter by status"
    >
      <StatChip
        label="All"
        count={counts.ALL}
        color="#8fb4ff"
        active={active === "ALL"}
        icon={<Layers className="h-3.5 w-3.5" />}
        onClick={() => onSelect("ALL")}
      />
      {shown.map((s) => {
        const meta = STATUS_META[s];
        const Icon = meta.icon;
        return (
          <StatChip
            key={s}
            label={STATUS_LABEL[s]}
            count={counts[s]}
            color={meta.color}
            active={active === s}
            icon={<Icon className="h-3.5 w-3.5" />}
            onClick={() => onSelect(s)}
          />
        );
      })}
    </div>
  );
}

function StatChip({
  label,
  count,
  color,
  active,
  icon,
  onClick,
}: {
  label: string;
  count: number;
  color: string;
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium outline-none ring-1 ring-inset transition-all focus-visible:ring-2 focus-visible:ring-waku-400",
        active
          ? "text-white"
          : "bg-white/[0.04] text-white/60 ring-white/10 hover:bg-white/[0.08] hover:text-white/85",
      )}
      style={
        active
          ? { background: `${color}1f`, boxShadow: `inset 0 0 0 1.5px ${color}`, color: "#fff" }
          : undefined
      }
    >
      <span style={{ color: active ? color : undefined }}>{icon}</span>
      {label}
      <span
        className={cn(
          "rounded-full px-1 text-[10px] font-bold tabular-nums",
          active ? "bg-white/15 text-white" : "bg-white/10 text-white/50",
        )}
      >
        {count}
      </span>
    </button>
  );
}
