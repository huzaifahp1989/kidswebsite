-- ---------------------------------------------------------------------------
-- App user profiles (shared Supabase master DB: jlqrbbqsuksncrxjcmbc)
--
-- Collects the "get to know our users" details from the in-app prompt and the
-- /get-to-know-you page: full name, age, city and how they heard about the app.
--
-- All reads/writes go through the service-role API (api/app-users.js), so RLS is
-- enabled with NO anon/authenticated policies: participants and the public can
-- never read other people's details directly.
--
-- Safe to re-run.
-- ---------------------------------------------------------------------------

create table if not exists public.app_user_profiles (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  age integer,
  city text not null,
  heard_about text,
  source text not null default 'app-prompt',
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists app_user_profiles_created_idx
  on public.app_user_profiles (created_at desc);

alter table public.app_user_profiles enable row level security;

revoke all on public.app_user_profiles from anon, authenticated;
