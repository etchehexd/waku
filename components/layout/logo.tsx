import { cn } from "@/lib/utils";

/**
 * Waku wordmark. The "W" is drawn as two soft valleys forming a subtle
 * smile, with a small four-point sparkle rising off the final stroke —
 * a nod to the shōjo "kirakira" sparkle and the joy of "waku waku".
 */
export function WakuMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      role="img"
      aria-label="Waku"
      fill="none"
    >
      <defs>
        <linearGradient id="waku-g" x1="6" y1="10" x2="42" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8fb4ff" />
          <stop offset="0.55" stopColor="#5b8cff" />
          <stop offset="1" stopColor="#2148e6" />
        </linearGradient>
        <linearGradient id="waku-spark" x1="34" y1="6" x2="44" y2="16" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#aee6ff" />
        </linearGradient>
      </defs>
      {/* Smiling W — two connected valleys */}
      <path
        d="M7 15
           C 7 15, 9 30, 15 33
           C 20 35.5, 23 27, 24 24
           C 25 27, 28 35.5, 33 33
           C 39 30, 41 15, 41 15"
        stroke="url(#waku-g)"
        strokeWidth="4.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* smile-cheek dots */}
      <circle cx="12.5" cy="19" r="1.5" fill="#aee6ff" opacity="0.9" />
      <circle cx="35.5" cy="19" r="1.5" fill="#aee6ff" opacity="0.9" />
      {/* sparkle */}
      <path
        d="M38.5 8 C38.9 10.4 39.6 11.1 42 11.5 C39.6 11.9 38.9 12.6 38.5 15 C38.1 12.6 37.4 11.9 35 11.5 C37.4 11.1 38.1 10.4 38.5 8 Z"
        fill="url(#waku-spark)"
      />
    </svg>
  );
}

export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <WakuMark
        className={cn(
          "drop-shadow-[0_2px_10px_rgba(54,103,255,0.5)] transition-all duration-300 motion-reduce:transition-none",
          compact ? "h-6 w-6" : "h-7 w-7",
        )}
      />
      <span
        className={cn(
          "font-display font-semibold tracking-tight text-gradient transition-all duration-300 motion-reduce:transition-none",
          compact ? "text-base" : "text-lg",
        )}
      >
        Waku
      </span>
    </span>
  );
}
