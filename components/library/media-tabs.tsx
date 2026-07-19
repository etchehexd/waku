"use client";

import { Layers, Clapperboard, BookOpen, BookText, type LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import type { TypeFilter } from "@/lib/library-filters";
import { cn } from "@/lib/utils";

interface TabDef {
  value: TypeFilter;
  label: string;
  short: string;
  icon: LucideIcon;
  accent: string;
}

const TABS: TabDef[] = [
  { value: "ALL", label: "All", short: "All", icon: Layers, accent: "#8fb4ff" },
  { value: "ANIME", label: "Anime", short: "Anime", icon: Clapperboard, accent: "#5b8cff" },
  { value: "MANGA", label: "Manga", short: "Manga", icon: BookOpen, accent: "#2fd08a" },
  { value: "NOVEL", label: "Light Novels", short: "Novels", icon: BookText, accent: "#f3b13f" },
];

/**
 * The library's primary axis: a compact segmented control splitting the
 * collection into All · Anime · Manga · Light Novels. Each tab carries its own
 * color identity and a live count, and the active tab is marked by a shared
 * animated pill so switching feels physical. Deliberately slim — one tidy row
 * on every screen size.
 */
export function MediaTabs({
  value,
  counts,
  onSelect,
}: {
  value: TypeFilter;
  counts: Record<TypeFilter, number>;
  onSelect: (v: TypeFilter) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Media type"
      className="inline-flex gap-0.5 rounded-full bg-white/[0.04] p-0.5 ring-1 ring-inset ring-white/10"
    >
      {TABS.map((t) => {
        const active = value === t.value;
        const Icon = t.icon;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(t.value)}
            className={cn(
              "relative flex h-7 items-center justify-center gap-1.5 rounded-full px-2.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
              active ? "text-white" : "text-white/55 hover:text-white/85",
            )}
          >
            {active && (
              <motion.span
                layoutId="media-tab-pill"
                className="absolute inset-0 -z-10 rounded-full"
                style={{ background: `${t.accent}22`, boxShadow: `inset 0 0 0 1.5px ${t.accent}70` }}
                transition={{ type: "spring", stiffness: 400, damping: 34 }}
              />
            )}
            <Icon className="h-3.5 w-3.5 shrink-0" style={active ? { color: t.accent } : undefined} />
            <span className="truncate text-xs font-semibold">
              <span className="hidden sm:inline">{t.label}</span>
              <span className="sm:hidden">{t.short}</span>
            </span>
            <span
              className={cn(
                "text-[10px] font-bold leading-none tabular-nums",
                active ? "text-white/90" : "text-white/40",
              )}
            >
              {counts[t.value]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
