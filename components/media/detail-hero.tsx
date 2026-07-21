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
  return [...rankings].sort((a, b) => score(a) - score(b)).slice(0, 2);
}

/**
 * Detail-page hero — compact "marquee".
 *
 * A modest cinematic backdrop, then a single glass card that overlaps its lower
 * edge: the poster lifts out of the card's top-left corner while the title,
 * community level-meter, genres and rankings sit to its right, left-aligned.
 * Poster and text never overlap, and the whole header stays short.
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
      {/* modest cinematic backdrop */}
      <div className="absolute inset-x-0 top-0 -z-10 h-[38vh] min-h-[280px] overflow-hidden sm:h-[42vh]">
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
        <div className="absolute inset-0 bg-gradient-to-b from-abyss-950/35 via-abyss-950/72 to-abyss-950" />
        <div
          className="absolute inset-0 opacity-40 mix-blend-soft-light"
          style={{ background: `radial-gradient(120% 80% at 50% 0%, ${accent}, transparent 60%)` }}
        />
      </div>

      <div className="container relative pt-[19vh] sm:pt-[22vh]">
        <div className="glass glass-sheen mx-auto max-w-3xl rounded-3xl p-4 sm:p-5">
          <div className="flex items-start gap-4 sm:gap-5">
            {/* poster lifts out of the top-left corner — clear of the text */}
            <div className="-mt-12 w-24 shrink-0 sm:-mt-16 sm:w-32">
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl shadow-[0_20px_44px_-18px_rgba(0,0,0,0.95)] ring-1 ring-white/20 sm:rounded-2xl">
                {cover ? (
                  <Image
                    src={cover}
                    alt={title}
                    fill
                    priority
                    sizes="(max-width: 640px) 96px, 128px"
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
            <div className="min-w-0 flex-1 pt-0.5">
              {metaBits.length > 0 && (
                <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45 sm:text-[11px]">
                  {metaBits.map((bit, i) => (
                    <span key={bit} className="flex items-center gap-2 capitalize">
                      {i > 0 && <span aria-hidden className="text-white/20">•</span>}
                      {bit}
                    </span>
                  ))}
                </p>
              )}

              <h1 className="mt-1 font-display text-2xl font-extrabold leading-[1.02] tracking-tight text-white [overflow-wrap:anywhere] sm:text-4xl">
                {title}
              </h1>

              {media.genres.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {media.genres.slice(0, 4).map((g) => (
                    <GenreTag
                      key={g}
                      genre={g}
                      size="sm"
                      href={`/discover?type=${media.type}&genre=${encodeURIComponent(g)}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* community level-meter — full width under the row */}
          {score != null && (
            <div className="mt-4 rounded-2xl bg-abyss-950/40 px-3.5 py-3 ring-1 ring-inset ring-white/[0.07] sm:px-4">
              <CommunityScore score={score} votes={media.popularity} size="md" align="left" />
            </div>
          )}

          {/* ranks + stats */}
          {(ranks.length > 0 || hasStats) && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              {ranks.map((r) => (
                <RankPill key={`${r.type}-${r.context}`} ranking={r} />
              ))}
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
