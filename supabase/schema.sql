-- ─────────────────────────────────────────────────────────────
-- Waku · Supabase schema
-- Run this once in the Supabase SQL editor (Dashboard → SQL → New query).
-- ─────────────────────────────────────────────────────────────

-- One row per user holding their entire Waku dataset (library, ratings,
-- comparisons, profile) as JSON. Simple, private, and easy to sync.
create table if not exists public.user_data (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row-level security: each user can only read/write their own row.
alter table public.user_data enable row level security;

drop policy if exists "user_data owner access" on public.user_data;
create policy "user_data owner access"
  on public.user_data
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- After running this:
-- 1. Project Settings → API → copy the Project URL and anon public key.
-- 2. Put them in .env.local:
--      NEXT_PUBLIC_SUPABASE_URL=...
--      NEXT_PUBLIC_SUPABASE_ANON_KEY=...
-- 3. (Optional) Authentication → Providers → Email: turn off "Confirm email"
--    for instant sign-in during development.
-- ─────────────────────────────────────────────────────────────
