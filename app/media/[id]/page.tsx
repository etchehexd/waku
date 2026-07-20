import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Users, Sparkles, Network } from "lucide-react";
import { getMediaDetail } from "@/lib/anilist/client";
import { stripHtml } from "@/lib/utils";
import { DetailHero } from "@/components/media/detail-hero";
import { Synopsis } from "@/components/media/synopsis";
import { CharacterCard } from "@/components/media/character-card";
import { MediaCard } from "@/components/media/media-card";
import { MediaScroller } from "@/components/media/media-scroller";

export const revalidate = 3600;

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  try {
    const { id } = await params;
    const m = await getMediaDetail(Number(id));
    const title = m.title.english || m.title.romaji || "Media";
    return { title, description: stripHtml(m.description).slice(0, 150) };
  } catch {
    return { title: "Media" };
  }
}

const fmtDate = (d: { year: number | null; month: number | null; day: number | null } | null) => {
  if (!d?.year) return null;
  if (!d.month) return `${d.year}`;
  return new Date(d.year, d.month - 1, d.day ?? 1).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    ...(d.day ? { day: "numeric" } : {}),
  });
};

type Fact = { label: string; value: string | number | null | undefined };

export default async function MediaPage({ params }: Params) {
  const { id } = await params;
  const numericId = Number(id);
  if (!Number.isInteger(numericId) || numericId <= 0) notFound();

  let media;
  try {
    media = await getMediaDetail(numericId);
  } catch {
    notFound();
  }
  if (!media) notFound();

  const description = stripHtml(media.description);
  const studios = media.studios?.nodes?.filter((s) => s.isAnimationStudio) ?? [];
  const characters = media.characters?.edges ?? [];
  const relations = media.relations?.edges?.filter((e) => e.node && !e.node.isAdult) ?? [];
  const recs = (media.recommendations?.nodes ?? [])
    .map((n) => n.mediaRecommendation)
    .filter((m): m is NonNullable<typeof m> => !!m && !m.isAdult);

  const facts: Fact[] = [
    { label: "Format", value: media.format?.replace(/_/g, " ") },
    { label: media.type === "ANIME" ? "Episodes" : "Chapters", value: media.episodes ?? media.chapters },
    { label: "Status", value: media.status?.replace(/_/g, " ").toLowerCase() },
    { label: "Aired", value: fmtDate(media.startDate) },
    { label: studios.length > 1 ? "Studios" : "Studio", value: studios.map((s) => s.name).join(", ") || null },
    { label: "Source", value: media.source?.replace(/_/g, " ").toLowerCase() },
  ];

  return (
    <article className="overflow-x-clip pb-20">
      <DetailHero media={media} />

      <div className="container mt-12 md:mt-16">
        <div className="mx-auto max-w-3xl">
          {/* Inline facts band — replaces the boxed sidebar */}
          <FactBand facts={facts} />

          {/* Synopsis */}
          <section className="mt-12">
            <SectionHeading>Synopsis</SectionHeading>
            {description ? (
              <Synopsis text={description} />
            ) : (
              <p className="text-center text-sm italic text-white/35">
                No synopsis has been written for this title yet.
              </p>
            )}
          </section>

          {characters.length > 0 && (
            <section className="mt-14">
              <SectionHeading icon={<Users className="h-4 w-4" />} count={characters.length}>
                Characters
              </SectionHeading>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {characters.map((edge) => (
                  <CharacterCard
                    key={`${edge.node.id}-${edge.role}`}
                    name={edge.node.name.full}
                    image={edge.node.image.large}
                    role={edge.role}
                    actorName={edge.voiceActors?.[0]?.name.full}
                    actorImage={edge.voiceActors?.[0]?.image.large}
                  />
                ))}
              </div>
            </section>
          )}

          {relations.length > 0 && (
            <MediaScroller title="Related stories" icon={<Network className="h-4 w-4" />}>
              {relations.map((edge) => (
                <div key={`${edge.node.id}-${edge.relationType}`} className="w-[124px] shrink-0">
                  <span className="mb-1.5 block truncate text-[11px] font-medium uppercase tracking-wide text-white/40">
                    {edge.relationType.replace(/_/g, " ").toLowerCase()}
                  </span>
                  <MediaCard media={edge.node} className="!w-full" />
                </div>
              ))}
            </MediaScroller>
          )}

          {recs.length > 0 && (
            <MediaScroller title="You might also like" icon={<Sparkles className="h-4 w-4" />}>
              {recs.map((m) => (
                <MediaCard key={m.id} media={m} className="!w-[124px]" />
              ))}
            </MediaScroller>
          )}
        </div>
      </div>
    </article>
  );
}

/** Centered, hairline-divided inline facts — the magazine layout's spec line. */
function FactBand({ facts }: { facts: Fact[] }) {
  const shown = facts.filter((f) => f.value != null && f.value !== "");
  if (shown.length === 0) return null;
  return (
    <dl className="flex flex-wrap items-stretch justify-center gap-y-4 rounded-2xl border-y border-white/[0.08] py-5">
      {shown.map((f, i) => (
        <div
          key={f.label}
          className={i > 0 ? "border-l border-white/[0.08] px-5 sm:px-7" : "px-5 sm:px-7"}
        >
          <dt className="text-center text-[10px] font-bold uppercase tracking-[0.15em] text-white/40">
            {f.label}
          </dt>
          <dd className="mt-1 text-center text-sm font-semibold capitalize text-white/90 [overflow-wrap:anywhere]">
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Centered magazine section heading — accent tick above a bold label. */
function SectionHeading({
  icon,
  count,
  children,
}: {
  icon?: React.ReactNode;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col items-center gap-2 text-center">
      <span aria-hidden className="h-1 w-8 rounded-full bg-waku-cinematic" />
      <h2 className="flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight text-white">
        {icon && <span className="text-waku-cinematic">{icon}</span>}
        {children}
        {count != null && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-white/55">
            {count}
          </span>
        )}
      </h2>
    </div>
  );
}
