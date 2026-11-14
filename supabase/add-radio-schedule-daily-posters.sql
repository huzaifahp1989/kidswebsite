-- ---------------------------------------------------------------------------
-- Repeating daily programmes, posters and a "coming soon" marker for the live
-- radio schedule (shared Supabase master DB: jlqrbbqsuksncrxjcmbc)
--
-- Run this after supabase/create-radio-schedule.sql.
--
-- A row is either:
--   * a repeating programme — repeat_daily = true, defined by start_time/end_time
--     (a plain time of day, station clock) and shown every day, or
--   * a one-off programme — repeat_daily = false, defined by starts_at/ends_at.
-- ---------------------------------------------------------------------------

alter table public.radio_schedule
  add column if not exists poster_url text,
  add column if not exists repeat_daily boolean not null default false,
  add column if not exists start_time time,
  add column if not exists end_time time,
  add column if not exists coming_soon boolean not null default false;

-- Repeating programmes have no date, so the start timestamp must be optional.
alter table public.radio_schedule alter column starts_at drop not null;

create index if not exists radio_schedule_daily_idx
  on public.radio_schedule (repeat_daily, start_time);
