import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Users, Sparkles, Network, Info } from "lucide-react";
import { getMediaDetail } from "@/lib/anilist/client";
import { stripHtml } from "@/lib/utils";
import { DetailHero } from "@/components/media/detail-hero";
import { Synopsis } from "@/components/media/synopsis";
import { FactList, type Fact } from "@/components/media/fact-list";
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
  const producers = media.studios?.nodes?.filter((s) => !s.isAnimationStudio) ?? [];
  const characters = media.characters?.edges ?? [];
  const relations = media.relations?.edges?.filter((e) => e.node && !e.node.isAdult) ?? [];
  const recs = (media.recommendations?.nodes ?? [])
    .map((n) => n.mediaRecommendation)
    .filter((m): m is NonNullable<typeof m> => !!m && !m.isAdult);

  const facts: Fact[] = [
    { label: "Format", value: media.format?.replace(/_/g, " ") },
    { label: "Status", value: media.status?.replace(/_/g, " ").toLowerCase() },
    { label: media.type === "ANIME" ? "Episodes" : "Chapters", value: media.episodes ?? media.chapters },
    { label: "Volumes", value: media.type === "MANGA" ? media.volumes : null },
    { label: "Duration", value: media.duration ? `${media.duration} min` : null },
    { label: "Started", value: fmtDate(media.startDate) },
    { label: "Ended", value: fmtDate(media.endDate) },
    { label: "Source", value: media.source?.replace(/_/g, " ").toLowerCase() },
    { label: "Origin", value: media.countryOfOrigin },
    { label: studios.length > 1 ? "Studios" : "Studio", value: studios.map((s) => s.name).join(", ") || null },
    { label: "Producers", value: producers.slice(0, 3).map((s) => s.name).join(", ") || null },
  ];

  return (
    <article className="overflow-x-clip pb-16">
      <DetailHero media={media} />

      <div className="container mt-10 md:mt-14">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-14">
          {/* main column */}
          <div className="min-w-0">
            {description ? (
              <Synopsis text={description} />
            ) : (
              <p className="text-sm italic text-white/35">No synopsis has been written for this title yet.</p>
            )}

            {/* Facts — inline here on small screens, in the aside on desktop. */}
            <section className="mt-12 lg:hidden">
              <SectionHeading icon={<Info className="h-4 w-4" />}>Details</SectionHeading>
              <div className="glass rounded-3xl p-4">
                <FactList facts={facts} />
              </div>
            </section>

            {characters.length > 0 && (
              <section className="mt-12 min-w-0">
                <SectionHeading icon={<Users className="h-4 w-4" />}>
                  Characters
                  <Count n={characters.length} />
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

          {/* desktop aside — hard facts, out of the reading flow */}
          <aside className="hidden lg:block">
            <div className="glass sticky top-24 rounded-3xl p-5">
              <h2 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold uppercase tracking-wider text-white/70">
                <Info className="h-4 w-4" /> Details
              </h2>
              <FactList facts={facts} />
            </div>
          </aside>
        </div>
      </div>
    </article>
  );
}

function SectionHeading({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-center gap-2.5 font-display text-lg font-semibold text-white">
      <span aria-hidden className="h-4 w-1 shrink-0 rounded-full bg-gradient-to-b from-waku-400 to-iris-500" />
      {icon && <span className="text-waku-cinematic">{icon}</span>}
      {children}
    </h2>
  );
}

function Count({ n }: { n: number }) {
  return (
    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium tabular-nums text-white/55">
      {n}
    </span>
  );
}
