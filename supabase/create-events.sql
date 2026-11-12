-- ---------------------------------------------------------------------------
-- Events (shared Supabase master DB: jlqrbbqsuksncrxjcmbc)
--
-- Powers the "Latest updates" strip at the top of every page and the public
-- /updates page. Managed from /AdminEvents, served publicly by GET /api/events.
--
-- All reads/writes go through the service-role API, so no anon/authenticated
-- policies are required (the service role bypasses RLS).
-- ---------------------------------------------------------------------------

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  link_url text,
  image_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_active_starts_idx
  on public.events (active, starts_at);

alter table public.events enable row level security;
