import Image from "next/image";
import { Heart, Film, Clock } from "lucide-react";
import type { MediaDetail } from "@/lib/anilist/types";
import { toTenScale, formatCount, formatScore } from "@/lib/utils";
import { tierForScore } from "@/lib/rating";
import { MediaActions } from "./media-actions";
import { AiringCountdown } from "./airing-countdown";
import { GenreTag } from "./genre-tag";

/**
 * Detail-page hero — a centered magazine cover story.
 *
 * A single centered column: the poster, then the community score as a big
 * editorial numeral, the title as the headline, and one quiet metadata line.
 * No sidebar, no boxed facts — the artwork and typography carry it, with an
 * atmospheric wash of the banner bleeding softly behind the top.
 */
export function DetailHero({ media }: { media: MediaDetail }) {
  const title = media.title.english || media.title.romaji || media.title.native || "";
  const banner = media.bannerImage || media.coverImage.extraLarge || "";
  const cover = media.coverImage.extraLarge || media.coverImage.large || "";
  const score = toTenScale(media.averageScore);
  const tier = tierForScore(score);
  const airing = media.nextAiringEpisode;
  const accent = media.coverImage.color || "#5b8cff";

  const unitCount = media.episodes
    ? `${media.episodes} episodes`
    : media.chapters
      ? `${media.chapters} chapters`
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
    <header className="relative overflow-hidden">
      {/* atmospheric banner wash — subtle, fades out fast */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[52vh] min-h-[360px]">
        {banner && (
          <Image
            src={banner}
            alt=""
            fill
            priority
            sizes="100vw"
            className="scale-110 object-cover opacity-25 blur-[2px]"
            style={{ backgroundColor: accent }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-abyss-950/70 via-abyss-950/90 to-abyss-950" />
      </div>

      <div className="container relative flex flex-col items-center pt-24 text-center md:pt-28">
        {/* poster */}
        <div className="w-36 sm:w-44">
          <div className="relative aspect-[2/3] overflow-hidden rounded-2xl shadow-[0_30px_60px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/12">
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
                <Film className="h-8 w-8" />
              </div>
            )}
          </div>
        </div>

        {/* score numeral */}
        {score != null && (
          <div className="mt-6 flex flex-col items-center">
            <span
              className="font-display text-6xl font-extrabold leading-none tracking-tight tabular-nums sm:text-7xl"
              style={{
                color: tier.text,
                textShadow: `0 2px 30px ${tier.color}55`,
              }}
            >
              {formatScore(score)}
            </span>
            <span
              className="mt-2 text-[11px] font-bold uppercase tracking-[0.22em]"
              style={{ color: tier.color }}
            >
              {tier.label} · Community
            </span>
          </div>
        )}

        {/* headline */}
        <h1 className="mt-4 max-w-3xl text-balance font-display text-4xl font-extrabold leading-[0.98] tracking-tight text-white [overflow-wrap:anywhere] sm:text-6xl">
          {title}
        </h1>
        {media.title.native && media.title.native !== title && (
          <p className="mt-2.5 text-sm text-white/45 [overflow-wrap:anywhere]">{media.title.native}</p>
        )}

        {/* metadata line */}
        {metaBits.length > 0 && (
          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[13px] font-medium capitalize text-white/55">
            {metaBits.map((bit, i) => (
              <span key={bit} className="flex items-center gap-2.5">
                {i > 0 && <span aria-hidden className="text-white/25">·</span>}
                {bit}
              </span>
            ))}
          </p>
        )}

        {/* genres */}
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

        {/* secondary stats */}
        {(((media.favourites ?? 0) > 0) ||
          (media.duration != null && media.type === "ANIME") ||
          airing) && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {media.favourites != null && media.favourites > 0 && (
              <Stat icon={<Heart className="h-3.5 w-3.5 text-[#ff5b8f]" />}>{formatCount(media.favourites)}</Stat>
            )}
            {media.duration != null && media.type === "ANIME" && (
              <Stat icon={<Clock className="h-3.5 w-3.5 text-white/50" />}>{media.duration}m / ep</Stat>
            )}
            {airing && <AiringCountdown airingAt={airing.airingAt} episode={airing.episode} />}
          </div>
        )}

        {/* primary action */}
        <div className="mt-7 flex w-full justify-center">
          <MediaActions media={media} />
        </div>
      </div>
    </header>
  );
}

function Stat({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/70 ring-1 ring-inset ring-white/10">
      {icon}
      <span className="tabular-nums">{children}</span>
    </span>
  );
}
