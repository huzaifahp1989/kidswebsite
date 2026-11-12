-- ---------------------------------------------------------------------------
-- Community juz stats: how many Qur'ans the community has completed
-- ---------------------------------------------------------------------------
-- Project: Islam Media Central shared master database (jlqrbbqsuksncrxjcmbc).
-- Additive and safe to re-run.
--
-- Adds one key, quran_completions: the number of campaign months in which all
-- 30 juz were covered. That is the rule the tracker uses — 30 juz covered is
-- one completed Qur'an — so the count can never be inflated by the same juz
-- being recited twice inside a month.
--
-- Every key that was already returned keeps its name and meaning, so
-- CREATE OR REPLACE is enough: only the body changes.
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
  v_qurans      bigint := 0;
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

  -- One completed Qur'an for every month in which the whole 30 juz were
  -- covered. Counting distinct juz per month means a repeated juz inside the
  -- same month still only ever adds up to the one Qur'an.
  select count(*)::bigint
    into v_qurans
  from (
    select jl.campaign_month
    from public.quran_juz_logs jl
    group by jl.campaign_month
    having count(distinct jl.juz_number) >= 30
  ) completed_month;

  return jsonb_build_object(
    'all_time',          v_all_time,
    'month_total',       v_month_total,
    'today',             v_today,
    'participants',      v_people,
    'juz_covered',       v_covered,
    'juz_numbers',       v_numbers,
    'juz_total',         30,
    'quran_completions', v_qurans,
    'campaign_month',    v_month
  );
end $$;

revoke all on function public.get_community_juz_stats() from public;
grant execute on function public.get_community_juz_stats() to anon, authenticated;
