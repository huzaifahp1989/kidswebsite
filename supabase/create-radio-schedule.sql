-- ---------------------------------------------------------------------------
-- Live radio schedule (shared Supabase master DB: jlqrbbqsuksncrxjcmbc)
--
-- Powers the "Schedule" pop-up on the home-page radio bar. Managed from
-- /AdminRadioSchedule, served publicly by GET /api/radio-schedule.
--
-- All reads/writes go through the service-role API, so no anon/authenticated
-- policies are required (the service role bypasses RLS).
-- ---------------------------------------------------------------------------

create table if not exists public.radio_schedule (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  presenter text,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists radio_schedule_active_starts_idx
  on public.radio_schedule (active, starts_at);

alter table public.radio_schedule enable row level security;
