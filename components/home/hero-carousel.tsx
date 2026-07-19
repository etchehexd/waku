"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Plus, Info, Star, Heart, Layers, Calendar, TrendingUp } from "lucide-react";
import type { MediaSummary } from "@/lib/anilist/types";
import { toTenScale, stripHtml, formatCount, cn } from "@/lib/utils";
import { ScoreBadge } from "@/components/media/score-badge";
import { GenreTag } from "@/components/media/genre-tag";
import { Button } from "@/components/ui/button";

interface HeroCarouselProps {
  items: (MediaSummary & { description?: string | null })[];
  interval?: number;
}

const MAX_CHIPS = 3;

/**
 * Featured hero.
 *
 * Image strategy — the fix for the "blurry hero poster":
 * the primary artwork is now a CRISP foreground poster card rendered at its
 * actual display width (so the optimizer never upscales the source), while
 * the full-bleed backdrop is a separate, *intentionally* blurred layer.
 */
export function HeroCarousel({ items, interval = 7000 }: HeroCarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const count = items.length;

  const go = useCallback(
    (dir: number) => setIndex((i) => (i + dir + count) % count),
    [count],
  );

  useEffect(() => {
    if (paused || count <= 1 || reduce) return;
    const t = setInterval(() => go(1), interval);
    return () => clearInterval(t);
  }, [paused, count, go, interval, reduce]);

  if (!count) return null;
  const active = items[index];
  const title =
    active.title.english || active.title.romaji || active.title.native || "";
  const banner = active.bannerImage || "";
  const cover = active.coverImage.extraLarge || active.coverImage.large || "";
  const score = toTenScale(active.averageScore);
  const description = stripHtml(active.description);
  const accent = active.coverImage.color || "#3667ff";

  const genres = active.genres ?? [];
  const shownGenres = genres.slice(0, MAX_CHIPS);
  const overflow = genres.length - shownGenres.length;
  const units = active.episodes
    ? `${active.episodes} ep`
    : active.chapters
      ? `${active.chapters} ch`
      : null;
  const seasonLabel = active.seasonYear
    ? `${active.season ? `${active.season.charAt(0)}${active.season.slice(1).toLowerCase()} ` : ""}${active.seasonYear}`
    : null;

  return (
    <section
      className="relative isolate w-full overflow-hidden"
      aria-roledescription="carousel"
      aria-label="Featured titles"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Backdrop layer — banner art when available; otherwise the cover as a
          deliberate ambient wash (heavily blurred + dimmed). */}
      <div className="absolute inset-0 -z-10">
        <AnimatePresence mode="sync">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, scale: reduce ? 1 : 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.2 : 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            {banner ? (
              <Image
                src={banner}
                alt=""
                fill
                priority
                sizes="100vw"
                className="object-cover object-center"
              />
            ) : cover ? (
              <Image
                src={cover}
                alt=""
                fill
                priority
                sizes="60vw"
                className="scale-110 object-cover object-[center_20%] blur-2xl brightness-[0.55] saturate-150"
                aria-hidden
              />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background: `radial-gradient(120% 120% at 18% 0%, ${accent}55, transparent 55%), linear-gradient(to bottom, #0c1122, #05070f)`,
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* cinematic scrims + a living accent tint pulled from the artwork */}
        <div className="absolute inset-0 bg-gradient-to-t from-abyss-950 via-abyss-950/75 to-abyss-950/25" />
        <div className="absolute inset-0 bg-gradient-to-r from-abyss-950 via-abyss-950/45 to-transparent" />
        <div
          className="absolute inset-0 opacity-50 transition-[background] duration-700"
          style={{ background: `radial-gradient(70% 90% at 82% 60%, ${accent}2e, transparent 65%)` }}
          aria-hidden
        />
      </div>

      <div
        className="container relative z-10 flex flex-col justify-end gap-5 pb-10 pt-24 sm:pb-12 sm:pt-28"
        style={{ minHeight: "clamp(28rem, 66svh, 44rem)" }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={active.id}
            initial={{ opacity: 0, y: reduce ? 0 : 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -10 }}
            transition={{ duration: reduce ? 0.2 : 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-end justify-between gap-8"
          >
            <div className="max-w-2xl min-w-0">
              {/* eyebrow: Featured + color-coded genre tags */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-iris-500/30 to-waku-500/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-waku-50 ring-1 ring-inset ring-iris-300/40">
                  <Star className="h-3 w-3 fill-current" /> Featured
                </span>
                {shownGenres.map((g) => (
                  <GenreTag
                    key={g}
                    genre={g}
                    size="md"
                    href={`/discover?type=${active.type}&genre=${encodeURIComponent(g)}`}
                  />
                ))}
                {overflow > 0 && (
                  <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs font-medium text-white/60 ring-1 ring-inset ring-white/10">
                    +{overflow}
                  </span>
                )}
              </div>

              <h1
                className="font-display font-bold leading-[1.06] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.5)]"
                style={{ fontSize: "clamp(2rem, 1.2rem + 3.2vw, 3.5rem)" }}
              >
                {title}
              </h1>

              {/* stat strip — score, popularity, units, season */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {score != null && (
                  <span
                    className="inline-flex shrink-0 items-center gap-1.5"
                    title={`Community score ${score.toFixed(1)} / 10`}
                  >
                    <ScoreBadge score={score} size="sm" />
                    <span className="text-[11px] font-medium text-white/45">avg</span>
                  </span>
                )}
                {active.favourites != null && active.favourites > 0 && (
                  <HeroStat icon={<Heart className="h-3.5 w-3.5 text-[#ff5b8f]" />}>
                    {formatCount(active.favourites)}
                  </HeroStat>
                )}
                {active.popularity != null && active.popularity > 0 && (
                  <HeroStat icon={<TrendingUp className="h-3.5 w-3.5 text-waku-cinematic" />}>
                    {formatCount(active.popularity)}
                  </HeroStat>
                )}
                {units && <HeroStat icon={<Layers className="h-3.5 w-3.5" />}>{units}</HeroStat>}
                {seasonLabel && <HeroStat icon={<Calendar className="h-3.5 w-3.5" />}>{seasonLabel}</HeroStat>}
              </div>

              {description && (
                <p className="mt-4 line-clamp-2 max-w-xl text-sm leading-relaxed text-white/75 sm:line-clamp-3 md:text-base">
                  {description}
                </p>
              )}

              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Link href={`/media/${active.id}`}>
                  <Button variant="accent" size="lg">
                    <Plus className="h-4 w-4" /> Add to list
                  </Button>
                </Link>
                <Link href={`/media/${active.id}`}>
                  <Button variant="glass" size="lg">
                    <Info className="h-4 w-4" /> Details
                  </Button>
                </Link>
              </div>
            </div>

            {/* Crisp foreground poster — rendered at its true display width. */}
            {cover && (
              <Link
                href={`/media/${active.id}`}
                className="group relative hidden w-44 shrink-0 rotate-1 outline-none transition-transform duration-300 hover:rotate-0 focus-visible:ring-2 focus-visible:ring-waku-300 sm:block md:w-52 lg:w-60 motion-reduce:rotate-0 motion-reduce:transition-none"
                aria-label={`Open ${title}`}
              >
                <div
                  className="pointer-events-none absolute -inset-4 rounded-[2rem] opacity-60 blur-2xl transition-opacity group-hover:opacity-90"
                  style={{ background: `${accent}45` }}
                  aria-hidden
                />
                <div className="glass relative overflow-hidden rounded-2xl p-1.5">
                  <div className="relative aspect-[2/3] overflow-hidden rounded-xl">
                    <Image
                      src={cover}
                      alt={title}
                      fill
                      priority
                      quality={90}
                      sizes="(max-width: 768px) 176px, (max-width: 1024px) 208px, 240px"
                      className="object-cover"
                      style={{ backgroundColor: accent }}
                    />
                  </div>
                </div>
              </Link>
            )}
          </motion.div>
        </AnimatePresence>

        {/* progress dots */}
        {count > 1 && (
          <div className="flex items-center gap-2" role="tablist" aria-label="Choose featured title">
            {items.map((it, i) => (
              <button
                key={it.id}
                onClick={() => setIndex(i)}
                role="tab"
                aria-selected={i === index}
                aria-label={`Featured title ${i + 1} of ${count}`}
                className={cn(
                  "h-1.5 rounded-full outline-none transition-all duration-500 focus-visible:ring-2 focus-visible:ring-waku-300 focus-visible:ring-offset-2 focus-visible:ring-offset-abyss-950 motion-reduce:transition-none",
                  i === index
                    ? "w-8 bg-gradient-to-r from-iris-400 to-waku-cinematic"
                    : "w-2 bg-white/25 hover:bg-white/45",
                )}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function HeroStat({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-white/65 ring-1 ring-inset ring-white/10 backdrop-blur-md">
      {icon}
      <span className="tabular-nums">{children}</span>
    </span>
  );
}
