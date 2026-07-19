"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** The id of a selectable accent palette (matches [data-palette] in globals.css). */
export type PaletteId =
  | "ocean"
  | "sky"
  | "teal"
  | "aqua"
  | "emerald"
  | "forest"
  | "lime"
  | "gold"
  | "ember"
  | "crimson"
  | "rose"
  | "sakura"
  | "fuchsia"
  | "grape"
  | "violet"
  | "indigo"
  | "mono";

export interface PaletteDef {
  id: PaletteId;
  label: string;
  /** Accent hue/saturation (primary = waku, secondary = iris). MUST match the
   *  matching `:root[data-palette]` rule in globals.css — kept here too so the
   *  picker can render an exact-match swatch from the same HSL formula. */
  wkH: number;
  wkS: number;
  irH: number;
  irS: number;
}

/**
 * The curated palette set, walking the color wheel. The site is themed entirely
 * by the CSS vars in globals.css; these numbers mirror those rules so the
 * picker can preview each theme with the real accent colors.
 */
export const PALETTES: PaletteDef[] = [
  { id: "ocean", label: "Ocean", wkH: 224, wkS: 100, irH: 252, irS: 100 },
  { id: "sky", label: "Sky", wkH: 205, wkS: 95, irH: 232, irS: 95 },
  { id: "teal", label: "Teal", wkH: 190, wkS: 90, irH: 216, irS: 92 },
  { id: "aqua", label: "Aqua", wkH: 174, wkS: 80, irH: 200, irS: 78 },
  { id: "emerald", label: "Emerald", wkH: 158, wkS: 78, irH: 180, irS: 72 },
  { id: "forest", label: "Forest", wkH: 146, wkS: 72, irH: 168, irS: 68 },
  { id: "lime", label: "Lime", wkH: 96, wkS: 70, irH: 128, irS: 66 },
  { id: "gold", label: "Gold", wkH: 40, wkS: 92, irH: 22, irS: 90 },
  { id: "ember", label: "Ember", wkH: 18, wkS: 92, irH: 350, irS: 88 },
  { id: "crimson", label: "Crimson", wkH: 352, wkS: 88, irH: 322, irS: 82 },
  { id: "rose", label: "Rose", wkH: 336, wkS: 90, irH: 300, irS: 82 },
  { id: "sakura", label: "Sakura", wkH: 330, wkS: 90, irH: 292, irS: 80 },
  { id: "fuchsia", label: "Fuchsia", wkH: 310, wkS: 82, irH: 280, irS: 80 },
  { id: "grape", label: "Grape", wkH: 280, wkS: 78, irH: 306, irS: 76 },
  { id: "violet", label: "Violet", wkH: 262, wkS: 90, irH: 288, irS: 85 },
  { id: "indigo", label: "Indigo", wkH: 236, wkS: 88, irH: 262, irS: 90 },
  { id: "mono", label: "Slate", wkH: 220, wkS: 16, irH: 232, irS: 24 },
];

/** The primary + secondary accent swatch for a palette, from the shared ramp. */
export function paletteSwatch(p: PaletteDef): [string, string] {
  return [`hsl(${p.wkH} ${p.wkS}% 61%)`, `hsl(${p.irH} ${p.irS}% 68%)`];
}

export const DEFAULT_PALETTE: PaletteId = "ocean";

export const THEME_STORAGE_KEY = "waku-theme";

interface ThemeState {
  palette: PaletteId;
  setPalette: (p: PaletteId) => void;
}

/**
 * Device-local appearance preference. Deliberately separate from the
 * cloud-synced library store — the chosen palette is a per-device display
 * choice, not user data. Applied to <html data-palette> by {@link ThemeApplier}
 * and pre-hydration by the inline script in the root layout.
 */
export const useTheme = create<ThemeState>()(
  persist(
    (set) => ({
      palette: DEFAULT_PALETTE,
      setPalette: (palette) => set({ palette }),
    }),
    { name: THEME_STORAGE_KEY },
  ),
);
