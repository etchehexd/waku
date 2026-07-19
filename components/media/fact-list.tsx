import { cn } from "@/lib/utils";

export interface Fact {
  label: string;
  value: React.ReactNode;
}

/**
 * Definition list for a title's hard facts. A real <dl> so the label/value
 * relationship survives for screen readers, laid out as a responsive grid.
 */
export function FactList({ facts, className }: { facts: Fact[]; className?: string }) {
  const shown = facts.filter((f) => f.value != null && f.value !== "");
  if (shown.length === 0) return null;

  return (
    <dl className={cn("grid grid-cols-2 gap-x-4 gap-y-3.5 sm:grid-cols-3 lg:grid-cols-1", className)}>
      {shown.map((f) => (
        <div key={f.label} className="min-w-0">
          <dt className="text-[11px] font-medium uppercase tracking-wider text-white/35">{f.label}</dt>
          <dd className="mt-0.5 text-sm font-medium text-white/85 [overflow-wrap:anywhere]">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
