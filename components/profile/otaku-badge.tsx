"use client";

import { cn } from "@/lib/utils";
import type { OtakuRank } from "@/lib/otaku";

type BadgeSize = "xs" | "sm" | "md" | "lg" | "xl";

const DIM: Record<BadgeSize, { box: number; icon: number; radius: string }> = {
  xs: { box: 20, icon: 12, radius: "rounded-md" },
  sm: { box: 26, icon: 15, radius: "rounded-lg" },
  md: { box: 40, icon: 22, radius: "rounded-xl" },
  lg: { box: 60, icon: 32, radius: "rounded-2xl" },
  xl: { box: 84, icon: 44, radius: "rounded-[1.25rem]" },
};

/**
 * A rank's emblem rendered as a gradient medallion — the "logo" for each Otaku
 * rank. A rounded gem-cut plate with the rank's icon, a specular highlight, and
 * a tinted outer ring. `locked` renders it as a dim, desaturated silhouette for
 * ranks not yet reached.
 */
export function OtakuBadge({
  rank,
  size = "md",
  locked = false,
  glow = false,
  className,
}: {
  rank: OtakuRank;
  size?: BadgeSize;
  locked?: boolean;
  glow?: boolean;
  className?: string;
}) {
  const dim = DIM[size];
  const Icon = rank.icon;

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", dim.radius, className)}
      style={{
        width: dim.box,
        height: dim.box,
        background: locked
          ? "rgba(255,255,255,0.05)"
          : `linear-gradient(145deg, ${rank.from} 0%, ${rank.to} 100%)`,
        boxShadow: locked
          ? "inset 0 0 0 1px rgba(255,255,255,0.08)"
          : `inset 0 1px 0 rgba(255,255,255,0.5), inset 0 0 0 1px ${rank.to}, 0 4px 12px -4px ${rank.to}${glow ? "cc" : "55"}${glow ? `, 0 0 22px -2px ${rank.accent}88` : ""}`,
      }}
      aria-hidden
    >
      {/* specular sheen */}
      {!locked && (
        <span
          className={cn("pointer-events-none absolute inset-0", dim.radius)}
          style={{
            background:
              "linear-gradient(150deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 42%, rgba(255,255,255,0) 60%)",
          }}
        />
      )}
      <Icon
        style={{ width: dim.icon, height: dim.icon }}
        className={cn("relative", locked ? "text-white/25" : "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]")}
        strokeWidth={2.25}
      />
    </span>
  );
}

/**
 * The rank emblem + name as one inline lockup — used next to a user's display
 * name in place of any "Otaku Newcomer" text.
 */
export function OtakuNameplate({
  rank,
  level,
  size = "sm",
  className,
}: {
  rank: OtakuRank;
  level?: number;
  size?: BadgeSize;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5",
        className,
      )}
      style={{ background: `${rank.to}1f`, boxShadow: `inset 0 0 0 1px ${rank.to}55` }}
      title={`Otaku rank: ${rank.name}${level ? ` · Level ${level}` : ""}`}
    >
      <OtakuBadge rank={rank} size={size} />
      <span className="text-xs font-bold tracking-tight" style={{ color: rank.from }}>
        {rank.name}
      </span>
    </span>
  );
}
