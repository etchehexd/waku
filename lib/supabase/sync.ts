"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSupabase, isSupabaseEnabled } from "./client";
import { useWaku, type CloudSnapshot } from "@/lib/store";

const TABLE = "user_data";

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
        // Return to wherever the user launched sign-in from; the client's
        // `detectSessionInUrl` picks the session out of the callback URL.
        redirectTo: typeof window !== "undefined" ? window.location.origin + window.location.pathname : undefined,
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

    const onSignedIn = async (uid: string) => {
      sessionUserId.current = uid;
      setStatus("syncing");
      const { data, error } = await supabase
        .from(TABLE)
        .select("data")
        .eq("user_id", uid)
        .maybeSingle();
      if (!error && data?.data) {
        useWaku.getState().mergeRemote(data.data as CloudSnapshot);
      }
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
      if (data.session?.user) onSignedIn(data.session.user.id);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === "SIGNED_IN" && s?.user && s.user.id !== sessionUserId.current) {
        onSignedIn(s.user.id);
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
