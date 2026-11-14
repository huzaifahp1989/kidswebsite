-- Adds the per-reminder alarm sound used by the Android app to ring reminders
-- in the background. Safe to re-run.
-- Run this in the Supabase SQL Editor (the app cannot apply migrations itself).

alter table public.reminders
  add column if not exists sound text not null default 'SYSTEM_ALARM';

comment on column public.reminders.sound is
  'Alarm sound for on-device reminders: SYSTEM_ALARM | SYSTEM_NOTIFICATION | SYSTEM_RINGTONE | URL. Empty = silent notification.';

-- Verify
select column_name, data_type, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'reminders'
  and column_name = 'sound';
