"use client";

import { useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * A self-contained horizontal rail with arrow controls. Browsing scrolls only
 * inside the rail — it never widens or scrolls the document horizontally.
 */
export function MediaScroller({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  const rail = useRef<HTMLDivElement>(null);
  const scroll = (dir: -1 | 1) =>
    rail.current?.scrollBy({ left: dir * 440, behavior: "smooth" });

  return (
    <section className="mt-12 min-w-0">
      <div className="mb-5 flex items-center gap-4">
        <h2 className="flex shrink-0 items-center gap-2.5 font-display text-xl font-bold tracking-tight text-white sm:text-2xl">
          {icon && <span className="text-waku-cinematic">{icon}</span>}
          {title}
        </h2>
        <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-white/15 to-transparent" />
        <div className="hidden shrink-0 gap-1.5 sm:flex">
          <Button variant="glass" size="icon-sm" onClick={() => scroll(-1)} aria-label="Scroll left">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="glass" size="icon-sm" onClick={() => scroll(1)} aria-label="Scroll right">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div ref={rail} className="rail flex gap-3 overflow-x-auto py-2">
        {children}
      </div>
    </section>
  );
}
