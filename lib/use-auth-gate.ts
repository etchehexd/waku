"use client";

import { useRouter } from "next/navigation";
import { useWakuAuth } from "@/lib/supabase/sync";

/**
 * Gate mutating actions (add to library, rate) behind sign-in.
 *
 * `gated` is true only when cloud auth is configured AND nobody is signed in —
 * so a deployment with no Supabase configured stays fully local/usable.
 * `guard(fn)` runs `fn` when allowed, otherwise sends the user to the sign-in
 * page (`/profile`, which is the sign-in screen while signed out).
 */
export function useAuthGate() {
  const { enabled, user } = useWakuAuth();
  const router = useRouter();
  const gated = enabled && !user;

  const guard = (fn: () => void) => {
    if (gated) {
      router.push("/profile");
      return;
    }
    fn();
  };

  return { gated, guard };
}
