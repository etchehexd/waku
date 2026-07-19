"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import type { MediaSummary } from "@/lib/anilist/types";
import { MediaCard } from "./media-card";
import { Button } from "@/components/ui/button";

interface MediaRowProps {
  title: string;
  media: MediaSummary[];
  href?: string;
}

/** A titled horizontal rail. Intentionally has no subtitle: the row title
 *  already says what the row is, and a tagline under every one of them adds
 *  noise and vertical drift on a page made of stacked rails. */
export function MediaRow({ title, media, href }: MediaRowProps) {
  const rail = useRef<HTMLDivElement>(null);

  const scroll = (dir: -1 | 1) => {
    rail.current?.scrollBy({ left: dir * 560, behavior: "smooth" });
  };

  if (!media?.length) return null;

  return (
    <section className="relative">
      <div className="container mb-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {/* a small accent bar gives each rail a tidy, designed anchor */}
          <span className="h-5 w-1 shrink-0 rounded-full bg-gradient-to-b from-waku-400 to-iris-500" aria-hidden />
          <h3 className="truncate font-display text-lg font-bold tracking-tight text-white sm:text-xl">
            {title}
          </h3>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {href && (
            <Link
              href={href}
              className="hidden items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-white/55 outline-none transition-colors hover:bg-white/8 hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400 sm:inline-flex"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
          <div className="hidden gap-1.5 md:flex">
            <Button variant="glass" size="icon-sm" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="glass" size="icon-sm" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div
        ref={rail}
        className="rail flex gap-4 overflow-x-auto px-5 py-3 [scroll-padding-left:1.25rem] sm:px-[max(1.25rem,calc((100vw-1400px)/2+1.25rem))]"
      >
        {media.map((m, i) => (
          <div key={m.id} className="snap-start">
            <MediaCard media={m} index={i} />
          </div>
        ))}
        {href && (
          <Link
            href={href}
            className="glass glass-sheen glass-interactive flex w-[120px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-2xl text-white/70 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400 sm:w-[140px]"
            aria-label={`View all ${title}`}
          >
            <ArrowRight className="h-5 w-5" />
            <span className="text-xs font-medium">View all</span>
          </Link>
        )}
      </div>
    </section>
  );
}
