-- ---------------------------------------------------------------------------
-- Juz leaderboard: also say which juz each person recited
-- ---------------------------------------------------------------------------
-- Project: Islam Media Central shared master database (jlqrbbqsuksncrxjcmbc).
-- Safe to re-run.
--
-- get_juz_leaderboard gains one column, juz_numbers, so the tracker can show
-- "Juz 1, 2" beside each reciter instead of only the count. Picking several juz
-- in one go therefore reads back as exactly the set that was chosen.
--
-- Adding a column changes the function's return type, and CREATE OR REPLACE
-- refuses to change a return type — it would leave the old body in place. The
-- function is dropped by OID first (the same idiom the worship migration uses)
-- and the grants are re-stated afterwards, because dropping discards them.
--
-- Everything already returned keeps its name and meaning: rank, user_id,
-- display_name, total and last_updated are untouched.
-- ---------------------------------------------------------------------------

do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'get_juz_leaderboard'
  loop
    execute format('drop function if exists %s', r.signature);
  end loop;
end $$;

create function public.get_juz_leaderboard(
  p_period text default 'all',
  p_limit int default 20,
  p_offset int default 0
)
returns table (
  rank bigint,
  user_id uuid,
  display_name text,
  total bigint,
  last_updated timestamptz,
  juz_numbers bigint[]
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
      j.juz_number,
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
      max(s.created_at) as last_seen,
      -- Every distinct juz this person recited in the period, lowest first.
      (array_agg(distinct s.juz_number order by s.juz_number)
        filter (where s.juz_number is not null))::bigint[] as juz_numbers
    from scoped s
    group by s.person_key
  )
  select
    row_number() over (order by r.total desc, r.last_seen asc)::bigint,
    r.uid,
    r.who,
    r.total,
    r.last_seen,
    r.juz_numbers
  from rolled r
  order by r.total desc, r.last_seen asc
  limit v_limit
  offset v_offset;
end $$;

revoke all on function public.get_juz_leaderboard(text, int, int) from public;
grant execute on function public.get_juz_leaderboard(text, int, int) to anon, authenticated;
