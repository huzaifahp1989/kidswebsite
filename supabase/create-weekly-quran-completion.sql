-- ---------------------------------------------------------------------------
-- Weekly Qur'an completion drive  (Friday 00:00 -> Thursday 23:59, London)
-- ---------------------------------------------------------------------------
-- Project: Islam Media Central shared master database (jlqrbbqsuksncrxjcmbc).
-- Additive and safe to re-run.
--
-- The community aim is one whole Qur'an every week, anchored on Friday
-- (Jumu'ah) exactly like the weekly durood goal.
--
-- Coverage is NOT stored here: it is read from public.quran_juz_logs, which is
-- already live and already records one row per juz. That means a juz can never
-- be counted twice, and a full Qur'an only ever appears once all 30 juz have
-- genuinely been recited that week — recording juz 30 alone changes nothing.
--
-- This file adds one thing only: the list of people who have joined the week's
-- drive, so the tracker can show who is taking part.
--
-- Reuses the existing Friday-anchored helpers, so the week boundary is defined
-- in exactly one place:
--   public.campaign_week_start()  -> Friday 00:00 Europe/London
--   public.campaign_week_end()    -> the following Friday 00:00 (exclusive)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Participants
-- ---------------------------------------------------------------------------

create table if not exists public.quran_weekly_participants (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid,
  display_name    text not null,
  week_start      timestamptz not null,
  idempotency_key text,
  created_at      timestamptz not null default now()
);

-- One join per person per week. The tracker is anonymous, so a person is their
-- typed name — matched case- and space-insensitively so "Aisha" and " aisha "
-- are the same volunteer. A reload or a double tap therefore cannot inflate the
-- count, and a new week starts with the list empty.
create unique index if not exists quran_weekly_participants_person_idx
  on public.quran_weekly_participants (week_start, lower(btrim(display_name)));

create unique index if not exists quran_weekly_participants_idem_idx
  on public.quran_weekly_participants (idempotency_key)
  where idempotency_key is not null;

create index if not exists quran_weekly_participants_week_idx
  on public.quran_weekly_participants (week_start);

-- Reachable only through the two SECURITY DEFINER functions below, so the
-- browser never touches the table directly.
alter table public.quran_weekly_participants enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Join the current week's drive  (idempotent)
-- ---------------------------------------------------------------------------

create or replace function public.join_quran_weekly_completion(
  p_display_name text,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name   text        := btrim(coalesce(p_display_name, ''));
  v_week   timestamptz := public.campaign_week_start();
  v_end    timestamptz := public.campaign_week_end();
  v_people bigint      := 0;
begin
  if v_name = '' then
    raise exception 'Please enter your name so you can join the completion.'
      using errcode = '22023';
  end if;

  -- Keep the public list tidy; the tracker itself stops at 60 characters.
  if char_length(v_name) > 60 then
    v_name := left(v_name, 60);
  end if;

  -- Already joined this week, or the same submission arriving twice -> no-op.
  insert into public.quran_weekly_participants (display_name, week_start, idempotency_key)
  values (v_name, v_week, p_idempotency_key)
  on conflict do nothing;

  select count(*)::bigint
    into v_people
  from public.quran_weekly_participants
  where week_start = v_week;

  return jsonb_build_object(
    'joined',       true,
    'display_name', v_name,
    'week_start',   v_week,
    'week_end',     v_end,
    'participants', v_people
  );
end $$;

-- ---------------------------------------------------------------------------
-- 3. How the week's drive is going
-- juz_covered / juz_numbers come straight from quran_juz_logs for the current
-- Friday-to-Thursday window. `complete` is true only when all 30 juz have been
-- recited — there is no way to report a finished Qur'an from a single entry.
-- ---------------------------------------------------------------------------

create or replace function public.get_weekly_quran_completion_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_week    timestamptz := public.campaign_week_start();
  v_end     timestamptz := public.campaign_week_end();
  v_covered bigint      := 0;
  v_numbers jsonb       := '[]'::jsonb;
  v_people  bigint      := 0;
begin
  select count(*)::bigint,
         coalesce(jsonb_agg(n.juz_number order by n.juz_number), '[]'::jsonb)
    into v_covered, v_numbers
  from (
    select distinct jl.juz_number
    from public.quran_juz_logs jl
    where jl.created_at >= v_week
      and jl.created_at < v_end
  ) n;

  select count(*)::bigint
    into v_people
  from public.quran_weekly_participants p
  where p.week_start = v_week;

  return jsonb_build_object(
    'week_start',   v_week,
    'week_end',     v_end,
    'juz_covered',  v_covered,
    'juz_numbers',  v_numbers,
    'juz_total',    30,
    'participants', v_people,
    'complete',     v_covered >= 30
  );
end $$;

-- ---------------------------------------------------------------------------
-- 4. Execute grants
-- Signed-out visitors only need EXECUTE; both functions are SECURITY DEFINER.
-- ---------------------------------------------------------------------------

revoke all on function public.join_quran_weekly_completion(text, text) from public;
revoke all on function public.get_weekly_quran_completion_stats() from public;

grant execute on function public.join_quran_weekly_completion(text, text) to anon, authenticated;
grant execute on function public.get_weekly_quran_completion_stats() to anon, authenticated;
