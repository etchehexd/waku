"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Portal-based popover — the one way floating menus are positioned in Waku.
 *
 * Why a portal is load-bearing here, not a nicety: every `.glass` surface
 * carries `backdrop-filter`, and backdrop-filter forces a stacking context.
 * A menu absolutely-positioned INSIDE one glass card therefore paints inside
 * that card's context and can never rise above a later sibling card,
 * whatever its z-index. Rendering into `document.body` puts menus in the
 * root stacking context where `z-index` means what it says — nothing on the
 * page can sit on top of them except other portaled overlays.
 *
 * Positioning is viewport-aware: the panel drops below its anchor, flips
 * above when there's no room, clamps horizontally with an 8px gutter, and
 * follows the anchor on scroll/resize. Escape and outside-pointerdown close;
 * focus moves into the panel on open and returns to the anchor on close;
 * ArrowUp/Down cycle through the panel's menu items.
 */
export function Popover({
  open,
  onClose,
  anchorRef,
  label,
  align = "end",
  width = 208,
  role = "menu",
  className,
  children,
}: {
  open: boolean;
  onClose: () => void;
  /** The trigger the panel is anchored to (and where focus returns). */
  anchorRef: RefObject<HTMLElement | null>;
  label: string;
  align?: "start" | "end";
  /** Panel width in px (viewport-clamped). */
  width?: number;
  role?: "menu" | "dialog" | "status";
  className?: string;
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const [mounted, setMounted] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => setMounted(true), []);

  const place = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const r = anchor.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = Math.min(width, vw - 16);
    const panelH = panelRef.current?.offsetHeight ?? 240;

    let left = align === "end" ? r.right - w : r.left;
    left = Math.max(8, Math.min(left, vw - w - 8));

    // Below by default; flip above when the panel would spill past the fold
    // and there is more headroom above.
    const below = r.bottom + 6;
    const up = below + panelH > vh - 8 && r.top - panelH - 6 > 8;
    const top = up ? r.top - panelH - 6 : below;

    setPos({ top, left, up });
  }, [anchorRef, align, width]);

  // Measure + place synchronously after the panel renders (avoids a flash at 0,0).
  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  // Track the anchor while open.
  useEffect(() => {
    if (!open) return;
    const onMove = () => place();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open, place]);

  // Dismissal + focus management.
  useEffect(() => {
    if (!open) return;
    const anchor = anchorRef.current;

    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!panelRef.current?.contains(t) && !anchor?.contains(t)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
        anchor?.focus();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = Array.from(
          panelRef.current?.querySelectorAll<HTMLElement>(
            '[role^="menuitem"], a[href], button:not([disabled])',
          ) ?? [],
        );
        if (items.length === 0) return;
        e.preventDefault();
        const i = items.indexOf(document.activeElement as HTMLElement);
        const next =
          e.key === "ArrowDown"
            ? items[(i + 1) % items.length]
            : items[(i - 1 + items.length) % items.length];
        next.focus();
      }
    };

    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    // Move focus in so keyboard users land inside the menu they just opened.
    const t = setTimeout(() => panelRef.current?.focus(), 30);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onClose, anchorRef]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={panelRef}
          role={role}
          aria-label={label}
          tabIndex={-1}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: pos?.up ? 6 : -6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: pos?.up ? 4 : -4, scale: 0.98 }}
          transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed",
            top: pos?.top ?? -9999,
            left: pos?.left ?? -9999,
            width: Math.min(width, typeof window !== "undefined" ? window.innerWidth - 16 : width),
            zIndex: 90,
          }}
          className={cn(
            "glass-menu max-h-[min(26rem,calc(100vh-2rem))] overflow-y-auto overscroll-contain rounded-2xl outline-none",
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** Standard menu item styling shared by every popover menu. */
export function menuItemCls(active?: boolean, danger?: boolean) {
  return cn(
    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium outline-none transition-colors focus-visible:bg-white/10",
    danger
      ? "text-rose-300/90 hover:bg-rose-500/15 hover:text-rose-200"
      : active
        ? "text-white"
        : "text-white/70 hover:bg-white/10 hover:text-white",
  );
}

/** Muted section caption used at the top of popover menus. */
export function MenuCaption({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
      {children}
    </p>
  );
}
