import Image from "next/image";
import { Heart, Film, Clock } from "lucide-react";
import type { MediaDetail } from "@/lib/anilist/types";
import { toTenScale, formatCount, formatScore } from "@/lib/utils";
import { tierForScore } from "@/lib/rating";
import { MediaActions } from "./media-actions";
import { AiringCountdown } from "./airing-countdown";
import { GenreTag } from "./genre-tag";

/**
 * Detail-page hero — a compact, centered magazine cover story.
 *
 * `isolate` gives the header its own stacking context so the atmospheric banner
 * wash sits cleanly behind the content and the page's fixed background can never
 * bleed over it. Sized small so the poster, score, title and CTA all fit in the
 * first screen.
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
      {/* atmospheric banner wash — subtle, fades out fast */}
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[38vh] min-h-[280px]">
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

      <div className="container relative flex flex-col items-center pt-24 text-center md:pt-28">
        {/* poster */}
        <div className="w-28 sm:w-32">
          <div className="relative aspect-[2/3] overflow-hidden rounded-xl shadow-[0_20px_44px_-20px_rgba(0,0,0,0.8)] ring-1 ring-white/12">
            {cover ? (
              <Image
                src={cover}
                alt={title}
                fill
                priority
                sizes="128px"
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

        {/* score numeral — number only */}
        {score != null && (
          <span
            className="mt-4 font-display text-5xl font-extrabold leading-none tracking-tight tabular-nums"
            style={{ color: tier.text, textShadow: `0 2px 24px ${tier.color}44` }}
          >
            {formatScore(score)}
          </span>
        )}

        {/* headline */}
        <h1 className="mt-3 max-w-2xl text-balance font-display text-3xl font-extrabold leading-[0.98] tracking-tight text-white [overflow-wrap:anywhere] sm:text-5xl">
          {title}
        </h1>
        {media.title.native && media.title.native !== title && (
          <p className="mt-1.5 text-[13px] text-white/45 [overflow-wrap:anywhere]">{media.title.native}</p>
        )}

        {/* metadata line */}
        {metaBits.length > 0 && (
          <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[12px] font-medium capitalize text-white/55">
            {metaBits.map((bit, i) => (
              <span key={bit} className="flex items-center gap-2">
                {i > 0 && <span aria-hidden className="text-white/25">·</span>}
                {bit}
              </span>
            ))}
          </p>
        )}

        {/* genres */}
        {media.genres.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
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
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {media.favourites != null && media.favourites > 0 && (
              <Stat icon={<Heart className="h-3 w-3 text-[#ff5b8f]" />}>{formatCount(media.favourites)}</Stat>
            )}
            {media.duration != null && media.type === "ANIME" && (
              <Stat icon={<Clock className="h-3 w-3 text-white/50" />}>{media.duration}m</Stat>
            )}
            {airing && <AiringCountdown airingAt={airing.airingAt} episode={airing.episode} />}
          </div>
        )}

        {/* primary action */}
        <div className="mt-5 flex w-full justify-center">
          <MediaActions media={media} />
        </div>
      </div>
    </header>
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
