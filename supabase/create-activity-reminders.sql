-- Activity reminder storage and one-minute background dispatch.
-- Before running this script:
-- 1. Add REMINDER_CRON_SECRET as a sensitive Production environment variable in Vercel.
-- 2. Replace the marker below with that same random value.

create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault with schema vault;
create extension if not exists pgcrypto;

create table if not exists public.activity_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  activity_id text not null,
  activity_title text not null,
  reminder_time time not null,
  time_zone text not null,
  next_reminder_at timestamptz not null,
  completed_on date,
  dispatch_lease_until timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, activity_id)
);

create index if not exists activity_reminders_due_idx
  on public.activity_reminders (next_reminder_at)
  where active = true;

alter table public.activity_reminders enable row level security;
revoke all on public.activity_reminders from anon, authenticated;
grant all on public.activity_reminders to service_role;

do $$
begin
  if 'REPLACE_WITH_THE_SAME_VALUE_AS_VERCEL_REMINDER_CRON_SECRET'
      like 'REPLACE_WITH_%' then
    raise exception 'Replace the reminder cron secret marker with the Vercel REMINDER_CRON_SECRET value before running this script.';
  end if;
end
$$;

select vault.create_secret(
  'https://imediackids.com/api/reminders/dispatch',
  'activity_reminder_dispatch_url'
)
where not exists (
  select 1 from vault.decrypted_secrets
  where name = 'activity_reminder_dispatch_url'
);

select vault.create_secret(
  'REPLACE_WITH_THE_SAME_VALUE_AS_VERCEL_REMINDER_CRON_SECRET',
  'activity_reminder_cron_secret'
)
where not exists (
  select 1 from vault.decrypted_secrets
  where name = 'activity_reminder_cron_secret'
);

select cron.unschedule(jobid)
from cron.job
where jobname = 'activity-reminder-dispatch';

select cron.schedule(
  'activity-reminder-dispatch',
  '* * * * *',
  $job$
    select net.http_post(
      url := (
        select decrypted_secret
        from vault.decrypted_secrets
        where name = 'activity_reminder_dispatch_url'
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'activity_reminder_cron_secret'
        )
      ),
      body := '{}'::jsonb
    );
  $job$
);
