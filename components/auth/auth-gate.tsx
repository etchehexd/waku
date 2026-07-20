"use client";

import { Loader2 } from "lucide-react";
import { useWakuAuth } from "@/lib/supabase/sync";
import { useMounted } from "@/lib/use-mounted";
import { SignInView } from "./sign-in-view";

/**
 * Site-wide sign-in wall.
 *
 * When cloud auth is configured, the entire app is locked behind sign-in: until
 * a user is authenticated they see only the sign-in screen — no navbar, no
 * content. When Supabase isn't configured (e.g. local dev with no creds) the
 * app stays fully open so it remains usable offline.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const mounted = useMounted();
  const { enabled, user, loading } = useWakuAuth();

  // No cloud auth configured → nothing to gate.
  if (!enabled) return <>{children}</>;

  // Resolving the session — hold a quiet splash so we never flash content or
  // the sign-in screen at someone who's actually already signed in.
  if (!mounted || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  if (!user) return <SignInView />;

  return <>{children}</>;
}
