"use client";

import { useEffect } from "react";
import { useTheme } from "@/lib/theme";

/**
 * Keeps <html data-palette> in sync with the persisted theme choice while the
 * app is running (the inline script in the root layout handles the very first
 * paint to avoid a flash of the default palette). Renders nothing.
 */
export function ThemeApplier() {
  const palette = useTheme((s) => s.palette);
  useEffect(() => {
    document.documentElement.dataset.palette = palette;
  }, [palette]);
  return null;
}
