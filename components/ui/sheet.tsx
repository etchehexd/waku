"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Reusable modal sheet: a bottom sheet on mobile, a centered dialog on larger
 * screens. Handles the backdrop, Escape, body-scroll locking, the safe-area
 * inset and a sticky header/footer so long content scrolls between them.
 */
export function Sheet({
  open,
  onClose,
  label,
  header,
  footer,
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the dialog. */
  label: string;
  /** Pinned header content (rendered above the scroll area). */
  header?: React.ReactNode;
  /** Pinned footer content (rendered below the scroll area). */
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  // Portal target. The sheet is `position: fixed`, but if ANY ancestor has a
  // backdrop-filter/filter/transform (every `.glass` surface does) that
  // ancestor becomes the containing block AND its `overflow: hidden` clips the
  // sheet. Rendering into <body> escapes that entirely, so a sheet opened from
  // inside a glass panel is never cut off or trapped behind it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    // Prevent the page behind the sheet from scrolling under it.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-label={label}
        >
          <div className="absolute inset-0 bg-abyss-950/75 backdrop-blur-sm" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 48, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 360, damping: 34 }}
            className={cn(
              "glass-menu relative z-10 flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-4xl sm:max-h-[88vh] sm:rounded-4xl",
              className,
            )}
          >
            {/* grab handle — mobile affordance that this is a sheet */}
            <div className="flex shrink-0 justify-center pt-2.5 sm:hidden">
              <span className="h-1 w-9 rounded-full bg-white/20" aria-hidden />
            </div>

            {header && <div className="shrink-0">{header}</div>}

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>

            {footer && (
              <div className="shrink-0 border-t border-white/8 bg-white/[0.03] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                {footer}
              </div>
            )}

            <button
              onClick={onClose}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-abyss-950/50 text-white/60 outline-none backdrop-blur-md transition-colors hover:bg-abyss-950/80 hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** A labelled group of related controls inside a sheet. */
export function SheetSection({
  title,
  hint,
  children,
  className,
}: {
  title?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("px-5 py-4", className)}>
      {title && (
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-white/45">{title}</h3>
          {hint && <span className="text-[11px] tabular-nums text-white/40">{hint}</span>}
        </div>
      )}
      {children}
    </section>
  );
}
