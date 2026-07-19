"use client";

import { Check } from "lucide-react";
import { useTheme, PALETTES, paletteSwatch } from "@/lib/theme";
import { useMounted } from "@/lib/use-mounted";
import { cn } from "@/lib/utils";

/**
 * The accent-palette swatch grid. Choosing one re-tints the whole app instantly
 * (and persists per device). Rendered inside the Settings sheet.
 */
export function PaletteGrid() {
  const mounted = useMounted();
  const palette = useTheme((s) => s.palette);
  const setPalette = useTheme((s) => s.setPalette);

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {PALETTES.map((p) => {
        const active = mounted && palette === p.id;
        const [primary, secondary] = paletteSwatch(p);
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => setPalette(p.id)}
            aria-pressed={active}
            aria-label={`${p.label} palette`}
            className={cn(
              "group flex items-center gap-2 rounded-2xl p-2 text-left outline-none ring-1 ring-inset transition-all focus-visible:ring-2 focus-visible:ring-waku-400",
              active ? "bg-white/[0.08] ring-white/25" : "bg-white/[0.03] ring-white/10 hover:bg-white/[0.06]",
            )}
          >
            <span
              className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full ring-1 ring-inset ring-white/20"
              style={{ background: `linear-gradient(135deg, ${primary} 0 50%, ${secondary} 50% 100%)` }}
            >
              {active && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                  <Check className="h-4 w-4 text-white drop-shadow" strokeWidth={3} />
                </span>
              )}
            </span>
            <span className={cn("min-w-0 flex-1 truncate text-xs font-semibold", active ? "text-white" : "text-white/80")}>
              {p.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
