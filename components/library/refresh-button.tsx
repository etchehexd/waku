"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw, Check, AlertTriangle, X } from "lucide-react";
import { useWaku, type LibraryEntry, type MediaMetadataPatch } from "@/lib/store";
import { Popover } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * Which library titles are worth re-fetching. Finished titles almost never
 * change their episode/chapter totals, so we refresh only releasing,
 * unreleased, hiatus, or status-unknown entries. "Unknown" covers legacy
 * snapshots saved before we stored `mediaStatus`, so the first refresh
 * backfills everything and later refreshes stay cheap.
 */
function eligibleIds(entries: LibraryEntry[]): number[] {
  return entries
    .filter((e) => {
      const s = e.media.mediaStatus;
      return s == null || s === "RELEASING" || s === "NOT_YET_RELEASED" || s === "HIATUS";
    })
    .map((e) => e.media.id);
}

interface RefreshSummary {
  ok: boolean;
  message: string;
  detail?: string;
}

interface RefreshResponse {
  patches: MediaMetadataPatch[];
  requested: number;
  matched: number;
  failedChunks: number;
  totalChunks: number;
  error?: string;
}

export function RefreshButton({ entries }: { entries: LibraryEntry[] }) {
  const mergeMediaMetadata = useWaku((s) => s.mergeMediaMetadata);
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<RefreshSummary | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const showSummary = (s: RefreshSummary, autoHideMs = 7000) => {
    setSummary(s);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setSummary(null), autoHideMs);
  };

  const refresh = async () => {
    if (busy) return;
    const ids = eligibleIds(entries);
    if (ids.length === 0) {
      showSummary({ ok: true, message: "Everything looks up to date.", detail: "No releasing titles needed a refresh." });
      return;
    }
    setBusy(true);
    setSummary(null);
    try {
      const res = await fetch("/api/library/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      const data: RefreshResponse = await res.json().catch(() => ({}) as RefreshResponse);
      if (!res.ok) throw new Error(data?.error || "Refresh failed.");

      const changed = mergeMediaMetadata(data.patches ?? []);
      const partial = (data.failedChunks ?? 0) > 0;
      showSummary({
        ok: !partial,
        message: partial
          ? `Refreshed ${changed} title${changed === 1 ? "" : "s"} — some updates failed.`
          : `Refreshed ${changed} title${changed === 1 ? "" : "s"}.`,
        detail: partial
          ? `${data.failedChunks} of ${data.totalChunks} batches couldn't be reached. Try again shortly.`
          : `Checked ${ids.length} releasing or unverified title${ids.length === 1 ? "" : "s"}; totals, status, and covers are current.`,
      });
    } catch (err) {
      showSummary(
        {
          ok: false,
          message: "Couldn't refresh metadata.",
          detail: err instanceof Error ? err.message : "Please try again in a moment.",
        },
        9000,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={refresh}
        disabled={busy}
        aria-label="Refresh library metadata"
        aria-busy={busy}
        className="flex h-9 items-center gap-2 rounded-full bg-white/[0.04] px-3 text-[13px] font-medium text-white/75 outline-none ring-1 ring-inset ring-white/10 transition-colors hover:bg-white/[0.08] hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400 disabled:opacity-70"
      >
        <RefreshCw className={cn("h-4 w-4", busy && "animate-spin motion-reduce:animate-none")} />
        <span className="hidden sm:inline">{busy ? "Refreshing…" : "Refresh"}</span>
      </button>

      <Popover
        open={!!summary}
        onClose={() => setSummary(null)}
        anchorRef={btnRef}
        label="Refresh result"
        role="status"
        width={320}
        className="p-3.5"
      >
        {summary && (
          <div className="flex items-start gap-2.5" aria-live="polite">
            <span
              className={cn(
                "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                summary.ok ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300",
              )}
            >
              {summary.ok ? <Check className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white">{summary.message}</p>
              {summary.detail && <p className="mt-0.5 text-xs leading-relaxed text-white/55">{summary.detail}</p>}
            </div>
            <button
              type="button"
              onClick={() => setSummary(null)}
              aria-label="Dismiss"
              className="rounded-full p-1 text-white/40 outline-none transition-colors hover:text-white focus-visible:ring-2 focus-visible:ring-waku-400"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </Popover>
    </>
  );
}
