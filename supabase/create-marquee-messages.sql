-- ---------------------------------------------------------------------------
-- Marquee banner messages (shared Supabase master DB: jlqrbbqsuksncrxjcmbc)
--
-- Drives the animated "top banner" ticker. Messages are managed from
-- /AdminMarquee and read publicly via GET /api/marquee.
--
-- All reads/writes go through the service-role API, so no anon/authenticated
-- policies are required (the service role bypasses RLS).
-- ---------------------------------------------------------------------------

create table if not exists public.marquee_messages (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  link_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists marquee_messages_active_sort_idx
  on public.marquee_messages (active, sort_order, created_at);

alter table public.marquee_messages enable row level security;

-- Seed a few starter messages only when the table is empty, so re-running this
-- migration never duplicates rows.
insert into public.marquee_messages (message, sort_order)
select seed.message, seed.sort_order
from (
  values
    ('Welcome to Islam Media Central — media with purpose', 0),
    ('Live Quran radio is free, 24/7 — tap to listen', 1),
    ('New kids quizzes and rewards are live. Earn points today!', 2)
) as seed(message, sort_order)
where not exists (select 1 from public.marquee_messages);
