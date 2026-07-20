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
 * Detail-page hero — a dense, left-aligned cover layout.
 *
 * Poster on the left, everything else packed into the column beside it so the
 * width is used and vertical whitespace stays tight. `isolate` keeps the banner
 * wash behind the content and clear of the page background.
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
    <header className="relative isolate overflow-hidden">
      {/* atmospheric banner wash */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[34vh] min-h-[240px]">
        {banner && (
          <Image
            src={banner}
            alt=""
            fill
            priority
            sizes="100vw"
            className="scale-105 object-cover opacity-[0.16] blur-[2px]"
            style={{ backgroundColor: accent }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-abyss-950/80 via-abyss-950/95 to-abyss-950" />
      </div>

      <div className="container relative pt-24 md:pt-28">
        <div className="flex flex-col gap-6 sm:flex-row sm:gap-7">
          {/* poster */}
          <div className="w-32 shrink-0 sm:w-40 md:w-44">
            <div className="relative aspect-[2/3] overflow-hidden rounded-xl shadow-[0_20px_44px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/12">
              {cover ? (
                <Image
                  src={cover}
                  alt={title}
                  fill
                  priority
                  sizes="176px"
                  className="object-cover"
                  style={{ backgroundColor: accent }}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-abyss-700 text-white/20">
                  <Film className="h-7 w-7" />
                </div>
              )}
            </div>
          </div>

          {/* info column */}
          <div className="min-w-0 flex-1">
            <h1 className="text-balance font-display text-3xl font-extrabold leading-[0.98] tracking-tight text-white [overflow-wrap:anywhere] sm:text-5xl">
              {title}
            </h1>
            {media.title.native && media.title.native !== title && (
              <p className="mt-1.5 text-[13px] text-white/45 [overflow-wrap:anywhere]">{media.title.native}</p>
            )}

            {metaBits.length > 0 && (
              <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] font-medium capitalize text-white/55">
                {metaBits.map((bit, i) => (
                  <span key={bit} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden className="text-white/25">·</span>}
                    {bit}
                  </span>
                ))}
              </p>
            )}

            {/* score + community rankings + stats */}
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              {score != null && <ScoreBadge score={score} size="lg" />}
              {ranks.map((r) => (
                <RankPill key={`${r.type}-${r.context}`} ranking={r} />
              ))}
              {media.favourites != null && media.favourites > 0 && (
                <Stat icon={<Heart className="h-3 w-3 text-[#ff5b8f]" />}>{formatCount(media.favourites)}</Stat>
              )}
              {media.duration != null && media.type === "ANIME" && (
                <Stat icon={<Clock className="h-3 w-3 text-white/50" />}>{media.duration}m</Stat>
              )}
              {airing && <AiringCountdown airingAt={airing.airingAt} episode={airing.episode} />}
            </div>

            {media.genres.length > 0 && (
              <div className="mt-3.5 flex flex-wrap gap-1.5">
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

            <div className="mt-5">
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
  // AniList's context reads like "highest rated all time"; trim the "all time".
  const label = ranking.context.replace(/\ball time\b/i, "").trim() || ranking.context;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold capitalize"
      style={{ background: `${color}1f`, color, boxShadow: `inset 0 0 0 1px ${color}44` }}
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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] font-semibold text-white/70 ring-1 ring-inset ring-white/10">
      {icon}
      <span className="tabular-nums">{children}</span>
    </span>
  );
}
