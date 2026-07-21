"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Pencil, Clock, CheckCircle2, Star, Film, Trophy, Sparkles, Camera, Trash2,
  Clapperboard, BookOpen, BookText, Percent, Heart, TrendingUp, Layers,
} from "lucide-react";
import { useWaku, useEntriesList, STATUS_LABEL, STATUS_ORDER, type WatchStatus } from "@/lib/store";
import { useMounted } from "@/lib/use-mounted";
import { tierForScore } from "@/lib/rating";
import { formatScore, timeAgo, cn } from "@/lib/utils";
import { isNovel } from "@/lib/library-filters";
import { STATUS_META } from "@/components/media/status-meta";
import { RatingChip } from "@/components/media/rating-chip";
import { Button } from "@/components/ui/button";
import { ProfileAuth } from "@/components/profile/profile-auth";
import { SignInView } from "@/components/auth/sign-in-view";
import { useWakuAuth } from "@/lib/supabase/sync";
import { OtakuLadder } from "@/components/profile/otaku-level";
import { OtakuBadge } from "@/components/profile/otaku-badge";
import { otakuStanding } from "@/lib/otaku";
import { LibraryPulse } from "@/components/home/library-pulse";
import { SettingsSheet } from "@/components/profile/settings-sheet";
import {
  RatingDistribution,
  type DistributionBucket,
} from "@/components/profile/rating-distribution";

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

/** Downscale a chosen image to a small square-ish data URL for persisted state. */
async function fileToResizedDataUrl(file: File, max = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas context");
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function ProfilePage() {
  const mounted = useMounted();
  const entries = useEntriesList();
  const profile = useWaku((s) => s.profile);
  const updateProfile = useWaku((s) => s.updateProfile);
  const { enabled: authEnabled, user: authUser, loading: authLoading } = useWakuAuth();
  const [editing, setEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setAvatarError("Image must be under 5 MB.");
      return;
    }
    try {
      const url = await fileToResizedDataUrl(file, 256);
      updateProfile({ avatar: url });
      setAvatarError(null);
    } catch {
      setAvatarError("Couldn’t process that image. Try another.");
    }
  };

  const stats = useMemo(() => {
    const completed = entries.filter((e) => e.status === "COMPLETED");
    const rated = entries.filter((e) => e.score != null);
    const animeEps = entries
      .filter((e) => e.media.type === "ANIME")
      .reduce((s, e) => s + e.progress + (e.media.episodes ?? 0) * e.rewatches, 0);
    const chapters = entries
      .filter((e) => e.media.type === "MANGA")
      .reduce((s, e) => s + e.progress, 0);
    const hours = Math.round((animeEps * 24) / 60);
    const avg =
      rated.length > 0 ? rated.reduce((s, e) => s + (e.score ?? 0), 0) / rated.length : 0;

    const byType = { anime: 0, manga: 0, novel: 0 };
    for (const e of entries) {
      if (e.media.type === "ANIME") byType.anime++;
      else if (isNovel(e)) byType.novel++;
      else byType.manga++;
    }
    const byStatus = {} as Record<WatchStatus, number>;
    for (const s of STATUS_ORDER) byStatus[s] = 0;
    for (const e of entries) byStatus[e.status] = (byStatus[e.status] ?? 0) + 1;

    const completionRate = entries.length > 0 ? Math.round((completed.length / entries.length) * 100) : 0;
    const favorites = entries.filter((e) => e.favorite).length;
    const rewatches = entries.reduce((s, e) => s + e.rewatches, 0);

    return {
      total: entries.length,
      completed: completed.length,
      rated: rated.length,
      hours,
      chapters,
      avg,
      byType,
      byStatus,
      completionRate,
      favorites,
      rewatches,
    };
  }, [entries]);

  const standing = useMemo(() => otakuStanding(stats.total), [stats.total]);

  const distribution = useMemo<DistributionBucket[]>(() => {
    // A 1–10 histogram — one bar per whole-number score, tier-colored.
    const buckets = Array.from({ length: 10 }, (_, i) => ({
      tier: tierForScore(i + 1),
      range: String(i + 1),
      count: 0,
    }));
    for (const e of entries) {
      if (e.score == null) continue;
      const n = Math.min(10, Math.max(1, Math.round(e.score)));
      buckets[n - 1].count++;
    }
    return buckets;
  }, [entries]);

  const favorites = useMemo(
    () =>
      profile.favorites
        .map((id) => entries.find((e) => e.media.id === id))
        .filter(Boolean)
        .slice(0, 6),
    [profile.favorites, entries],
  );

  const recent = useMemo(
    () =>
      [...entries]
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 6),
    [entries],
  );

  const statusSegments = STATUS_ORDER.filter((s) => stats.byStatus[s] > 0);

  if (!mounted) return <Shell />;

  // Gate the ENTIRE page behind sign-in when cloud auth is available. Signed
  // out, the Profile page IS the sign-in page — no profile box, no otaku rank,
  // no stats — and becomes the profile the moment the user signs in.
  if (authEnabled && authLoading) return <Shell />;
  if (authEnabled && !authUser) return <SignInView />;

  return (
    <div className="container max-w-5xl pt-20 md:pt-24">
      {/* Header card */}
      <div className="glass glass-sheen relative overflow-hidden rounded-4xl p-6 sm:p-8">
        <div className="absolute inset-0 -z-10 bg-radial-glow opacity-40" />
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-iris-400 to-waku-700 text-3xl font-bold text-white shadow-glow ring-1 ring-white/20">
              {profile.avatar ? (
                <Image src={profile.avatar} alt="" width={96} height={96} className="h-full w-full object-cover" />
              ) : (
                profile.displayName.charAt(0).toUpperCase()
              )}
            </div>
            {editing && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                aria-label={profile.avatar ? "Change profile picture" : "Upload profile picture"}
                className="absolute inset-0 flex items-center justify-center rounded-3xl bg-abyss-950/55 text-white opacity-0 transition-opacity hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-waku-400"
              >
                <Camera className="h-5 w-5" />
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPickAvatar}
              className="sr-only"
              aria-label="Profile picture file"
            />
            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-abyss-800 px-2 py-0.5 text-[10px] font-bold text-waku-cinematic ring-1 ring-white/15">
              LV {standing.level}
            </span>
          </div>

          <div className="flex-1 text-center sm:text-left">
            {editing ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <Button type="button" variant="glass" size="sm" onClick={() => fileRef.current?.click()}>
                    <Camera className="h-3.5 w-3.5" /> {profile.avatar ? "Change photo" : "Upload photo"}
                  </Button>
                  {profile.avatar && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateProfile({ avatar: null });
                        setAvatarError(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  )}
                </div>
                {avatarError && <p className="text-xs text-rose-300">{avatarError}</p>}

                <label className="flex flex-col gap-1 text-left">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">Display name</span>
                  <input
                    value={profile.displayName}
                    onChange={(e) => updateProfile({ displayName: e.target.value })}
                    maxLength={40}
                    className="input-field px-3 py-1.5 text-lg font-semibold"
                  />
                </label>
                <label className="flex flex-col gap-1 text-left">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">Username</span>
                  <input
                    value={profile.username}
                    onChange={(e) => updateProfile({ username: e.target.value })}
                    maxLength={30}
                    className="input-field px-3 py-1.5 text-sm"
                  />
                </label>
                <label className="flex flex-col gap-1 text-left">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-white/40">Bio</span>
                  <textarea
                    value={profile.bio}
                    onChange={(e) => updateProfile({ bio: e.target.value })}
                    rows={2}
                    maxLength={160}
                    className="input-field resize-none px-3 py-1.5 text-sm"
                  />
                </label>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-2 sm:justify-start">
                  <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{profile.displayName}</h1>
                  <span title={`Otaku rank: ${standing.rank.name} · Level ${standing.level}`} className="inline-flex">
                    <OtakuBadge rank={standing.rank} size="md" glow />
                  </span>
                </div>
                <p className="mt-1 text-sm text-white/45">@{profile.username}</p>
                {profile.bio && <p className="mt-2 max-w-md text-sm text-white/65">{profile.bio}</p>}
                {!authUser && (
                  <p className="mt-2 text-xs text-white/40">Not signed in — data saved on this device</p>
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            <ProfileAuth />
            <SettingsSheet />
            <Button variant="glass" size="sm" onClick={() => setEditing((v) => !v)}>
              <Pencil className="h-3.5 w-3.5" /> {editing ? "Done" : "Edit"}
            </Button>
          </div>
        </div>
      </div>

      {/* Otaku rank ladder */}
      <div className="mt-5">
        <OtakuLadder standing={standing} />
      </div>

      {/* Your shelf — moved here from the home page */}
      {stats.total > 0 && (
        <div className="mt-5">
          <LibraryPulse />
        </div>
      )}

      {stats.total === 0 ? (
        <div className="glass glass-sheen mt-5 flex flex-col items-center gap-2 rounded-4xl p-10 text-center">
          <Sparkles className="h-6 w-6 text-waku-cinematic" />
          <p className="text-sm text-white/60">
            Track a few titles and your stats, ranks, and activity will bloom here.
          </p>
          <Link href="/discover">
            <Button variant="accent" size="md" className="mt-2">
              Discover titles
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Headline stat tiles — compact, four across on all but the
              narrowest screens so eight facts fit in two tidy rows. */}
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
            <StatTile icon={<Film className="h-3.5 w-3.5" />} label="Tracked" value={stats.total} />
            <StatTile icon={<CheckCircle2 className="h-3.5 w-3.5" />} label="Completed" value={stats.completed} />
            <StatTile icon={<Clock className="h-3.5 w-3.5" />} label="Hours" value={stats.hours.toLocaleString()} />
            <StatTile icon={<Star className="h-3.5 w-3.5" />} label="Avg score" value={stats.avg ? formatScore(stats.avg) : "–"} />
            <StatTile icon={<Percent className="h-3.5 w-3.5" />} label="Completion" value={`${stats.completionRate}%`} />
            <StatTile icon={<BookOpen className="h-3.5 w-3.5" />} label="Chapters" value={stats.chapters.toLocaleString()} />
            <StatTile icon={<Heart className="h-3.5 w-3.5" />} label="Favorites" value={stats.favorites} />
            <StatTile icon={<TrendingUp className="h-3.5 w-3.5" />} label="Rewatches" value={stats.rewatches} />
          </div>

          {/* Collection composition — media type + status */}
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="glass glass-sheen rounded-4xl p-5">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
                <Layers className="h-4 w-4 text-waku-cinematic" /> Collection
              </h2>
              <div className="grid grid-cols-3 gap-2.5">
                <TypeStat icon={<Clapperboard className="h-4 w-4" />} label="Anime" value={stats.byType.anime} accent="#5b8cff" />
                <TypeStat icon={<BookOpen className="h-4 w-4" />} label="Manga" value={stats.byType.manga} accent="#2fd08a" />
                <TypeStat icon={<BookText className="h-4 w-4" />} label="Novels" value={stats.byType.novel} accent="#f3b13f" />
              </div>

              {/* status breakdown */}
              <div className="mt-5">
                <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-white/5">
                  {statusSegments.map((s) => (
                    <span
                      key={s}
                      className="h-full"
                      style={{ flexGrow: stats.byStatus[s], background: STATUS_META[s].color, opacity: 0.9 }}
                      title={`${STATUS_LABEL[s]}: ${stats.byStatus[s]}`}
                    />
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  {statusSegments.map((s) => (
                    <span key={s} className="flex items-center gap-1.5 text-xs text-white/55">
                      <span className="h-2 w-2 rounded-full" style={{ background: STATUS_META[s].color }} />
                      {STATUS_LABEL[s]}
                      <span className="font-semibold tabular-nums text-white/80">{stats.byStatus[s]}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Ratings distribution */}
            <div className="glass glass-sheen rounded-4xl p-5">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
                <Sparkles className="h-4 w-4 text-waku-cinematic" /> Ratings
              </h2>
              <RatingDistribution buckets={distribution} />
            </div>
          </div>

          {/* Favorites + recent activity */}
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <div className="glass glass-sheen rounded-4xl p-5">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
                <Trophy className="h-4 w-4 text-waku-cinematic" /> Favorites
              </h2>
              {favorites.length > 0 ? (
                <div className="grid grid-cols-6 gap-2 sm:gap-3">
                  {favorites.map(
                    (e) =>
                      e && (
                        <Link key={e.media.id} href={`/media/${e.media.id}`} className="group">
                          <div className="relative aspect-[2/3] overflow-hidden rounded-xl ring-1 ring-white/10">
                            {e.media.cover && (
                              <Image src={e.media.cover} alt="" fill sizes="80px" className="object-cover transition-transform group-hover:scale-105" />
                            )}
                          </div>
                        </Link>
                      ),
                  )}
                </div>
              ) : (
                <p className="text-sm text-white/45">
                  Tap the heart on any title to feature your favorites here.
                </p>
              )}
            </div>

            <div className="glass glass-sheen rounded-4xl p-5">
              <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
                <Clock className="h-4 w-4 text-waku-cinematic" /> Recent activity
              </h2>
              {recent.length > 0 ? (
                <ul className="flex flex-col gap-2.5">
                  {recent.map((e) => {
                    const meta = STATUS_META[e.status];
                    return (
                      <li key={e.media.id}>
                        <Link href={`/media/${e.media.id}`} className="group flex items-center gap-3 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-waku-400">
                          <div className="relative h-12 w-9 shrink-0 overflow-hidden rounded-md bg-abyss-700 ring-1 ring-white/10">
                            {e.media.cover && <Image src={e.media.cover} alt="" fill sizes="36px" className="object-cover" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white group-hover:text-waku-cinematic">{e.media.title}</p>
                            <p className="flex items-center gap-1.5 text-xs text-white/45">
                              <span className="inline-flex items-center gap-1" style={{ color: meta.color }}>
                                <meta.icon className="h-3 w-3" /> {STATUS_LABEL[e.status]}
                              </span>
                              · {timeAgo(e.updatedAt)}
                            </p>
                          </div>
                          <RatingChip score={e.score} size="xs" showUnrated={false} />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-white/45">Nothing tracked yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="glass glass-sheen flex flex-col gap-0.5 rounded-2xl p-2.5">
      <span className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide text-white/45">
        <span className="text-waku-cinematic">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className="font-display text-lg font-bold tabular-nums leading-tight text-white">{value}</span>
    </div>
  );
}

function TypeStat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-2xl p-3 ring-1 ring-inset"
      style={{ background: `${accent}12`, boxShadow: `inset 0 0 0 1px ${accent}30` }}
    >
      <span style={{ color: accent }}>{icon}</span>
      <span className="font-display text-xl font-bold tabular-nums text-white">{value}</span>
      <span className="text-[11px] text-white/50">{label}</span>
    </div>
  );
}

function Shell() {
  return (
    <div className="container max-w-5xl pt-24">
      <div className="skeleton h-40 rounded-4xl" />
      <div className="mt-5 skeleton h-40 rounded-4xl" />
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-28 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
