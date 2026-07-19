import { NextResponse } from "next/server";
import { getTaxonomy } from "@/lib/anilist/client";

/**
 * Same-origin, heavily-cached endpoint exposing AniList's canonical genre and
 * tag vocabulary to the Discover filters. Adult and spoiler tags are stripped
 * server-side so the browser never receives them. Falls back to a safe static
 * list if AniList is unreachable.
 */

// Every safe, non-adult genre AniList exposes (Hentai excluded on purpose).
const FALLBACK_GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Horror",
  "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological", "Romance",
  "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller",
];

export interface DiscoverTag {
  name: string;
  category: string;
}

export interface DiscoverMeta {
  genres: string[];
  tags: DiscoverTag[];
}

export async function GET() {
  try {
    const { genres, tags } = await getTaxonomy();
    const safeGenres = genres.filter((g) => g !== "Hentai").sort();
    const safeTags: DiscoverTag[] = tags
      .filter((t) => !t.isAdult && !t.isGeneralSpoiler)
      .map((t) => ({ name: t.name, category: t.category ?? "Other" }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(
      { genres: safeGenres.length ? safeGenres : FALLBACK_GENRES, tags: safeTags },
      // Genre/tag lists change rarely — cache aggressively.
      { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } },
    );
  } catch (err) {
    console.error("[discover/meta] taxonomy failed:", err);
    return NextResponse.json(
      { genres: FALLBACK_GENRES, tags: [] as DiscoverTag[] },
      { headers: { "Cache-Control": "public, s-maxage=300" } },
    );
  }
}
