import Image from "next/image";
import { Heart, Film, Calendar, Layers, Clock } from "lucide-react";
import type { MediaDetail } from "@/lib/anilist/types";
import { toTenScale, formatCount } from "@/lib/utils";
import { ScoreBadge } from "./score-badge";
import { MediaActions } from "./media-actions";
import { AiringCountdown } from "./airing-countdown";
import { GenreTag } from "./genre-tag";

/**
 * Detail-page hero: banner wash, poster, title, and the primary library CTA.
 *
 * The poster lifts out of the banner to anchor the composition, the title owns
 * the top of the hierarchy, and the community score / next episode sit in a
 * quiet stat strip beneath it — visible at a glance but never competing with
 * the title or the "Add to Library" action, which is the one thing we want a
 * visitor to reach for.
 */
export function DetailHero({ media }: { media: MediaDetail }) {
  const title = media.title.english || media.title.romaji || media.title.native || "";
  const banner = media.bannerImage || media.coverImage.extraLarge || "";
  const cover = media.coverImage.extraLarge || media.coverImage.large || "";
  const score = toTenScale(media.averageScore);
  const airing = media.nextAiringEpisode;
  const unitCount = media.episodes
    ? `${media.episodes} ep`
    : media.chapters
      ? `${media.chapters} ch`
      : null;

  return (
    <header className="relative">
      {/* banner wash */}
      <div className="absolute inset-x-0 top-0 h-[46vh] min-h-[340px] overflow-hidden md:h-[54vh]">
        {banner && (
          <Image
            src={banner}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ backgroundColor: media.coverImage.color || "#0c1122" }}
          />
        )}
        {/* fade the art into the page so the text below always stays legible */}
        <div className="absolute inset-0 bg-gradient-to-b from-abyss-950/40 via-abyss-950/70 to-abyss-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-abyss-950/70 via-transparent to-abyss-950/40" />
      </div>

      <div className="container relative pt-[26vh] md:pt-[32vh]">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
          {/* poster */}
          <div className="w-36 shrink-0 sm:w-48 md:w-56 lg:w-60">
            <div className="glass glass-sheen overflow-hidden rounded-2xl p-1.5">
              <div className="relative aspect-[2/3] overflow-hidden rounded-xl">
                {cover ? (
                  <Image
                    src={cover}
                    alt={title}
                    fill
                    priority
                    sizes="(max-width: 640px) 128px, 208px"
                    className="object-cover"
                    style={{ backgroundColor: media.coverImage.color || "#0c1122" }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-abyss-700 text-white/20">
                    <Film className="h-8 w-8" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* title block */}
          <div className="min-w-0 flex-1 pb-1">
            <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
              {media.format && <MetaPill icon={<Film className="h-3 w-3" />}>{media.format.replace(/_/g, " ")}</MetaPill>}
              {media.status && <MetaPill>{media.status.replace(/_/g, " ")}</MetaPill>}
              {media.seasonYear && (
                <MetaPill icon={<Calendar className="h-3 w-3" />}>
                  {media.season ? `${media.season.charAt(0)}${media.season.slice(1).toLowerCase()} ` : ""}
                  {media.seasonYear}
                </MetaPill>
              )}
              {unitCount && <MetaPill icon={<Layers className="h-3 w-3" />}>{unitCount}</MetaPill>}
            </div>

            <h1 className="font-display text-4xl font-bold leading-[1.02] tracking-tight text-white drop-shadow-lg [overflow-wrap:anywhere] sm:text-6xl md:text-7xl">
              {title}
            </h1>
            {media.title.native && media.title.native !== title && (
              <p className="mt-2 text-sm text-white/45 [overflow-wrap:anywhere]">{media.title.native}</p>
            )}

            {/* color-coded genres — the shared genre-tag system, up front */}
            {media.genres.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
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

            {/* stat strip — score, popularity, next episode */}
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              {score != null && (
                <span
                  className="inline-flex items-center gap-1.5"
                  title={`Community score: ${score.toFixed(1)} out of 10`}
                >
                  <ScoreBadge score={score} size="md" />
                  <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">avg</span>
                </span>
              )}
              {media.favourites != null && media.favourites > 0 && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 ring-1 ring-inset ring-white/10 backdrop-blur-md">
                  <Heart className="h-3.5 w-3.5 text-[#ff5b8f]" />
                  <span className="tabular-nums">{formatCount(media.favourites)}</span>
                </span>
              )}
              {media.duration != null && media.type === "ANIME" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs font-medium text-white/60 ring-1 ring-inset ring-white/10 backdrop-blur-md">
                  <Clock className="h-3.5 w-3.5" />
                  {media.duration}m
                </span>
              )}
              {airing && <AiringCountdown airingAt={airing.airingAt} episode={airing.episode} />}
            </div>

            {/* primary action — the most reachable control in the hero */}
            <div className="mt-6">
              <MediaActions media={media} />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

function MetaPill({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium capitalize text-white/80 ring-1 ring-inset ring-white/12 backdrop-blur-md">
      {icon}
      {typeof children === "string" ? children.toLowerCase() : children}
    </span>
  );
}
