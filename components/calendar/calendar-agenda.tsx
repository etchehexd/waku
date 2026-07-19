"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock, Library, Sparkles } from "lucide-react";
import { useWaku, STATUS_LABEL, type LibraryEntry } from "@/lib/store";
import { STATUS_META } from "@/components/media/status-meta";
import { useMounted } from "@/lib/use-mounted";
import { ScoreBadge } from "@/components/media/score-badge";
import { cn } from "@/lib/utils";

export interface DayItem {
  id: number;
  mediaId: number;
  title: string;
  cover: string | null;
  time: string;
  episode: number;
  score: number | null;
}

export interface AgendaDay {
  label: string;
  dateLabel: string;
  items: DayItem[];
}

/**
 * The airing calendar as a day-at-a-time agenda: a row of day pills (Today,
 * Tomorrow, …) selects a single day, and its episodes list below in a clean
 * timeline. A scope toggle narrows the whole thing to the shows you actually
 * track, and those rows are tinted in their library status color.
 */
export function CalendarAgenda({ days }: { days: AgendaDay[] }) {
  const mounted = useMounted();
  const entries = useWaku((s) => s.entries);
  const [mineOnly, setMineOnly] = useState(false);
  const [selected, setSelected] = useState(0);

  // Apply the library scope up front so both the pill counts and the list agree.
  const scoped = useMemo(
    () =>
      days.map((d) => ({
        ...d,
        items: mineOnly ? d.items.filter((i) => entries[i.mediaId]) : d.items,
      })),
    [days, mineOnly, entries],
  );

  const libCount = useMemo(() => {
    if (!mounted) return 0;
    return days.reduce((n, d) => n + d.items.filter((i) => entries[i.mediaId]).length, 0);
  }, [days, entries, mounted]);

  const current = scoped[selected] ?? scoped[0];

  return (
    <>
      {/* scope toggle */}
      <div className="mb-4 inline-flex gap-0.5 rounded-full bg-white/[0.04] p-0.5 ring-1 ring-inset ring-white/10">
        <Segment active={!mineOnly} onClick={() => setMineOnly(false)} icon={<Sparkles className="h-3.5 w-3.5" />}>
          All airing
        </Segment>
        <Segment active={mineOnly} onClick={() => setMineOnly(true)} icon={<Library className="h-3.5 w-3.5" />}>
          My library
          {mounted && libCount > 0 && (
            <span className="ml-1 rounded-full bg-white/15 px-1.5 text-[10px] font-bold tabular-nums text-white">
              {libCount}
            </span>
          )}
        </Segment>
      </div>

      {/* day pills */}
      <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Pick a day">
        {scoped.map((d, i) => (
          <DayPill
            key={d.label}
            active={i === selected}
            label={d.label}
            date={d.dateLabel}
            count={d.items.length}
            onClick={() => setSelected(i)}
          />
        ))}
      </div>

      {/* selected day header */}
      <div className="mb-3 flex items-baseline gap-2.5">
        <h2 className="font-display text-xl font-bold tracking-tight text-white">{current.label}</h2>
        <span className="text-sm text-white/40">{current.dateLabel}</span>
      </div>

      {current.items.length === 0 ? (
        <div className="glass glass-sheen flex flex-col items-center gap-3 rounded-3xl p-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/5 text-white/50">
            <Clock className="h-5 w-5" />
          </span>
          <p className="text-sm text-white/60">
            {mineOnly ? "None of your tracked shows air this day." : "No scheduled releases this day."}
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {current.items.map((it) => (
            <AgendaRow key={it.id} it={it} entry={mounted ? entries[it.mediaId] : undefined} />
          ))}
        </ul>
      )}
    </>
  );
}

function DayPill({
  active,
  label,
  date,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  date: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex min-w-[4.75rem] shrink-0 flex-col items-center gap-0.5 rounded-2xl px-3 py-2 outline-none ring-1 ring-inset transition-all focus-visible:ring-2 focus-visible:ring-waku-400",
        active
          ? "bg-waku-500/20 text-white ring-waku-400/50"
          : "bg-white/[0.04] text-white/60 ring-white/10 hover:bg-white/[0.08] hover:text-white/85",
      )}
    >
      <span className="text-[13px] font-bold leading-tight">{label}</span>
      <span className={cn("text-[10px]", active ? "text-white/70" : "text-white/40")}>{date}</span>
      <span
        className={cn(
          "mt-0.5 rounded-full px-1.5 text-[10px] font-bold tabular-nums",
          active ? "bg-white/20 text-white" : "bg-white/10 text-white/50",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function AgendaRow({ it, entry }: { it: DayItem; entry: LibraryEntry | undefined }) {
  const meta = entry ? STATUS_META[entry.status] : null;
  const StatusIcon = meta?.icon;

  return (
    <li>
      <Link
        href={`/media/${it.mediaId}`}
        className={cn(
          "group flex items-center gap-3 rounded-2xl p-2 ring-1 ring-inset transition-colors",
          meta ? "hover:brightness-110" : "bg-white/[0.03] ring-white/8 hover:bg-white/[0.06]",
        )}
        style={meta ? { background: meta.soft, boxShadow: `inset 0 0 0 1.5px ${meta.color}55` } : undefined}
      >
        <div className="w-12 shrink-0 text-center">
          <p className="text-[13px] font-semibold tabular-nums leading-none text-white">{it.time}</p>
          <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-white/40">EP {it.episode}</p>
        </div>

        <div
          className={cn("relative h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-abyss-700", meta && "ring-1 ring-inset")}
          style={meta ? { boxShadow: `inset 0 0 0 1.5px ${meta.color}` } : undefined}
        >
          {it.cover && <Image src={it.cover} alt="" fill sizes="40px" className="object-cover" />}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white transition-colors group-hover:text-waku-cinematic">
            {it.title}
          </p>
          {meta && StatusIcon && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: meta.color }}>
              <StatusIcon className="h-3 w-3" /> {STATUS_LABEL[entry!.status]}
            </p>
          )}
        </div>

        {it.score != null && <ScoreBadge score={it.score} size="sm" />}
      </Link>
    </li>
  );
}

function Segment({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full px-3.5 text-xs font-semibold outline-none transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
        active ? "bg-white/12 text-white ring-1 ring-inset ring-white/15" : "text-white/55 hover:text-white/85",
      )}
    >
      {icon}
      {children}
    </button>
  );
}
