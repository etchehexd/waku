import Link from "next/link";
import { genreStyle } from "@/lib/genre-style";
import { cn } from "@/lib/utils";

type GenreTagSize = "xs" | "sm" | "md";

const SIZE: Record<GenreTagSize, string> = {
  xs: "px-2 py-0.5 text-[10px]",
  sm: "px-2.5 py-0.5 text-[11px]",
  md: "px-3 py-1 text-xs",
};

/**
 * The single, color-coded genre chip used everywhere a genre is shown — hero,
 * detail page, cards. Each genre draws its hue from the shared {@link genreStyle}
 * system so the same genre reads the same color across the whole app.
 *
 * Pass `href` to make it a filter link (detail page / hero); leave it off for a
 * purely decorative label (cards, dense strips).
 */
export function GenreTag({
  genre,
  size = "sm",
  href,
  className,
}: {
  genre: string;
  size?: GenreTagSize;
  href?: string;
  className?: string;
}) {
  const gs = genreStyle(genre);
  const base = cn(
    "inline-flex max-w-full items-center truncate rounded-full border font-medium leading-none backdrop-blur-md",
    SIZE[size],
    className,
  );
  const style = { background: gs.bg, borderColor: gs.border, color: gs.text };

  if (href) {
    return (
      <Link
        href={href}
        style={style}
        className={cn(
          base,
          "outline-none transition-[filter,transform] hover:brightness-125 focus-visible:ring-2 focus-visible:ring-white/50",
        )}
      >
        {genre}
      </Link>
    );
  }

  return (
    <span style={style} className={base}>
      {genre}
    </span>
  );
}

/**
 * A tiny genre dot + label, for the most space-constrained spots (poster card
 * hover, list rows). Keeps the genre's color identity without a full chip.
 */
export function GenreDot({ genre, className }: { genre: string; className?: string }) {
  const gs = genreStyle(genre);
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-1", className)}>
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ background: gs.accent, boxShadow: `0 0 6px ${gs.accent}` }}
      />
      <span className="truncate" style={{ color: gs.text }}>
        {genre}
      </span>
    </span>
  );
}
