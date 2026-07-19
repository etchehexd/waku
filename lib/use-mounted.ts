"use client";

import { useEffect, useState } from "react";

/**
 * Returns true only after the component has mounted on the client.
 * Used to gate persisted-store reads so SSR markup matches the first paint
 * (avoids hydration mismatches with localStorage-backed Zustand state).
 */
export function useMounted() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
