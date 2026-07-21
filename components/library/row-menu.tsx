"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  MoreHorizontal,
  ExternalLink,
  Heart,
  Star,
  Lock,
  CheckCircle2,
  RotateCcw,
  Undo2,
  Trash2,
} from "lucide-react";
import { useWaku, isRateable, type LibraryEntry } from "@/lib/store";
import { entryTotal } from "@/lib/library-filters";
import { Popover, menuItemCls } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * The library row's "more actions" popover (portaled, so it always floats
 * above neighbouring rows). Deeper editing still lives on the detail page and
 * the global rating modal. Everything acts by media id.
 */
export function RowMenu({ entry }: { entry: LibraryEntry }) {
  const toggleFavorite = useWaku((s) => s.toggleFavorite);
  const requestRate = useWaku((s) => s.requestRate);
  const setStatusById = useWaku((s) => s.setStatusById);
  const incrementRewatch = useWaku((s) => s.incrementRewatch);
  const decrementRewatch = useWaku((s) => s.decrementRewatch);
  const removeEntry = useWaku((s) => s.removeEntry);

  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  const id = entry.media.id;
  const total = entryTotal(entry);
  const atTotal = total != null && entry.progress >= total;
  const canComplete = entry.status !== "COMPLETED" && entry.status !== "DROPPED";
  const canRate = isRateable(entry); // @see isRateable
  const close = () => setOpen(false);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`More actions for ${entry.media.title}`}
        className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 outline-none ring-1 ring-inset ring-white/12 transition-colors hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>

      <Popover
        open={open}
        onClose={close}
        anchorRef={btnRef}
        label={`Actions for ${entry.media.title}`}
        width={216}
        className="p-1.5"
      >
        <Link href={`/media/${id}`} role="menuitem" className={menuItemCls()}>
          <ExternalLink className="h-4 w-4 shrink-0 text-white/50" />
          Open details
        </Link>

        {canComplete && atTotal && (
          <button
            role="menuitem"
            onClick={() => {
              setStatusById(id, "COMPLETED");
              close();
            }}
            className={menuItemCls()}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2fb765]" />
            Mark completed
          </button>
        )}

        {canRate ? (
          <button
            role="menuitem"
            onClick={() => {
              requestRate(id);
              close();
            }}
            className={menuItemCls()}
          >
            <Star className="h-4 w-4 shrink-0 text-white/50" />
            {entry.score != null ? "Edit rating" : "Rate title"}
          </button>
        ) : (
          // Locked, not hidden: make the completion requirement explicit.
          <div
            className={cn(menuItemCls(), "cursor-not-allowed opacity-45")}
            aria-disabled="true"
            title="Finish the show to rate it"
          >
            <Lock className="h-4 w-4 shrink-0 text-white/40" />
            <span className="flex flex-col leading-tight">
              Rate title
              <span className="text-[10px] font-normal text-white/40">Finish it first</span>
            </span>
          </div>
        )}

        <button
          role="menuitem"
          onClick={() => {
            toggleFavorite(id);
            close();
          }}
          className={menuItemCls()}
        >
          <Heart
            className={cn("h-4 w-4 shrink-0", entry.favorite ? "fill-current text-[#ff5b8f]" : "text-white/50")}
          />
          {entry.favorite ? "Remove favorite" : "Add favorite"}
        </button>

        {entry.status === "COMPLETED" && (
          <button
            role="menuitem"
            onClick={() => {
              incrementRewatch(id);
              setStatusById(id, "REWATCHING");
              close();
            }}
            className={menuItemCls()}
          >
            <RotateCcw className="h-4 w-4 shrink-0 text-white/50" />
            Start rewatch
          </button>
        )}
        {entry.rewatches > 0 && (
          <button
            role="menuitem"
            onClick={() => {
              decrementRewatch(id);
              close();
            }}
            className={menuItemCls()}
          >
            <Undo2 className="h-4 w-4 shrink-0 text-white/50" />
            Undo rewatch
          </button>
        )}

        <div className="my-1 h-px bg-white/8" />
        <button
          role="menuitem"
          onClick={() => {
            removeEntry(id);
            close();
          }}
          className={menuItemCls(false, true)}
        >
          <Trash2 className="h-4 w-4 shrink-0" />
          Remove from library
        </button>
      </Popover>
    </>
  );
}
