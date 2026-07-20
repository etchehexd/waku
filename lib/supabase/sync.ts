"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseEnabled } from "./client";
import { useWaku, type CloudSnapshot } from "@/lib/store";

const TABLE = "user_data";

/**
 * Where the OAuth provider should send the user back to.
 *
 * Prefers an explicit `NEXT_PUBLIC_SITE_URL` (set this in prod so the return
 * URL is always your canonical domain, not whatever preview/origin the tab
 * happens to be on), and falls back to the live origin in dev. We return to the
 * exact page sign-in was launched from; `detectSessionInUrl` then lifts the
 * session out of the callback URL.
 *
 * NOTE: whatever this resolves to must be listed under Supabase →
 * Authentication → URL Configuration → "Redirect URLs". If it isn't, Supabase
 * ignores it and bounces the user to the dashboard's "Site URL" instead —
 * which is the classic "signing in sends me to an old version of the site".
 */
function authRedirectTo(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") || window.location.origin;
  return base + window.location.pathname;
}

/** Auth state + actions. No-ops gracefully when Supabase isn't configured. */
export function useWakuAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(isSupabaseEnabled);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Cloud sync isn’t configured." };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Cloud sync isn’t configured." };
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return { error: "Cloud sync isn’t configured." };
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: authRedirectTo(),
      },
    });
    return { error: error?.message };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    await supabase?.auth.signOut();
  }, []);

  return {
    enabled: isSupabaseEnabled,
    session,
    user: session?.user ?? null,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
  };
}

/** The store's factory-default profile identifiers (see store.ts DEFAULT_PROFILE). */
const DEFAULT_USERNAME = "waku_fan";
const DEFAULT_DISPLAY_NAME = "Waku Fan";

/**
 * Seed the local profile from the auth provider on first sign-in.
 *
 * Display name and username default to the email's local part (before the `@`),
 * and the avatar defaults to the provider's profile picture (Google). Only
 * fills a field that's still at its factory default (or empty avatar), so a
 * user who has personalised their profile — or whose cloud profile just merged
 * in — is never overwritten.
 */
function applyProviderDefaults(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const { profile, updateProfile } = useWaku.getState();
  const meta = user.user_metadata ?? {};
  const patch: { displayName?: string; username?: string; avatar?: string } = {};

  const email = user.email ?? (typeof meta.email === "string" ? meta.email : "");
  const local = email.split("@")[0]?.trim();

  const isDefaultProfile =
    profile.username === DEFAULT_USERNAME && profile.displayName === DEFAULT_DISPLAY_NAME;
  if (isDefaultProfile && local) {
    patch.displayName = local;
    // usernames stay handle-friendly: lowercase, no spaces
    patch.username = local.toLowerCase().replace(/[^a-z0-9_.-]+/g, "_").slice(0, 30);
  }

  const picture =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;
  if (!profile.avatar && picture) patch.avatar = picture;

  if (Object.keys(patch).length > 0) updateProfile(patch);
}

/**
 * Mount once (in Providers). Pulls the user's cloud data on sign-in, merges it
 * with local state, and pushes debounced snapshots on every subsequent change.
 */
export function useCloudSync() {
  const sessionUserId = useRef<string | null>(null);
  const [status, setStatus] = useState<"idle" | "syncing" | "synced" | "error">("idle");

  useEffect(() => {
    if (!isSupabaseEnabled) return;
    const supabase = getSupabase();
    if (!supabase) return;

    let pushTimer: ReturnType<typeof setTimeout> | undefined;
    let unsubStore: (() => void) | undefined;

    const push = async () => {
      const uid = sessionUserId.current;
      if (!uid) return;
      setStatus("syncing");
      const data = useWaku.getState().snapshot();
      const { error } = await supabase
        .from(TABLE)
        .upsert({ user_id: uid, data, updated_at: new Date().toISOString() });
      setStatus(error ? "error" : "synced");
    };

    const schedulePush = () => {
      if (!sessionUserId.current) return;
      clearTimeout(pushTimer);
      pushTimer = setTimeout(push, 1500);
    };

    const onSignedIn = async (user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> | null }) => {
      sessionUserId.current = user.id;
      setStatus("syncing");
      const { data, error } = await supabase
        .from(TABLE)
        .select("data")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!error && data?.data) {
        useWaku.getState().mergeRemote(data.data as CloudSnapshot);
      }
      // Seed a fresh profile from the provider (e.g. Google): name/username from
      // the email's local part, avatar from the provider picture. Only fills in
      // fields still at their defaults, so a customized/cloud profile is kept.
      applyProviderDefaults(user);
      // Push the merged result so the cloud reflects the union.
      await push();
      // Start syncing local changes from here on.
      unsubStore = useWaku.subscribe(schedulePush);
    };

    const onSignedOut = () => {
      sessionUserId.current = null;
      unsubStore?.();
      unsubStore = undefined;
      setStatus("idle");
    };

    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) onSignedIn(data.session.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" && s?.user && s.user.id !== sessionUserId.current) {
        onSignedIn(s.user);
      } else if (event === "SIGNED_OUT") {
        onSignedOut();
      }
    });

    return () => {
      clearTimeout(pushTimer);
      unsubStore?.();
      sub.subscription.unsubscribe();
    };
  }, []);

  return status;
}
