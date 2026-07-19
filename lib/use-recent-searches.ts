"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "waku-recent-searches";
const CAP = 8;

/**
 * Local-only recent search terms (never synced to the cloud, no sensitive
 * data). Capped, de-duplicated, individually removable, and clearable.
 */
export function useRecentSearches() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setRecent(parsed.filter((x): x is string => typeof x === "string"));
      }
    } catch {
      /* ignore malformed storage */
    }
  }, []);

  const write = (next: string[]) => {
    setRecent(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full / unavailable — recent list is best-effort */
    }
  };

  const add = useCallback((q: string) => {
    const term = q.trim();
    if (term.length < 2) return;
    setRecent((prev) => {
      const next = [term, ...prev.filter((x) => x.toLowerCase() !== term.toLowerCase())].slice(0, CAP);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* best-effort */
      }
      return next;
    });
  }, []);

  const remove = useCallback((q: string) => {
    setRecent((prev) => {
      const next = prev.filter((x) => x !== q);
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* best-effort */
      }
      return next;
    });
  }, []);

  const clear = useCallback(() => write([]), []);

  return { recent, add, remove, clear };
}
