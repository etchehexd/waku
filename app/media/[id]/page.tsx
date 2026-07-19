import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Users, Sparkles, Network } from "lucide-react";
import { getMediaDetail } from "@/lib/anilist/client";
import { stripHtml } from "@/lib/utils";
import { DetailHero } from "@/components/media/detail-hero";
import { Synopsis } from "@/components/media/synopsis";
import { type Fact } from "@/components/media/fact-list";
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
  const characters = media.characters?.edges ?? [];
  const relations = media.relations?.edges?.filter((e) => e.node && !e.node.isAdult) ?? [];
  const recs = (media.recommendations?.nodes ?? [])
    .map((n) => n.mediaRecommendation)
    .filter((m): m is NonNullable<typeof m> => !!m && !m.isAdult);

  // The scannable subset shown in the horizontal spec strip up top.
  const specs: Fact[] = [
    { label: "Format", value: media.format?.replace(/_/g, " ") },
    { label: media.type === "ANIME" ? "Episodes" : "Chapters", value: media.episodes ?? media.chapters },
    { label: "Status", value: media.status?.replace(/_/g, " ").toLowerCase() },
    { label: "Aired", value: media.seasonYear ?? fmtDate(media.startDate) },
    { label: studios.length > 1 ? "Studios" : "Studio", value: studios.map((s) => s.name).join(", ") || null },
    { label: "Source", value: media.source?.replace(/_/g, " ").toLowerCase() },
  ];

  return (
    <article className="overflow-x-clip pb-16">
      <DetailHero media={media} />

      <div className="container mt-10 md:mt-14">
        {/* Spec strip — the key facts as one clean horizontal band, replacing
            the old boxed sidebar. Scannable at a glance, full width. */}
        <SpecStrip facts={specs} />

        {/* Editorial body — a single focused reading column, no sidebar. */}
        <div className="mt-12 md:mt-16">
          {description ? (
            <Synopsis text={description} />
          ) : (
            <p className="text-sm italic text-white/35">No synopsis has been written for this title yet.</p>
          )}

          {characters.length > 0 && (
            <section className="mt-14 min-w-0">
              <SectionHeading icon={<Users className="h-4 w-4" />}>
                Characters
                <Count n={characters.length} />
              </SectionHeading>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
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

function SpecStrip({ facts }: { facts: Fact[] }) {
  const shown = facts.filter((f) => f.value != null && f.value !== "");
  if (shown.length === 0) return null;
  return (
    <dl className="glass grid grid-cols-2 overflow-hidden rounded-3xl sm:grid-cols-3 lg:grid-cols-6">
      {shown.map((f) => (
        <div key={f.label} className="min-w-0 border-b border-r border-white/[0.06] p-4 sm:p-5">
          <dt className="text-[11px] font-medium uppercase tracking-wider text-white/40">{f.label}</dt>
          <dd className="mt-1.5 text-sm font-semibold leading-snug text-white/90 [overflow-wrap:anywhere]">
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SectionHeading({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-5 flex items-center gap-4">
      <h2 className="flex shrink-0 items-center gap-2.5 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
        {icon && <span className="text-waku-cinematic">{icon}</span>}
        {children}
      </h2>
      <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
    </div>
  );
}

function Count({ n }: { n: number }) {
  return (
    <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium tabular-nums text-white/55">
      {n}
    </span>
  );
}
