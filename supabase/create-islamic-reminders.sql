-- Islamic Reminders & Push Notifications
-- Tables: public.reminders, public.reminder_delivery_log
-- Scheduler: pg_cron every minute -> Supabase Edge Function "reminder-dispatch"
--
-- Before running:
--   1. Deploy the Edge Function:  supabase functions deploy reminder-dispatch --no-verify-jwt
--   2. Set the same REMINDER_CRON_SECRET value as both:
--        - a Supabase secret: supabase secrets set REMINDER_CRON_SECRET=...
--        - the vault secret "islamic_reminder_cron_secret" below (replace marker).
--   3. Verify the Edge Function URL matches your project ref.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;
create extension if not exists pgcrypto;

-- ============================================================
-- 1. reminders table
-- ============================================================
create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,                       -- daily_islamic | morning_adhkar | evening_adhkar | quran_reading | hifz_revision | salah | friday | events_competitions | new_content | custom
  title text not null default '',
  message text not null default '',
  reminder_time time,                           -- HH:MM in user's local tz (null for salah, computed from prayer_times)
  time_zone text not null default 'UTC',
  days_of_week int[] default null,              -- 0=Sun..6=Sat; null = every day
  enabled boolean not null default true,
  next_occurrence_at timestamptz,
  last_sent_at timestamptz,
  last_sent_occurrence timestamptz,             -- dedup: the scheduled occurrence we last sent
  prayer_name text,                             -- salah only: fajr|dhuhr|asr|maghrib|isha
  minutes_before int default 10,                -- salah only: minutes before prayer
  prayer_times jsonb,                           -- { "YYYY-MM-DD": { "fajr":"05:12", ... }, ... }
  location_lat numeric,
  location_lng numeric,
  calculation_method int,                       -- Aladhan method id (3 = MWL default)
  dispatch_lease_until timestamptz,             -- atomic claim lock (~2 min)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminders_due_idx
  on public.reminders (next_occurrence_at)
  where enabled = true;

create index if not exists reminders_user_enabled_idx
  on public.reminders (user_id, enabled);

-- ============================================================
-- 2. reminder_delivery_log table (deduplicated per occurrence)
-- ============================================================
create table if not exists public.reminder_delivery_log (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.reminders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  scheduled_occurrence timestamptz not null,
  onesignal_notification_id text,
  delivery_status text not null default 'pending',  -- pending | sent | failed | skipped
  error_details text,
  created_at timestamptz not null default now(),
  unique (reminder_id, scheduled_occurrence)
);

create index if not exists reminder_delivery_log_user_status_idx
  on public.reminder_delivery_log (user_id, delivery_status, created_at desc);

-- ============================================================
-- 3. updated_at trigger
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
-- 4. Row Level Security
-- ============================================================
alter table public.reminders enable row level security;

drop policy if exists "reminders select own" on public.reminders;
create policy "reminders select own" on public.reminders
  for select using (auth.uid() = user_id);

drop policy if exists "reminders insert own" on public.reminders;
create policy "reminders insert own" on public.reminders
  for insert with check (auth.uid() = user_id);

drop policy if exists "reminders update own" on public.reminders;
create policy "reminders update own" on public.reminders
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "reminders delete own" on public.reminders;
create policy "reminders delete own" on public.reminders
  for delete using (auth.uid() = user_id);

alter table public.reminder_delivery_log enable row level security;

drop policy if exists "reminder_delivery_log select own" on public.reminder_delivery_log;
create policy "reminder_delivery_log select own" on public.reminder_delivery_log
  for select using (auth.uid() = user_id);

-- No insert/update/delete policies for anon/authenticated on the log:
-- the Edge Function (service_role) writes it. service_role bypasses RLS.

-- ============================================================
-- 5. pg_cron job -> Edge Function
-- ============================================================
-- Edge Function URL (project ref = jlqrbbqsuksncrxjcmbc).
do $$
begin
  if 'REPLACE_WITH_REMINDER_CRON_SECRET' like 'REPLACE_WITH_%' then
    raise exception 'Replace the islamic reminder cron secret marker with your REMINDER_CRON_SECRET value before running this script.';
  end if;
end
$$;

select vault.create_secret(
  'https://jlqrbbqsuksncrxjcmbc.supabase.co/functions/v1/reminder-dispatch',
  'islamic_reminder_dispatch_url'
)
where not exists (
  select 1 from vault.decrypted_secrets where name = 'islamic_reminder_dispatch_url'
);

select vault.create_secret(
  'REPLACE_WITH_REMINDER_CRON_SECRET',
  'islamic_reminder_cron_secret'
)
where not exists (
  select 1 from vault.decrypted_secrets where name = 'islamic_reminder_cron_secret'
);

-- Remove any previously scheduled dispatch job (version-agnostic: match by command
-- rather than jobname, since older pg_cron builds lack the jobname column).
select cron.unschedule(jobid)
from cron.job
where command like '%islamic_reminder_dispatch_url%';

-- Schedule the dispatch to run every minute.
-- Uses the 2-arg form cron.schedule(schedule, command) which is supported across
-- all pg_cron versions (the named 3-arg form requires pg_cron >= 1.3.0).
select cron.schedule(
  '* * * * *',
  $job$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'islamic_reminder_dispatch_url'
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'islamic_reminder_cron_secret'
        )
      ),
      body := '{}'::jsonb
    );
  $job$
);
