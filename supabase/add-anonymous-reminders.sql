-- Anonymous reminders: allow reminders without a signed-in user.
-- Uses the OneSignal subscription ID (player ID) as the identifier.

-- 1. Make user_id nullable on reminders
alter table public.reminders alter column user_id drop not null;

-- 2. Add onesignal_id column (the browser/device subscription ID)
alter table public.reminders add column if not exists onesignal_id text;

-- 3. Make user_id nullable on delivery log too
alter table public.reminder_delivery_log alter column user_id drop not null;
alter table public.reminder_delivery_log add column if not exists onesignal_id text;

-- 4. Index on onesignal_id for fast lookups
create index if not exists reminders_onesignal_id_idx on public.reminders (onesignal_id) where onesignal_id is not null;

-- 5. Grant table privileges to anon role (for anonymous users)
grant select, insert, update, delete on public.reminders to anon;
grant select, insert, update, delete on public.reminder_delivery_log to anon;
grant usage on schema public to anon;
grant execute on all functions in schema public to anon;

-- 6. Drop and recreate RLS policies to support both authenticated and anonymous
drop policy if exists "reminders select own" on public.reminders;
drop policy if exists "reminders insert own" on public.reminders;
drop policy if exists "reminders update own" on public.reminders;
drop policy if exists "reminders delete own" on public.reminders;

-- Authenticated users: see their own rows (user_id matches)
create policy "reminders select own" on public.reminders for select
  using (auth.uid() = user_id OR user_id is null);

create policy "reminders insert own" on public.reminders for insert
  with check (auth.uid() = user_id OR user_id is null);

create policy "reminders update own" on public.reminders for update
  using (auth.uid() = user_id OR user_id is null)
  with check (auth.uid() = user_id OR user_id is null);

create policy "reminders delete own" on public.reminders for delete
  using (auth.uid() = user_id OR user_id is null);

-- Delivery log: users can see their own, anonymous see all (onesignal_id not filterable via RLS easily)
drop policy if exists "reminder_delivery_log select own" on public.reminder_delivery_log;
create policy "reminder_delivery_log select own" on public.reminder_delivery_log for select
  using (auth.uid() = user_id OR user_id is null);

-- Verify
select column_name, data_type, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'reminders'
order by ordinal_position;
