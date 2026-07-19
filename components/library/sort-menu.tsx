"use client";

import { useRef, useState } from "react";
import { ArrowDownUp, Check } from "lucide-react";
import { SORT_LABEL, SORT_ORDER, type LibrarySort } from "@/lib/library-prefs";
import { Popover, MenuCaption, menuItemCls } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Accessible sort dropdown for the library toolbar (portaled). */
export function SortMenu({
  value,
  onChange,
}: {
  value: LibrarySort;
  onChange: (s: LibrarySort) => void;
}) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          "flex h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium outline-none ring-1 ring-inset transition-colors focus-visible:ring-2 focus-visible:ring-waku-400",
          open
            ? "bg-white/[0.1] text-white ring-white/20"
            : "bg-white/[0.04] text-white/75 ring-white/10 hover:bg-white/[0.08] hover:text-white",
        )}
      >
        <ArrowDownUp className="h-4 w-4" />
        <span className="hidden max-w-[9rem] truncate sm:inline">{SORT_LABEL[value]}</span>
      </button>

      <Popover
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={btnRef}
        label="Sort library by"
        width={216}
        className="p-1.5"
      >
        <MenuCaption>Sort by</MenuCaption>
        {SORT_ORDER.map((s) => {
          const active = value === s;
          return (
            <button
              key={s}
              role="menuitemradio"
              aria-checked={active}
              onClick={() => {
                onChange(s);
                setOpen(false);
              }}
              className={menuItemCls(active)}
              style={active ? { background: "rgba(124,92,255,0.16)" } : undefined}
            >
              <span className="flex-1 text-left">{SORT_LABEL[s]}</span>
              {active && <Check className="h-3.5 w-3.5 text-iris-300" />}
            </button>
          );
        })}
      </Popover>
    </>
  );
}
