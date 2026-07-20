"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Description block that collapses long synopses behind a fade + "Read more".
 * Measures the content first and only shows the control when the text is
 * actually clipped, so short descriptions never get a pointless toggle.
 */
export function Synopsis({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [clipped, setClipped] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setClipped(el.scrollHeight > el.clientHeight + 4);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text]);

  if (!text) return null;

  return (
    <div>
      <div className="relative">
        <p
          ref={ref}
          className={cn(
            "whitespace-pre-line text-[14px] leading-[1.7] text-white/75 transition-[max-height] [text-wrap:pretty]",
            !expanded && "max-h-[10.5rem] overflow-hidden",
          )}
        >
          {text}
        </p>
        {!expanded && clipped && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-abyss-950 via-abyss-950/70 to-transparent" />
        )}
      </div>

      {clipped && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="mt-2 inline-flex items-center gap-1 rounded-full text-xs font-semibold text-waku-cinematic outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
        >
          {expanded ? "Show less" : "Read more"}
          <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </div>
  );
}
