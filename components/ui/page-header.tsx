import { cn } from "@/lib/utils";

/**
 * The one page-heading pattern for the app: an accent-tinted icon plate, a
 * strong display title, and an optional trailing slot for page-level actions.
 *
 * There is deliberately no subtitle slot. Decorative taglines under a heading
 * ("Your personal leaderboard", "Find your next favorite") repeat what the
 * title and page already say and push real content down. Where a page has
 * genuinely useful context (a live count, for instance) it belongs in `meta`,
 * inline beside the title, not stacked beneath it.
 */
export function PageHeader({
  icon,
  title,
  meta,
  actions,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  /** Short, factual context shown inline beside the title (e.g. "24 titles"). */
  meta?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-5 flex flex-wrap items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-iris-500/15 text-iris-300 ring-1 ring-inset ring-iris-400/25">
            {icon}
          </span>
        )}
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="font-display text-3xl font-bold tracking-tight text-white">{title}</h1>
          {meta && (
            <span className="text-sm font-medium tabular-nums text-white/45">{meta}</span>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
