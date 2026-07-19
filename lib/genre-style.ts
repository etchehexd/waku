/**
 * Genre → tinted-glass style. Each genre gets a hue that matches its feeling;
 * the returned values keep the app's liquid-glass construction (translucent
 * tinted fill + subtle border + light, AA-readable text on the dark UI).
 *
 * Colors are returned as inline style values so any number of genres can be
 * tinted without generating Tailwind classes at build time.
 */

export interface GenreStyle {
  /** light, readable text/icon color */
  text: string;
  /** translucent tinted fill */
  bg: string;
  /** subtle border */
  border: string;
  /** solid accent (for dots/rings if needed) */
  accent: string;
}

/** Build a glass style from a base RGB, mixing toward white for readable text. */
function make(r: number, g: number, b: number): GenreStyle {
  const mix = 0.55; // toward white
  const lr = Math.round(r + (255 - r) * mix);
  const lg = Math.round(g + (255 - g) * mix);
  const lb = Math.round(b + (255 - b) * mix);
  return {
    text: `rgb(${lr}, ${lg}, ${lb})`,
    bg: `rgba(${r}, ${g}, ${b}, 0.16)`,
    border: `rgba(${r}, ${g}, ${b}, 0.40)`,
    accent: `rgb(${r}, ${g}, ${b})`,
  };
}

// Exact AniList genre names → base color.
const GENRE_RGB: Record<string, [number, number, number]> = {
  Action: [255, 90, 60], // warm red-orange
  Adventure: [255, 138, 61], // orange
  Comedy: [255, 206, 58], // sunny yellow
  Drama: [232, 73, 106], // rose
  Ecchi: [232, 106, 160], // soft magenta-pink
  Fantasy: [154, 123, 255], // violet
  Horror: [226, 55, 74], // crimson
  Hentai: [138, 160, 192], // neutral (kept out of UI anyway)
  "Mahou Shoujo": [255, 122, 194], // magical-girl pink
  Mecha: [47, 208, 224], // cyan
  Music: [224, 85, 200], // magenta
  Mystery: [106, 117, 230], // indigo
  Psychological: [139, 106, 214], // muted purple
  Romance: [255, 111, 165], // pink
  "Sci-Fi": [61, 139, 255], // electric blue
  "Slice of Life": [111, 208, 138], // soft green
  Sports: [143, 206, 74], // energetic green
  Supernatural: [176, 106, 255], // purple
  Thriller: [85, 96, 214], // deep indigo
};

/** Calm, neutral fallback for unknown genres. */
const NEUTRAL = make(138, 160, 192);

const cache = new Map<string, GenreStyle>();

export function genreStyle(genre: string): GenreStyle {
  const cached = cache.get(genre);
  if (cached) return cached;
  const rgb = GENRE_RGB[genre];
  const style = rgb ? make(rgb[0], rgb[1], rgb[2]) : NEUTRAL;
  cache.set(genre, style);
  return style;
}
