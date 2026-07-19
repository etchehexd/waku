import { NextRequest, NextResponse } from "next/server";
import { refreshLibraryMedia, type RefreshedMedia } from "@/lib/anilist/client";
import type { MediaMetadataPatch } from "@/lib/store";

/**
 * Same-origin, server-only boundary for refreshing library metadata. The
 * client posts the ids it wants refreshed (already narrowed to likely-stale
 * titles); this route validates + caps them, fetches AniList in batched
 * chunks with retry/concurrency handled in `refreshLibraryMedia`, and returns
 * media-only patches plus a small summary. It never receives or echoes any
 * user-owned data — merging into the store (which protects progress, status,
 * ratings, etc.) happens entirely client-side.
 */

// Hard ceiling so a malformed request can't fan out into dozens of AniList
// pages. A single refresh covering 500 titles is 10 chunked requests.
const MAX_IDS = 500;

function parseIds(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<number>();
  for (const raw of input) {
    const n = typeof raw === "number" ? raw : Number(raw);
    if (Number.isInteger(n) && n > 0) seen.add(n);
    if (seen.size >= MAX_IDS) break;
  }
  return Array.from(seen);
}

function toPatch(m: RefreshedMedia): MediaMetadataPatch {
  const title = m.title.english || m.title.romaji || m.title.native || undefined;
  return {
    id: m.id,
    type: m.type,
    format: m.format,
    title,
    titleEnglish: m.title.english,
    titleRomaji: m.title.romaji,
    titleNative: m.title.native,
    cover: m.coverImage.extraLarge || m.coverImage.large,
    color: m.coverImage.color,
    episodes: m.episodes,
    chapters: m.chapters,
    volumes: m.volumes,
    seasonYear: m.seasonYear,
    averageScore: m.averageScore,
    mediaStatus: (m.status as MediaMetadataPatch["mediaStatus"]) ?? null,
    nextAiring: m.nextAiringEpisode
      ? { airingAt: m.nextAiringEpisode.airingAt, episode: m.nextAiringEpisode.episode }
      : null,
  };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const ids = parseIds((body as { ids?: unknown })?.ids);
  if (ids.length === 0) {
    return NextResponse.json({ error: "No valid title ids to refresh." }, { status: 400 });
  }

  try {
    const { media, failedChunks, totalChunks } = await refreshLibraryMedia(ids);
    return NextResponse.json(
      {
        patches: media.map(toPatch),
        requested: ids.length,
        matched: media.length,
        failedChunks,
        totalChunks,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[library/refresh] failed:", err);
    return NextResponse.json(
      { error: "Refresh is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }
}
