"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Trophy, BarChart3, Swords, Sigma, Sparkles, Scale } from "lucide-react";
import { useWaku, useEntriesList, type LibraryEntry } from "@/lib/store";
import { useMounted } from "@/lib/use-mounted";
import { tierForScore, isPerfect, GOLD } from "@/lib/rating";
import { median, criticBias } from "@/lib/ranking-stats";
import { formatScore, cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { TopThree } from "@/components/rankings/podium";
import { RankStatsDialog } from "@/components/rankings/rank-stats-dialog";

type Filter = "ALL" | "ANIME" | "MANGA" | "NOVEL";
const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ANIME", label: "Anime" },
  { value: "MANGA", label: "Manga" },
  { value: "NOVEL", label: "Novels" },
];
const TOP_OPTIONS = [10, 25, 50, 100];
const ELITE = 10;

type Category = "ANIME" | "MANGA" | "NOVEL";
const CATEGORY_LABEL: Record<Category, string> = { ANIME: "Anime", MANGA: "Manga", NOVEL: "Light Novels" };

function categoryOf(e: LibraryEntry): Category {
  if (e.media.format === "NOVEL") return "NOVEL";
  return e.media.type === "ANIME" ? "ANIME" : "MANGA";
}

const matchesFilter = (e: LibraryEntry, f: Filter) => f === "ALL" || categoryOf(e) === f;

export default function RankingsPage() {
  const mounted = useMounted();
  const entries = useEntriesList();
  const comparisons = useWaku((s) => s.comparisons);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [top, setTop] = useState(25);
  const [statsFor, setStatsFor] = useState<LibraryEntry | null>(null);

  const allRated = useMemo(
    () =>
      entries
        .filter((e) => e.score != null)
        .sort(
          (a, b) =>
            (b.score ?? 0) - (a.score ?? 0) ||
            (a.media.title || "").localeCompare(b.media.title || ""),
        ),
    [entries],
  );

  const ranked = useMemo(() => allRated.filter((e) => matchesFilter(e, filter)), [allRated, filter]);

  // Overall + per-category rank maps (from the full rated set, filter-independent).
  const rankMaps = useMemo(() => {
    const overall: Record<number, number> = {};
    const category: Record<number, number> = {};
    const catTotals: Record<Category, number> = { ANIME: 0, MANGA: 0, NOVEL: 0 };
    const catCounters: Record<Category, number> = { ANIME: 0, MANGA: 0, NOVEL: 0 };
    allRated.forEach((e, i) => {
      overall[e.media.id] = i + 1;
      const c = categoryOf(e);
      category[e.media.id] = ++catCounters[c];
      catTotals[c]++;
    });
    return { overall, category, catTotals };
  }, [allRated]);

  const insights = useMemo(() => {
    const scores = ranked.map((e) => e.score ?? 0);
    return {
      battles: comparisons.length,
      med: median(scores),
      perfect: ranked.filter((e) => isPerfect(e.score)).length,
      bias: criticBias(ranked),
    };
  }, [ranked, comparisons.length]);

  if (!mounted) return <Shell />;

  const shown = ranked.slice(0, top);
  const podium = shown.slice(0, 3);
  const elite = shown.slice(3, ELITE);
  const rest = shown.slice(ELITE);
  const avg = ranked.length > 0 ? ranked.reduce((s, e) => s + (e.score ?? 0), 0) / ranked.length : 0;
  const topScore = shown[0]?.score ?? 10;

  return (
    <div className="container max-w-4xl pb-16 pt-20 md:pt-24">
      <PageHeader
        icon={<Trophy className="h-5 w-5" />}
        title="Rankings"
        meta={ranked.length > 0 ? `${ranked.length} rated · avg ${formatScore(avg)}` : undefined}
      />

      {ranked.length === 0 ? (
        <EmptyState rated={allRated.length > 0} onReset={() => setFilter("ALL")} />
      ) : (
        <>
          {/* insights ribbon — signature numbers that live only here */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Insight
              icon={<Swords className="h-3.5 w-3.5" />}
              label="Battles"
              value={insights.battles.toLocaleString()}
              hint="matchups judged"
              accent="#9a83ff"
            />
            <Insight
              icon={<Sigma className="h-3.5 w-3.5" />}
              label="Median"
              value={formatScore(insights.med)}
              hint="middle score"
              accent="#6ea8ff"
            />
            <Insight
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="Perfect 10s"
              value={insights.perfect.toString()}
              hint="flawless picks"
              accent={GOLD}
            />
            <Insight
              icon={<Scale className="h-3.5 w-3.5" />}
              label={insights.bias?.label ?? "vs Crowd"}
              value={insights.bias ? `${insights.bias.mean >= 0 ? "+" : ""}${insights.bias.mean.toFixed(1)}` : "—"}
              hint="vs community"
              accent={insights.bias ? (insights.bias.mean >= 0 ? "#6ee7a8" : "#f6a8b1") : "#8fb4ff"}
            />
          </div>

          {/* controls */}
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-inset ring-white/10">
              {FILTERS.map((f) => (
                <Seg key={f.value} active={filter === f.value} onClick={() => setFilter(f.value)}>
                  {f.label}
                </Seg>
              ))}
            </div>
            <div className="flex items-center gap-1 rounded-full bg-white/[0.04] p-1 ring-1 ring-inset ring-white/10">
              {TOP_OPTIONS.map((n) => (
                <Seg key={n} active={top === n} onClick={() => setTop(n)} dim>
                  {n}
                </Seg>
              ))}
            </div>
          </div>

          {podium.length > 0 && (
            <section className="mb-5">
              <TopThree entries={podium} comparisons={comparisons} onStats={setStatsFor} />
            </section>
          )}

          {elite.length > 0 && (
            <section className="mb-5">
              <BandLabel>Top 10</BandLabel>
              <ol className="space-y-1.5">
                {elite.map((e) => (
                  <RankRow
                    key={e.media.id}
                    entry={e}
                    rank={shown.indexOf(e) + 1}
                    topScore={topScore}
                    elite
                    onStats={() => setStatsFor(e)}
                  />
                ))}
              </ol>
            </section>
          )}

          {rest.length > 0 && (
            <section>
              <BandLabel>{ELITE + 1}–{shown.length}</BandLabel>
              <ol className="space-y-1">
                {rest.map((e) => (
                  <RankRow
                    key={e.media.id}
                    entry={e}
                    rank={shown.indexOf(e) + 1}
                    topScore={topScore}
                    onStats={() => setStatsFor(e)}
                  />
                ))}
              </ol>
            </section>
          )}

          {ranked.length > shown.length && (
            <p className="mt-5 text-center text-xs text-white/35">
              Showing top {shown.length} of {ranked.length} rated titles
            </p>
          )}
        </>
      )}

      {statsFor && (
        <RankStatsDialog
          open={!!statsFor}
          onClose={() => setStatsFor(null)}
          entry={statsFor}
          rank={rankMaps.overall[statsFor.media.id] ?? 0}
          total={allRated.length}
          categoryRank={rankMaps.category[statsFor.media.id] ?? 0}
          categoryTotal={rankMaps.catTotals[categoryOf(statsFor)]}
          categoryLabel={CATEGORY_LABEL[categoryOf(statsFor)]}
        />
      )}
    </div>
  );
}

function Insight({
  icon, label, value, hint, accent,
}: {
  icon: React.ReactNode; label: string; value: string; hint: string; accent: string;
}) {
  return (
    <div className="glass relative overflow-hidden rounded-2xl p-3">
      <div
        className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 rounded-full opacity-30 blur-2xl"
        style={{ background: accent }}
        aria-hidden
      />
      <div className="relative">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
          <span style={{ color: accent }}>{icon}</span>
          {label}
        </span>
        <p className="mt-1 font-display text-2xl font-black tabular-nums leading-none text-white">{value}</p>
        <p className="mt-1 text-[10px] text-white/35">{hint}</p>
      </div>
    </div>
  );
}

function BandLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{children}</h2>
      <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
    </div>
  );
}

/**
 * A ranked row. `elite` (4–10) rows get artwork, a relative score bar and a
 * heavier numeral; below that, rows tighten so a Top 100 stays scannable.
 * The rank numeral is the design motif — no medals, no badges.
 */
function RankRow({
  entry, rank, topScore, elite = false, onStats,
}: {
  entry: LibraryEntry;
  rank: number;
  topScore: number;
  elite?: boolean;
  onStats: () => void;
}) {
  const tier = tierForScore(entry.score);
  const perfect = isPerfect(entry.score);
  const accent = perfect ? GOLD : tier.color;
  const barPct = topScore > 0 ? ((entry.score ?? 0) / topScore) * 100 : 0;

  return (
    <li
      className={cn(
        "group glass relative flex items-center gap-2.5 rounded-2xl transition-colors hover:bg-white/[0.06] sm:gap-3",
        elite ? "p-2" : "px-2.5 py-1.5",
      )}
    >
      <span
        className={cn(
          "shrink-0 text-center font-display font-black tabular-nums",
          elite ? "w-8 text-xl" : "w-7 text-sm text-white/35",
        )}
        style={elite ? { color: "#fff" } : undefined}
      >
        {rank}
      </span>

      <Link
        href={`/media/${entry.media.id}`}
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-waku-400"
      >
        {elite && (
          <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-lg bg-abyss-700 ring-1 ring-white/10">
            {entry.media.cover && (
              <Image
                src={entry.media.cover}
                alt=""
                fill
                sizes="36px"
                className="object-cover"
                style={{ backgroundColor: entry.media.color || "#0c1122" }}
              />
            )}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white group-hover:text-waku-cinematic">
            {entry.media.title}
          </p>
          <p className="flex items-center gap-1.5 text-[11px] text-white/40">
            {entry.media.format && <span>{entry.media.format.replace(/_/g, " ")}</span>}
            {entry.media.seasonYear && <span>· {entry.media.seasonYear}</span>}
          </p>
        </div>
      </Link>

      {/* relative score bar — desktop only, honest about distance from #1 */}
      <div className="hidden h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-white/10 lg:block">
        <div className="h-full rounded-full" style={{ width: `${barPct}%`, background: accent }} />
      </div>

      <span
        className={cn("shrink-0 text-right font-black tabular-nums", elite ? "w-11 text-lg" : "w-9 text-sm")}
        style={{ color: accent }}
      >
        {formatScore(entry.score)}
      </span>

      <button
        type="button"
        onClick={onStats}
        aria-label={`Ranking stats for ${entry.media.title}`}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/40 outline-none transition-all hover:bg-white/10 hover:text-white focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-waku-400 md:opacity-0 md:group-hover:opacity-100"
      >
        <BarChart3 className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

function Seg({
  active, onClick, dim, children,
}: {
  active: boolean; onClick: () => void; dim?: boolean; children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-semibold outline-none transition-all focus-visible:ring-2 focus-visible:ring-waku-400",
        active
          ? dim
            ? "bg-white/15 text-white"
            : "bg-gradient-to-b from-iris-400 to-iris-600 text-white shadow-glow-iris"
          : "text-white/55 hover:text-white/85",
      )}
    >
      {children}
    </button>
  );
}

function EmptyState({ rated, onReset }: { rated: boolean; onReset: () => void }) {
  return (
    <div className="glass glass-sheen mx-auto mt-8 flex max-w-md flex-col items-center gap-3 rounded-4xl p-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-iris-500/15 text-iris-300">
        <Trophy className="h-6 w-6" />
      </span>
      <h2 className="font-display text-xl font-semibold text-white">
        {rated ? "Nothing here yet" : "Rate a few titles"}
      </h2>
      <p className="text-sm text-white/55">
        {rated
          ? "No rated titles match this filter. Try a different category."
          : "Your rankings build themselves as you rate. Score a couple of titles to get started."}
      </p>
      {rated ? (
        <Button variant="glass" size="md" onClick={onReset}>Back to all</Button>
      ) : (
        <Link href="/library">
          <Button variant="accent" size="md">Go to your library</Button>
        </Link>
      )}
    </div>
  );
}

function Shell() {
  return (
    <div className="container max-w-4xl pt-20 md:pt-24">
      <div className="skeleton h-10 w-48 rounded-full" />
      <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-20 rounded-2xl" />
        ))}
      </div>
      <div className="mt-5 skeleton h-40 rounded-3xl" />
      <div className="mt-5 space-y-1.5">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
