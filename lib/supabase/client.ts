"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Whether cloud sync is configured. When false, Waku runs on localStorage only. */
export const isSupabaseEnabled = Boolean(url && anonKey);

let _client: SupabaseClient | null = null;

/** Lazily-created singleton browser client. Returns null when unconfigured. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseEnabled) return null;
  if (!_client) {
    _client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "waku-auth",
      },
    });
  }
  return _client;
}
