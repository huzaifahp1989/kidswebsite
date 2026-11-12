-- Fix migration: add missing columns to the existing reminders table
-- This is safe to run on an already-created table (idempotent column adds).
-- Run this in the Supabase SQL Editor.

-- ============================================================
-- 0. Legacy columns shared with another app — relax constraints
-- public.reminders is shared with another app that created it with a
-- NOT NULL "due_date" column and NO default. This app never sets
-- due_date, so inserts fail with 23502 (null value in column "due_date").
-- Dropping NOT NULL is safe: the other app always supplies due_date,
-- and this app relies on next_occurrence_at instead.
-- ============================================================
do $$
begin
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='due_date') then
    alter table public.reminders alter column due_date drop not null;
  end if;
  if exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='is_done') then
    alter table public.reminders alter column is_done set default false;
  end if;
end $$;

-- ============================================================
-- 1. reminders table — add missing columns
-- ============================================================
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='category') then
    alter table public.reminders add column category text not null default 'custom';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='title') then
    alter table public.reminders add column title text not null default '';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='message') then
    alter table public.reminders add column message text not null default '';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='reminder_time') then
    alter table public.reminders add column reminder_time time;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='time_zone') then
    alter table public.reminders add column time_zone text not null default 'UTC';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='days_of_week') then
    alter table public.reminders add column days_of_week int[] default null;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='enabled') then
    alter table public.reminders add column enabled boolean not null default true;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='next_occurrence_at') then
    alter table public.reminders add column next_occurrence_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='last_sent_at') then
    alter table public.reminders add column last_sent_at timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='last_sent_occurrence') then
    alter table public.reminders add column last_sent_occurrence timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='prayer_name') then
    alter table public.reminders add column prayer_name text;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='minutes_before') then
    alter table public.reminders add column minutes_before int default 10;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='prayer_times') then
    alter table public.reminders add column prayer_times jsonb;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='location_lat') then
    alter table public.reminders add column location_lat numeric;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='location_lng') then
    alter table public.reminders add column location_lng numeric;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='calculation_method') then
    alter table public.reminders add column calculation_method int;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='dispatch_lease_until') then
    alter table public.reminders add column dispatch_lease_until timestamptz;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='created_at') then
    alter table public.reminders add column created_at timestamptz not null default now();
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminders' and column_name='updated_at') then
    alter table public.reminders add column updated_at timestamptz not null default now();
  end if;
end $$;

-- ============================================================
-- 2. Re-apply indexes (if not exists)
-- ============================================================
create index if not exists reminders_due_idx
  on public.reminders (next_occurrence_at)
  where enabled = true;

create index if not exists reminders_user_enabled_idx
  on public.reminders (user_id, enabled);

-- ============================================================
-- 3. Re-apply updated_at trigger
-- ============================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists reminders_set_updated_at on public.reminders;
create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

-- ============================================================
-- 4. Re-apply RLS policies (drop + recreate to be safe)
-- ============================================================
alter table public.reminders enable row level security;

-- Support both signed-in users and anonymous (onesignal_id) reminders.
grant select, insert, update, delete on public.reminders to anon, authenticated;

drop policy if exists "reminders select own" on public.reminders;
create policy "reminders select own" on public.reminders
  for select using (auth.uid() = user_id or user_id is null);

drop policy if exists "reminders insert own" on public.reminders;
create policy "reminders insert own" on public.reminders
  for insert with check (auth.uid() = user_id or user_id is null);

drop policy if exists "reminders update own" on public.reminders;
create policy "reminders update own" on public.reminders
  for update using (auth.uid() = user_id or user_id is null)
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "reminders delete own" on public.reminders;
create policy "reminders delete own" on public.reminders
  for delete using (auth.uid() = user_id or user_id is null);

-- ============================================================
-- 5. reminder_delivery_log — add missing columns if table exists
-- ============================================================
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='reminder_delivery_log') then
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminder_delivery_log' and column_name='reminder_id') then
      alter table public.reminder_delivery_log add column reminder_id uuid not null references public.reminders(id) on delete cascade;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminder_delivery_log' and column_name='user_id') then
      alter table public.reminder_delivery_log add column user_id uuid not null references auth.users(id) on delete cascade;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminder_delivery_log' and column_name='scheduled_occurrence') then
      alter table public.reminder_delivery_log add column scheduled_occurrence timestamptz not null;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminder_delivery_log' and column_name='onesignal_notification_id') then
      alter table public.reminder_delivery_log add column onesignal_notification_id text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminder_delivery_log' and column_name='delivery_status') then
      alter table public.reminder_delivery_log add column delivery_status text not null default 'pending';
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminder_delivery_log' and column_name='error_details') then
      alter table public.reminder_delivery_log add column error_details text;
    end if;
    if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='reminder_delivery_log' and column_name='created_at') then
      alter table public.reminder_delivery_log add column created_at timestamptz not null default now();
    end if;
  end if;
end $$;

-- Create reminder_delivery_log if it does not exist yet
create table if not exists public.reminder_delivery_log (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_occurrence timestamptz not null,
  onesignal_notification_id text,
  delivery_status text not null default 'pending',
  error_details text,
  created_at timestamptz not null default now(),
  unique (reminder_id, scheduled_occurrence)
);

create index if not exists reminder_delivery_log_user_status_idx
  on public.reminder_delivery_log (user_id, delivery_status, created_at desc);

alter table public.reminder_delivery_log enable row level security;

drop policy if exists "reminder_delivery_log select own" on public.reminder_delivery_log;
create policy "reminder_delivery_log select own" on public.reminder_delivery_log
  for select using (auth.uid() = user_id);

-- Verify columns now exist
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'reminders'
order by ordinal_position;
