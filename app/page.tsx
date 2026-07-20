import { Clapperboard, BookOpen, BookText, type LucideIcon } from "lucide-react";
import { getHomepage } from "@/lib/anilist/client";
import { seasonNow } from "@/lib/utils";
import { HeroCarousel } from "@/components/home/hero-carousel";
import { ContinueWatching } from "@/components/home/continue-watching";
import { MediaRow } from "@/components/media/media-row";

// Revalidate the homepage every 15 min at the edge.
export const revalidate = 900;

export default async function HomePage() {
  const { season, year } = seasonNow();

  const {
    hero,
    trendingAnime,
    seasonAnime,
    popularAnime,
    topAnime,
    trendingManga,
    popularManga,
    topManga,
    lightNovels,
    trendingNovels,
    topNovels,
  } = await getHomepage();

  const seasonLabel = `${season.charAt(0)}${season.slice(1).toLowerCase()} ${year}`;
  const heroFailed = hero.length === 0 && trendingAnime.length === 0;

  return (
    <div className="flex flex-col">
      {/* Cinematic featured hero anchors the top of the page. */}
      {hero.length > 0 ? (
        <HeroCarousel items={hero} />
      ) : (
        heroFailed && (
          <div className="container pt-28 md:pt-32">
            <div className="glass glass-sheen mx-auto max-w-lg rounded-4xl p-8 text-center">
              <h2 className="font-display text-xl font-semibold text-white">
                Couldn&apos;t load right now
              </h2>
              <p className="mt-2 text-sm text-white/60">
                We&apos;re having trouble loading titles. Refresh in a moment&mdash;your library
                and rankings still work offline.
              </p>
            </div>
          </div>
        )
      )}

      <div className="flex flex-col gap-10 pb-6 pt-8 md:gap-14 md:pt-10">
        {/* Then your own collection, then the discovery rails. */}
        <ContinueWatching />

        <CategoryBlock title="Anime" icon={Clapperboard} accent="#5b8cff">
          <MediaRow
            title="Trending now"
            media={trendingAnime}
            href="/discover?type=ANIME&sort=TRENDING_DESC"
          />
          <MediaRow
            title={`This season — ${seasonLabel}`}
            media={seasonAnime}
            href="/discover?type=ANIME&season=1"
          />
          <MediaRow
            title="Most popular"
            media={popularAnime}
            href="/discover?type=ANIME&sort=POPULARITY_DESC"
          />
          <MediaRow
            title="Highest rated"
            media={topAnime}
            href="/discover?type=ANIME&sort=SCORE_DESC"
          />
        </CategoryBlock>

        <CategoryBlock title="Manga" icon={BookOpen} accent="#2fd08a">
          <MediaRow
            title="Trending now"
            media={trendingManga}
            href="/discover?type=MANGA&sort=TRENDING_DESC"
          />
          <MediaRow
            title="Most popular"
            media={popularManga}
            href="/discover?type=MANGA&sort=POPULARITY_DESC"
          />
          <MediaRow
            title="Highest rated"
            media={topManga}
            href="/discover?type=MANGA&sort=SCORE_DESC"
          />
        </CategoryBlock>

        <CategoryBlock title="Light Novels" icon={BookText} accent="#f3b13f">
          <MediaRow
            title="Trending now"
            media={trendingNovels}
            href="/discover?type=MANGA&format=NOVEL&sort=TRENDING_DESC"
          />
          <MediaRow
            title="Most popular"
            media={lightNovels}
            href="/discover?type=MANGA&format=NOVEL&sort=POPULARITY_DESC"
          />
          <MediaRow
            title="Highest rated"
            media={topNovels}
            href="/discover?type=MANGA&format=NOVEL&sort=SCORE_DESC"
          />
        </CategoryBlock>
      </div>
    </div>
  );
}

/**
 * A titled home section with its own color identity — anime is blue, manga
 * green, light novels amber — so long scrolls stay orientable and the page
 * reads colorful without any single hue shouting.
 */
function CategoryBlock({
  title,
  icon: Icon,
  accent,
  children,
}: {
  title: string;
  icon: LucideIcon;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="container mb-5 flex items-center gap-3">
        <span
          className="flex h-9 w-9 items-center justify-center rounded-2xl ring-1 ring-inset"
          style={{
            background: `${accent}1f`,
            boxShadow: `inset 0 0 0 1px ${accent}40`,
            color: accent,
          }}
        >
          <Icon className="h-[18px] w-[18px]" />
        </span>
        <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
        <div
          className="h-px flex-1"
          style={{ background: `linear-gradient(to right, ${accent}59, transparent)` }}
        />
      </div>
      <div className="flex flex-col gap-8">{children}</div>
    </section>
  );
}
