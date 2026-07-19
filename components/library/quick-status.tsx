"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useWaku, STATUS_LABEL, STATUS_ORDER, type LibraryEntry } from "@/lib/store";
import { STATUS_META } from "@/components/media/status-meta";
import { Popover, MenuCaption, menuItemCls } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Compact status control for a library entry: a pill showing the current
 * status that opens a portaled popover to switch it. Operates purely by id
 * via `setStatusById`, preserving the completion → rating and rewatch
 * conventions.
 */
export function QuickStatus({
  entry,
  variant = "pill",
}: {
  entry: LibraryEntry;
  variant?: "pill" | "dot";
}) {
  const setStatusById = useWaku((s) => s.setStatusById);
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const meta = STATUS_META[entry.status];
  const Icon = meta.icon;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Status: ${STATUS_LABEL[entry.status]} — change`}
        className={cn(
          "flex items-center gap-1.5 rounded-full outline-none transition-all hover:brightness-110 focus-visible:ring-2 focus-visible:ring-waku-400",
          variant === "pill"
            ? "h-8 px-2.5 text-xs font-medium ring-1 ring-inset"
            : "h-8 w-8 justify-center ring-1 ring-inset",
        )}
        style={{
          background: meta.soft,
          color: meta.color,
          boxShadow: `inset 0 0 0 1px ${meta.color}55`,
        }}
      >
        <Icon className="h-4 w-4 shrink-0" />
        {variant === "pill" && (
          <>
            <span className="hidden sm:inline">{STATUS_LABEL[entry.status]}</span>
            <ChevronDown className={cn("h-3 w-3 opacity-70 transition-transform", open && "rotate-180")} />
          </>
        )}
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={btnRef}
        label={`Set status for ${entry.media.title}`}
        width={192}
        className="p-1.5"
      >
        <MenuCaption>Move to</MenuCaption>
        {STATUS_ORDER.map((s) => {
          const m = STATUS_META[s];
          const MIcon = m.icon;
          const active = entry.status === s;
          return (
            <button
              key={s}
              role="menuitemradio"
              aria-checked={active}
              onClick={() => {
                setStatusById(entry.media.id, s);
                setOpen(false);
              }}
              className={menuItemCls(active)}
              style={active ? { background: m.soft } : undefined}
            >
              <MIcon className="h-4 w-4 shrink-0" style={{ color: m.color }} />
              <span className="flex-1 text-left">{STATUS_LABEL[s]}</span>
              {active && <Check className="h-3.5 w-3.5 text-white/80" />}
            </button>
          );
        })}
      </Popover>
    </>
  );
}
