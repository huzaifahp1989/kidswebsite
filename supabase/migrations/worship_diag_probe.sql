-- ---------------------------------------------------------------------------
-- TEMPORARY diagnostic probes for the community worship tracker.
-- Additive and read-only: creates nothing but throwaway zzz_* helpers.
-- Drop every zzz_* function once the fault is identified.
-- ---------------------------------------------------------------------------

-- 1. Dump the live definition of any public function by name.
create or replace function public.zzz_worship_fn_source(p_name text)
returns text
language sql
security definer
set search_path = public, pg_catalog
as $$
  select string_agg(pg_get_functiondef(p.oid), E'\n\n' order by p.oid)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = p_name
$$;

-- 2. Does a bare sum()/coalesce pair work at all in this database?
create or replace function public.zzz_probe_sum()
returns bigint
language sql
as $$
  select coalesce(sum(x), 0)::bigint from (values (1::bigint), (2::bigint)) v(x)
$$;

-- 3. The exact aggregate shape the overlay intends to use, on real tables.
create or replace function public.zzz_probe_durood_stats()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_week_start      timestamptz := public.campaign_week_start();
  v_week_end        timestamptz := public.campaign_week_end();
  v_total_completed bigint := 0;
  v_week_total      bigint := 0;
begin
  select
    coalesce(sum(coalesce(dc.completed_count, dc.count, 0)), 0),
    coalesce(sum(coalesce(dc.completed_count, dc.count, 0)) filter (
      where dc.created_at >= v_week_start and dc.created_at < v_week_end), 0)
  into v_total_completed, v_week_total
  from public.durood_completions dc;

  return jsonb_build_object(
    'total_completed', v_total_completed,
    'week_total',      v_week_total,
    'week_start',      v_week_start,
    'week_end',        v_week_end
  );
end;
$fn$;

-- 4. Does the pledged-count aggregate shape work?
create or replace function public.zzz_probe_pledges()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_week_start  timestamptz := public.campaign_week_start();
  v_week_end    timestamptz := public.campaign_week_end();
  v_total       bigint := 0;
  v_week        bigint := 0;
begin
  select
    coalesce(sum(dp.pledged_count), 0),
    coalesce(sum(dp.pledged_count) filter (
      where dp.created_at >= v_week_start and dp.created_at < v_week_end), 0)
  into v_total, v_week
  from public.durood_pledges dp
  where dp.pledged_count is not null;

  return jsonb_build_object('total_pledged', v_total, 'week_pledged', v_week);
end;
$fn$;

-- 5. What columns do the two log tables actually have?
create or replace function public.zzz_durood_columns()
returns jsonb
language sql
security definer
set search_path = public, pg_catalog
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'table_name', c.table_name,
           'column_name', c.column_name,
           'data_type', c.data_type,
           'is_nullable', c.is_nullable
         ) order by c.table_name, c.ordinal_position), '[]'::jsonb)
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name in ('durood_pledges', 'durood_completions', 'quran_juz_logs',
                         'durood_pledge_completions')
$$;
