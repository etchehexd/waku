import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** AniList stores scores as 0–100 ints. Convert to Waku's 0–10 one-decimal scale. */
export function toTenScale(score?: number | null): number | null {
  if (score == null) return null;
  return Math.round(score) / 10;
}

/** Format a 0–10 score to a single decimal, e.g. 8 -> "8.0". */
export function formatScore(score?: number | null): string {
  if (score == null) return "–";
  return score.toFixed(1);
}

export function formatCount(n?: number | null): string {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return `${n}`;
}

/** Relative time until a unix (seconds) timestamp, e.g. "2d 4h". */
export function timeUntil(unixSeconds?: number | null): string {
  if (!unixSeconds) return "";
  const secs = unixSeconds - Math.floor(Date.now() / 1000);
  if (secs <= 0) return "aired";
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** Compact "time since" for a unix-ms timestamp, e.g. "3d", "2mo", "just now". */
export function timeAgo(unixMs?: number | null): string {
  if (!unixMs) return "";
  const secs = Math.floor((Date.now() - unixMs) / 1000);
  if (secs < 45) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function stripHtml(html?: string | null): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&mdash;/g, "—")
    .trim();
}

export const seasonNow = (): { season: string; year: number } => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const season =
    month < 3 ? "WINTER" : month < 6 ? "SPRING" : month < 9 ? "SUMMER" : "FALL";
  return { season, year };
};
