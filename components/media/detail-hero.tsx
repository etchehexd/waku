import Image from "next/image";
import { Heart, Film, Clock, Trophy, Flame } from "lucide-react";
import type { MediaDetail, MediaRanking } from "@/lib/anilist/types";
import { toTenScale, formatCount } from "@/lib/utils";
import { ScoreBadge } from "./score-badge";
import { MediaActions } from "./media-actions";
import { AiringCountdown } from "./airing-countdown";
import { GenreTag } from "./genre-tag";

/** Pick the most interesting community rankings to surface (all-time first). */
function pickRankings(rankings: MediaRanking[] | undefined): MediaRanking[] {
  if (!rankings?.length) return [];
  const score = (r: MediaRanking) => (r.allTime ? 0 : 1) + r.rank / 1000;
  return [...rankings].sort((a, b) => score(a) - score(b)).slice(0, 3);
}

/**
 * Detail-page hero — big and cinematic.
 *
 * A tall banner fills the top and the poster + oversized title sit over its
 * lower third, so artwork carries the page. `isolate` gives the header its own
 * stacking context so the page background never bleeds over it.
 */
export function DetailHero({ media }: { media: MediaDetail }) {
  const title = media.title.english || media.title.romaji || media.title.native || "";
  const banner = media.bannerImage || media.coverImage.extraLarge || "";
  const cover = media.coverImage.extraLarge || media.coverImage.large || "";
  const score = toTenScale(media.averageScore);
  const airing = media.nextAiringEpisode;
  const accent = media.coverImage.color || "#5b8cff";
  const ranks = pickRankings(media.rankings);

  const unitCount = media.episodes
    ? `${media.episodes} eps`
    : media.chapters
      ? `${media.chapters} ch`
      : null;

  const metaBits = [
    media.format?.replace(/_/g, " "),
    media.seasonYear
      ? `${media.season ? media.season.charAt(0) + media.season.slice(1).toLowerCase() + " " : ""}${media.seasonYear}`
      : null,
    media.status?.replace(/_/g, " ").toLowerCase(),
    unitCount,
  ].filter(Boolean) as string[];

  return (
    <header className="relative isolate">
      {/* big cinematic banner */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[56vh] min-h-[400px] overflow-hidden">
        {banner ? (
          <Image
            src={banner}
            alt=""
            fill
            priority
            sizes="100vw"
            className="scale-105 object-cover"
            style={{ backgroundColor: accent }}
          />
        ) : (
          <div className="h-full w-full" style={{ backgroundColor: accent }} />
        )}
        {/* legibility gradients: darken, fade to page at the bottom, vignette sides */}
        <div className="absolute inset-0 bg-gradient-to-b from-abyss-950/45 via-abyss-950/70 to-abyss-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-abyss-950/70 via-transparent to-abyss-950/50" />
      </div>

      <div className="container relative pt-[30vh] sm:pt-[34vh]">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-7">
          {/* poster lifts over the banner */}
          <div className="w-36 shrink-0 sm:w-48 md:w-52">
            <div className="relative aspect-[2/3] overflow-hidden rounded-2xl shadow-[0_30px_60px_-24px_rgba(0,0,0,0.9)] ring-1 ring-white/15">
              {cover ? (
                <Image
                  src={cover}
                  alt={title}
                  fill
                  priority
                  sizes="(max-width: 640px) 144px, 208px"
                  className="object-cover"
                  style={{ backgroundColor: accent }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-abyss-700 text-white/20">
                  <Film className="h-8 w-8" />
                </div>
              )}
            </div>
          </div>

          {/* info */}
          <div className="min-w-0 flex-1 pb-1">
            {/* grade + rankings */}
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {score != null && <ScoreBadge score={score} size="lg" />}
              <div className="flex flex-wrap items-center gap-1.5">
                {ranks.map((r) => (
                  <RankPill key={`${r.type}-${r.context}`} ranking={r} />
                ))}
              </div>
            </div>

            <h1 className="font-display text-4xl font-extrabold leading-[0.95] tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)] [overflow-wrap:anywhere] sm:text-6xl md:text-7xl">
              {title}
            </h1>
            {media.title.native && media.title.native !== title && (
              <p className="mt-2 text-sm text-white/55 [overflow-wrap:anywhere]">{media.title.native}</p>
            )}

            {metaBits.length > 0 && (
              <p className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-medium capitalize text-white/65">
                {metaBits.map((bit, i) => (
                  <span key={bit} className="flex items-center gap-2.5">
                    {i > 0 && <span aria-hidden className="text-white/30">·</span>}
                    {bit}
                  </span>
                ))}
              </p>
            )}

            {media.genres.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {media.genres.slice(0, 5).map((g) => (
                  <GenreTag
                    key={g}
                    genre={g}
                    size="sm"
                    href={`/discover?type=${media.type}&genre=${encodeURIComponent(g)}`}
                  />
                ))}
              </div>
            )}

            {(((media.favourites ?? 0) > 0) ||
              (media.duration != null && media.type === "ANIME") ||
              airing) && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {media.favourites != null && media.favourites > 0 && (
                  <Stat icon={<Heart className="h-3.5 w-3.5 text-[#ff5b8f]" />}>{formatCount(media.favourites)}</Stat>
                )}
                {media.duration != null && media.type === "ANIME" && (
                  <Stat icon={<Clock className="h-3.5 w-3.5 text-white/50" />}>{media.duration}m</Stat>
                )}
                {airing && <AiringCountdown airingAt={airing.airingAt} episode={airing.episode} />}
              </div>
            )}

            <div className="mt-6">
              <MediaActions media={media} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

/** "#54 highest rated" style community ranking chip. */
function RankPill({ ranking }: { ranking: MediaRanking }) {
  const rated = ranking.type === "RATED";
  const Icon = rated ? Trophy : Flame;
  const color = rated ? "#f7c63a" : "#ff5b8f";
  const label = ranking.context.replace(/\ball time\b/i, "").trim() || ranking.context;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize backdrop-blur-md"
      style={{ background: `${color}22`, color, boxShadow: `inset 0 0 0 1px ${color}55` }}
      title={`#${ranking.rank} ${ranking.context}`}
    >
      <Icon className="h-3 w-3" />
      <span className="tabular-nums">#{ranking.rank}</span>
      <span className="font-semibold opacity-80">{label}</span>
    </span>
  );
}

function Stat({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-2.5 py-1 text-[11px] font-semibold text-white/80 ring-1 ring-inset ring-white/12 backdrop-blur-md">
      {icon}
      <span className="tabular-nums">{children}</span>
    </span>
  );
}
