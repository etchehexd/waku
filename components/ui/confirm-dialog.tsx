"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Button } from "./button";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** Supporting copy explaining the consequence of confirming. */
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Style the confirm action as destructive. */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Small, accessible confirmation dialog for consequential actions.
 * Traps nothing heavier than it needs to: it labels itself, closes on Escape
 * or backdrop click, and moves focus to the cancel (safe) action on open.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  // Portal to <body> so a glass ancestor's overflow/containing-block never
  // clips this fixed dialog (see the same note in Sheet).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    // Focus the safe action, not the destructive one.
    const t = setTimeout(() => cancelRef.current?.focus(), 60);
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [open, onCancel]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby={description ? "confirm-desc" : undefined}
        >
          <div className="absolute inset-0 bg-abyss-950/75 backdrop-blur-sm" onClick={onCancel} />

          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            className="glass-menu relative z-10 w-full max-w-sm rounded-t-4xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:rounded-4xl"
          >
            <div className="flex gap-3.5">
              <span
                className={cn(
                  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                  destructive ? "bg-rose-500/15 text-rose-300" : "bg-waku-500/20 text-waku-cinematic",
                )}
              >
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="confirm-title" className="font-display text-base font-semibold text-white">
                  {title}
                </h2>
                {description && (
                  <p id="confirm-desc" className="mt-1.5 text-sm leading-relaxed text-white/60">
                    {description}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button ref={cancelRef} variant="glass" size="md" onClick={onCancel} disabled={busy}>
                {cancelLabel}
              </Button>
              <Button
                variant={destructive ? "danger" : "primary"}
                size="md"
                onClick={onConfirm}
                disabled={busy}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
