-- ---------------------------------------------------------------------------
-- Community worship overlay: weekly Durood goal + 'week' leaderboard period
-- ---------------------------------------------------------------------------
-- Project: Islam Media Central shared master database (jlqrbbqsuksncrxjcmbc).
-- Additive and safe to re-run.
--
-- The base durood/pledge/khatam schema and the quran_juz_logs migration are
-- already live. This file only adds what the home-page tracker is missing and
-- leaves everything else exactly as it was:
--
--   1. campaign_week_start / campaign_week_end  (new)
--      Friday 00:00 -> the following Friday 00:00, Europe/London, so "this
--      week" is Friday 00:00 through Thursday 23:59:59.999999 local time.
--      The durood week deliberately starts on Friday (Jumu'ah), not Monday.
--
--   2. get_community_durood_stats  -> adds week_total, week_goal, week_start,
--      week_end, week_participants. Every key it already returned is
--      unchanged, so the website keeps working.
--
--   3. get_durood_leaderboard  -> now accepts 'week' as well as 'all'/'month'.
--      Three fixes over the current definition:
--        * aggregates are cast to bigint. sum() of a bigint column returns
--          numeric, and returning numeric in a declared bigint column is what
--          produced "Returned type numeric does not match expected type bigint
--          in column 4".
--        * recorded durood is included, not just pledges, so an entry made in
--          the tracker actually appears on the board.
--        * ordering uses the real aggregate columns rather than a plpgsql
--          variable, which would bind to the still-null OUT parameter.
--      The original column order is preserved and `total` is appended, so
--      existing consumers read the same columns in the same positions.
--
--   4. get_juz_leaderboard -> now accepts 'week'.
--
-- Deliberately NOT touched: record_durood_completion, record_quran_juz,
-- get_community_juz_stats, get_community_quran_stats, get_monthly_quran_stats,
-- get_quran_khatam_leaderboard, submit_durood_pledge, record_quran_khatam and
-- join_quran_khatam_campaign. The two write RPCs already match exactly what the
-- client sends and already refuse to let a completion overshoot its pledge;
-- recreating them here could only lose that guard.
--
-- Response shapes are contract, not style:
--   * get_community_durood_stats returns a jsonb OBJECT -> PostgREST sends an
--     object, and callers read data.week_goal.
--   * both leaderboards return TABLE -> PostgREST sends an ARRAY.
-- Changing either shape silently breaks every existing caller.
--
-- get_community_durood_stats used to read a legacy public.user_daily_activity
-- table inside an exception-guarded block. That table does not exist in this
-- project, so the block never ran and the function has always reported
-- durood_completions. It is not reproduced here; the result is identical.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Week window helpers  (week starts on FRIDAY — Jumu'ah)
-- date_trunc('week') is ISO, so it always returns Monday. The durood week is
-- anchored on Friday instead, so we step back from today's midnight to the
-- most recent Friday. extract(dow ...) gives Sunday 0 ... Friday 5, Saturday 6;
-- (dow + 2) % 7 is the number of days since the last Friday (Fri -> 0,
-- Sat -> 1, Sun -> 2, ... Thu -> 6).
-- Working from date_trunc('day', ...) keeps this safe across the year boundary,
-- and the default day is "today in London" rather than "today in UTC" so the
-- window never rolls over an hour early for UK users. Converting the wall clock
-- with AT TIME ZONE is what survives the March/October DST switch.
-- campaign_week_end is EXCLUSIVE: it is the Friday 00:00 that opens the next
-- week, so the range is always [start, end).
-- ---------------------------------------------------------------------------

create or replace function public.campaign_week_start(
  p_day date default ((now() at time zone 'Europe/London')::date)
)
returns timestamptz
language sql
stable
as $$
  select (
    date_trunc('day', p_day::timestamp)
    - ((extract(dow from p_day)::int + 2) % 7) * interval '1 day'
  ) at time zone 'Europe/London'
$$;

create or replace function public.campaign_week_end(
  p_day date default ((now() at time zone 'Europe/London')::date)
)
returns timestamptz
language sql
stable
as $$
  select (
    date_trunc('day', p_day::timestamp)
    - ((extract(dow from p_day)::int + 2) % 7) * interval '1 day'
    + interval '7 days'
  ) at time zone 'Europe/London'
$$;

-- ---------------------------------------------------------------------------
-- 2. Durood community totals + the weekly goal
-- week_goal is the single source of truth for the 10,000 target: the widget
-- reads it from here, so the number is never hardcoded in the UI.
-- ---------------------------------------------------------------------------

-- Drop anything already answering to these two names first, matched by OID.
-- CREATE OR REPLACE keeps the old function when the return type differs, which
-- would leave a stale body in place; dropping by OID removes every overload
-- whatever its argument list or return type, so the definitions below are
-- guaranteed to be the ones the API executes.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('get_community_durood_stats', 'get_durood_leaderboard')
  loop
    execute format('drop function if exists %s', r.signature);
  end loop;
end $$;

create function public.get_community_durood_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_weekly_goal       bigint      := 10000;
  v_month             date        := public.campaign_current_month();
  v_pledged           bigint      := 0;
  v_pledged_month     bigint      := 0;
  v_participants      bigint      := 0;
  v_completed         bigint      := 0;
  v_completed_month   bigint      := 0;
  v_month_start       timestamptz := public.campaign_month_start(v_month);
  v_month_end         timestamptz := public.campaign_month_end(v_month);
  v_week_start        timestamptz := public.campaign_week_start();
  v_week_end          timestamptz := public.campaign_week_end();
  v_week_total        bigint      := 0;
  v_week_participants bigint      := 0;
begin
  -- One aggregate per statement. Nesting two aggregate calls in a single
  -- expression is what raises 42803 "aggregate function calls cannot be
  -- nested", so nothing here is combined into a shared select list.
  --
  -- Pledges: only pledged_count counts. The legacy `count` column holds durood
  -- already recited on the old counter and is explicitly not a pledge.
  select coalesce(sum(dp.pledged_count), 0)::bigint
    into v_pledged
  from public.durood_pledges dp
  where dp.pledged_count is not null;

  select coalesce(sum(dp.pledged_count), 0)::bigint
    into v_pledged_month
  from public.durood_pledges dp
  where dp.pledged_count is not null
    and dp.campaign_month = v_month;

  -- Durood recorded through the pledge workflow and through the home tracker.
  select coalesce(sum(coalesce(dc.completed_count, 0)), 0)::bigint
    into v_completed
  from public.durood_completions dc;

  select coalesce(sum(coalesce(dc.completed_count, 0)), 0)::bigint
    into v_completed_month
  from public.durood_completions dc
  where dc.created_at >= v_month_start
    and dc.created_at < v_month_end;

  select coalesce(sum(coalesce(dc.completed_count, 0)), 0)::bigint
    into v_week_total
  from public.durood_completions dc
  where dc.created_at >= v_week_start
    and dc.created_at < v_week_end;

  -- A "person" is a signed-in user, or a guest grouped under their typed name.
  -- Counting a derived table keeps DISTINCT out of an aggregate expression.
  select count(*)::bigint
    into v_participants
  from (
    select distinct coalesce(
             dc.user_id::text,
             'name:' || lower(btrim(coalesce(dc.display_name_snapshot, '')))
           ) as person_key
    from public.durood_completions dc
    union
    select distinct coalesce(
             dp.user_id::text,
             'name:' || lower(btrim(coalesce(dp.display_name_snapshot, '')))
           )
    from public.durood_pledges dp
    where dp.pledged_count is not null
  ) people
  where people.person_key is not null
    and people.person_key <> 'name:';

  select count(*)::bigint
    into v_week_participants
  from (
    select distinct coalesce(
             dc.user_id::text,
             'name:' || lower(btrim(coalesce(dc.display_name_snapshot, '')))
           ) as person_key
    from public.durood_completions dc
    where dc.created_at >= v_week_start
      and dc.created_at < v_week_end
  ) people
  where people.person_key is not null
    and people.person_key <> 'name:';

  return jsonb_build_object(
    'total_pledged',     v_pledged,
    'total_completed',   v_completed,
    'month_pledged',     v_pledged_month,
    'month_completed',   v_completed_month,
    'participants',      v_participants,
    'campaign_month',    v_month,
    'week_total',        v_week_total,
    'week_goal',         v_weekly_goal,
    'week_start',        v_week_start,
    'week_end',          v_week_end,
    'week_participants', v_week_participants
  );
end $$;

-- ---------------------------------------------------------------------------
-- 3. Durood leaderboard: 'all' | 'month' | 'week'
-- A "person" is a signed-in user (grouped by user_id) or a guest grouped under
-- their typed name, via coalesce(user_id::text, 'name:' || lower(name)).
-- `total` is durood actually recorded for that person, falling back to their
-- pledge when they have recorded none, so a pledger and a recorder both appear
-- without the same durood ever being counted twice.
-- ---------------------------------------------------------------------------

-- The shape below deliberately mirrors the juz leaderboard, which already runs
-- clean on this project: one UNION ALL feeding a single grouped CTE, and a
-- final select whose only function is row_number() over columns of that CTE.
-- No query level therefore contains two aggregate calls in one expression,
-- which is the 42803 condition.
create function public.get_durood_leaderboard(
  p_period text default 'all',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  rank            bigint,
  user_id         uuid,
  display_name    text,
  pledged_total   bigint,
  completed_total bigint,
  last_updated    timestamptz,
  total           bigint
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_period      text        := case
                                 when lower(coalesce(p_period, 'all')) = 'week'  then 'week'
                                 when lower(coalesce(p_period, 'all')) = 'month' then 'month'
                                 else 'all'
                               end;
  v_month       date        := public.campaign_current_month();
  v_from        timestamptz := null;
  v_to          timestamptz := null;
  v_limit       int         := greatest(1, least(coalesce(p_limit, 20), 100));
  v_offset      int         := greatest(0, coalesce(p_offset, 0));
begin
  if v_period = 'week' then
    v_from := public.campaign_week_start();
    v_to   := public.campaign_week_end();
  elsif v_period = 'month' then
    v_from := public.campaign_month_start(v_month);
    v_to   := public.campaign_month_end(v_month);
  end if;

  return query
  with scoped as (
    select
      coalesce(dc.user_id::text,
               'name:' || lower(btrim(coalesce(dc.display_name_snapshot, '')))) as person_key,
      dc.user_id,
      coalesce(nullif(btrim(dc.display_name_snapshot), ''), pp.display_name, 'Anonymous') as who,
      coalesce(dc.completed_count, 0)::bigint as completed,
      0::bigint as pledged,
      dc.created_at
    from public.durood_completions dc
    left join public.public_profiles pp on pp.user_id = dc.user_id
    where v_from is null or (dc.created_at >= v_from and dc.created_at < v_to)

    union all

    select
      coalesce(dp.user_id::text,
               'name:' || lower(btrim(coalesce(dp.display_name_snapshot, '')))) as person_key,
      dp.user_id,
      coalesce(
        nullif(btrim(dp.display_name_snapshot), ''),
        nullif(btrim(dp.user_name), ''),
        pp.display_name,
        'Anonymous'
      ) as who,
      0::bigint as completed,
      coalesce(dp.pledged_count, 0)::bigint as pledged,
      dp.created_at
    from public.durood_pledges dp
    left join public.public_profiles pp on pp.user_id = dp.user_id
    where dp.pledged_count is not null
      and (v_from is null or (dp.created_at >= v_from and dp.created_at < v_to))
  ),
  rolled as (
    select
      s.person_key,
      (array_agg(s.user_id order by s.created_at desc))[1] as uid,
      (array_agg(s.who order by s.created_at desc))[1] as who,
      sum(s.pledged)::bigint    as pledged_total,
      sum(s.completed)::bigint  as completed_total,
      max(s.created_at)         as last_seen,
      -- `total` is durood actually recorded for the person, falling back to
      -- their pledge when they have recorded none, so a pledger and a recorder
      -- are both visible without the same durood being counted twice. Computed
      -- here, inside the one grouped CTE, rather than in a second query level.
      case
        when sum(s.completed) > 0 then sum(s.completed)
        else sum(s.pledged)
      end::bigint               as total
    from scoped s
    group by s.person_key
  )
  select
    row_number() over (order by r.total desc, r.last_seen asc)::bigint,
    r.uid,
    r.who,
    r.pledged_total,
    r.completed_total,
    r.last_seen,
    r.total
  from rolled r
  where r.person_key is not null
    and r.person_key <> 'name:'
  order by r.total desc, r.last_seen asc
  limit v_limit
  offset v_offset;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Qur'an Juz leaderboard: 'all' | 'month' | 'week'
-- Counts quran_juz_logs only. A juz is 1/30th of the Qur'an and is tracked as
-- its own metric: recording one never touches the khatam counter.
-- Return type is unchanged, so CREATE OR REPLACE is enough.
-- ---------------------------------------------------------------------------

create or replace function public.get_juz_leaderboard(
  p_period text default 'all',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  total bigint,
  last_updated timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period      text        := case
                                 when lower(coalesce(p_period, 'all')) = 'week'  then 'week'
                                 when lower(coalesce(p_period, 'all')) = 'month' then 'month'
                                 else 'all'
                               end;
  v_month       date        := public.campaign_current_month();
  v_month_start timestamptz := public.campaign_month_start(v_month);
  v_month_end   timestamptz := public.campaign_month_end(v_month);
  v_week_start  timestamptz := public.campaign_week_start();
  v_week_end    timestamptz := public.campaign_week_end();
  v_from        timestamptz := null;
  v_to          timestamptz := null;
  v_limit       int         := greatest(1, least(coalesce(p_limit, 20), 100));
  v_offset      int         := greatest(0, coalesce(p_offset, 0));
begin
  if v_period = 'week' then
    v_from := v_week_start;
    v_to   := v_week_end;
  elsif v_period = 'month' then
    v_from := v_month_start;
    v_to   := v_month_end;
  end if;

  return query
  with scoped as (
    select
      coalesce(j.user_id::text,
               'name:' || lower(coalesce(j.display_name_snapshot, ''))) as person_key,
      j.user_id,
      coalesce(nullif(j.display_name_snapshot, ''), 'Anonymous') as who,
      j.created_at
    from public.quran_juz_logs j
    where coalesce(j.is_public, true) = true
      and (v_from is null or (j.created_at >= v_from and j.created_at < v_to))
  ),
  rolled as (
    select
      (array_agg(s.user_id order by s.created_at desc))[1] as uid,
      (array_agg(s.who order by s.created_at desc))[1] as who,
      count(*)::bigint as total,
      max(s.created_at) as last_seen
    from scoped s
    group by s.person_key
  )
  select
    row_number() over (order by r.total desc, r.last_seen asc)::bigint,
    r.uid,
    r.who,
    r.total,
    r.last_seen
  from rolled r
  order by r.total desc, r.last_seen asc
  limit v_limit
  offset v_offset;
end $$;

-- ---------------------------------------------------------------------------
-- 4b. Qur'an Juz community totals
-- Counts quran_juz_logs only. `juz_covered` is how many of the 30 juz have been
-- recited at least once this campaign month, and `juz_numbers` lists exactly
-- which ones, so the tracker can show what is still left for the month without
-- the browser having to read the table itself.
-- Additive: every key that was already returned keeps its name and meaning.
-- ---------------------------------------------------------------------------

create or replace function public.get_community_juz_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month       date        := public.campaign_current_month();
  v_month_start timestamptz := public.campaign_month_start(v_month);
  v_month_end   timestamptz := public.campaign_month_end(v_month);
  v_day_start   timestamptz :=
    (now() at time zone 'Europe/London')::date::timestamp at time zone 'Europe/London';
  v_all_time    bigint := 0;
  v_month_total bigint := 0;
  v_today       bigint := 0;
  v_people      bigint := 0;
  v_covered     bigint := 0;
  v_numbers     jsonb  := '[]'::jsonb;
begin
  select
    count(*),
    count(*) filter (where jl.created_at >= v_month_start and jl.created_at < v_month_end),
    count(*) filter (where jl.created_at >= v_day_start)
  into v_all_time, v_month_total, v_today
  from public.quran_juz_logs jl;

  -- Which of the 30 juz were taken this month, and how many distinct ones.
  select count(*)::bigint,
         coalesce(jsonb_agg(n.juz_number order by n.juz_number), '[]'::jsonb)
    into v_covered, v_numbers
  from (
    select distinct jl.juz_number
    from public.quran_juz_logs jl
    where jl.created_at >= v_month_start
      and jl.created_at < v_month_end
  ) n;

  select count(distinct coalesce(
           jl.user_id::text,
           'name:' || lower(btrim(coalesce(jl.display_name_snapshot, '')))
         ))::bigint
    into v_people
  from public.quran_juz_logs jl
  where jl.created_at >= v_month_start
    and jl.created_at < v_month_end;

  return jsonb_build_object(
    'all_time',       v_all_time,
    'month_total',    v_month_total,
    'today',          v_today,
    'participants',   v_people,
    'juz_covered',    v_covered,
    'juz_numbers',    v_numbers,
    'juz_total',      30,
    'campaign_month', v_month
  );
end $$;

-- ---------------------------------------------------------------------------
-- 5. Execute grants
-- Every function is SECURITY DEFINER, so a signed-out visitor only needs
-- EXECUTE and never touches a table directly. Dropping and recreating a
-- function discards its privileges, so they are re-stated explicitly.
-- ---------------------------------------------------------------------------

revoke all on function public.campaign_week_start(date) from public;
revoke all on function public.campaign_week_end(date) from public;
revoke all on function public.get_community_durood_stats() from public;
revoke all on function public.get_community_juz_stats() from public;
revoke all on function public.get_durood_leaderboard(text, int, int) from public;
revoke all on function public.get_juz_leaderboard(text, int, int) from public;

grant execute on function public.campaign_week_start(date) to anon, authenticated;
grant execute on function public.campaign_week_end(date) to anon, authenticated;
grant execute on function public.get_community_durood_stats() to anon, authenticated;
grant execute on function public.get_community_juz_stats() to anon, authenticated;
grant execute on function public.get_durood_leaderboard(text, int, int) to anon, authenticated;
grant execute on function public.get_juz_leaderboard(text, int, int) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Live updates
-- Add the four worship tables to the supabase_realtime publication so an entry
-- added in any app or on the website is pushed to every open tracker. Guarded
-- by to_regclass() and a pg_publication_tables pre-check, so this is a no-op
-- when a table is missing or already published and is safe to re-run.
-- postgres_changes still enforces RLS, so a subscriber only receives rows its
-- own SELECT policy already allows.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
  targets text[] := array[
    'durood_pledges',
    'durood_completions',
    'quran_khatam_completions',
    'quran_juz_logs'
  ];
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  foreach t in array targets loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;

    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      continue;
    end if;

    execute format('alter publication supabase_realtime add table public.%I', t);
  end loop;
end $$;
