import Image from "next/image";
import { Heart, Film, Clock, Trophy, Flame } from "lucide-react";
import type { MediaDetail, MediaRanking } from "@/lib/anilist/types";
import { toTenScale, formatCount } from "@/lib/utils";
import { CommunityScore } from "./community-score";
import { AiringCountdown } from "./airing-countdown";
import { GenreTag } from "./genre-tag";

/** Pick the most interesting community rankings to surface (all-time first). */
function pickRankings(rankings: MediaRanking[] | undefined): MediaRanking[] {
  if (!rankings?.length) return [];
  const score = (r: MediaRanking) => (r.allTime ? 0 : 1) + r.rank / 1000;
  return [...rankings].sort((a, b) => score(a) - score(b)).slice(0, 3);
}

/**
 * Detail-page hero — "immersive theater".
 *
 * A tall, full-bleed backdrop carries the whole viewport; the poster floats out
 * of the top of a centered glass "marquee" card that holds the title, the
 * community level-meter, genres and community rankings. Everything is centered
 * and cinematic — a deliberate break from the old banner + side-poster layout.
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

  const hasStats =
    (media.favourites ?? 0) > 0 ||
    (media.duration != null && media.type === "ANIME") ||
    !!airing;

  return (
    <header className="relative isolate">
      {/* full-bleed cinematic backdrop */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[68vh] min-h-[520px] overflow-hidden">
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
        {/* legibility: darken, fade to page, tint with the cover accent */}
        <div className="absolute inset-0 bg-gradient-to-b from-abyss-950/35 via-abyss-950/72 to-abyss-950" />
        <div
          className="absolute inset-0 opacity-40 mix-blend-soft-light"
          style={{ background: `radial-gradient(120% 80% at 50% 0%, ${accent}, transparent 60%)` }}
        />
      </div>

      <div className="container relative pt-[24vh] sm:pt-[27vh]">
        <div className="relative mx-auto max-w-2xl">
          {/* poster floats out of the top edge of the marquee card */}
          <div className="absolute left-1/2 top-0 z-10 w-32 -translate-x-1/2 -translate-y-[45%] sm:w-40">
            <div className="relative aspect-[2/3] overflow-hidden rounded-2xl shadow-[0_30px_60px_-20px_rgba(0,0,0,0.95)] ring-1 ring-white/20">
              {cover ? (
                <Image
                  src={cover}
                  alt={title}
                  fill
                  priority
                  sizes="(max-width: 640px) 128px, 160px"
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

          {/* the marquee card */}
          <div className="glass glass-sheen rounded-4xl px-5 pb-6 pt-24 text-center sm:px-8 sm:pb-8 sm:pt-28">
            {metaBits.length > 0 && (
              <p className="mb-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
                {metaBits.map((bit, i) => (
                  <span key={bit} className="flex items-center gap-2 capitalize">
                    {i > 0 && <span aria-hidden className="text-white/20">•</span>}
                    {bit}
                  </span>
                ))}
              </p>
            )}

            <h1 className="font-display text-3xl font-extrabold leading-[0.98] tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.5)] [overflow-wrap:anywhere] sm:text-5xl">
              {title}
            </h1>
            {media.title.native && media.title.native !== title && (
              <p className="mt-2 text-sm text-white/45 [overflow-wrap:anywhere]">{media.title.native}</p>
            )}

            {media.genres.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
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

            {/* the community level-meter */}
            {score != null && (
              <div className="mx-auto mt-6 max-w-md rounded-3xl bg-abyss-950/40 px-4 py-4 ring-1 ring-inset ring-white/[0.07] sm:px-6">
                <CommunityScore score={score} votes={media.popularity} size="lg" align="center" />
              </div>
            )}

            {/* rank pills */}
            {ranks.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
                {ranks.map((r) => (
                  <RankPill key={`${r.type}-${r.context}`} ranking={r} />
                ))}
              </div>
            )}

            {/* quick stats */}
            {hasStats && (
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                {media.favourites != null && media.favourites > 0 && (
                  <Stat icon={<Heart className="h-3.5 w-3.5 text-[#ff5b8f]" />}>{formatCount(media.favourites)}</Stat>
                )}
                {media.duration != null && media.type === "ANIME" && (
                  <Stat icon={<Clock className="h-3.5 w-3.5 text-white/50" />}>{media.duration}m</Stat>
                )}
                {airing && <AiringCountdown airingAt={airing.airingAt} episode={airing.episode} />}
              </div>
            )}
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
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-semibold text-white/80 ring-1 ring-inset ring-white/12 backdrop-blur-md">
      {icon}
      <span className="tabular-nums">{children}</span>
    </span>
  );
}
