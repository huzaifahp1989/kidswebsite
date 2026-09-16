-- Re-run in Supabase SQL editor so each registered visit increments the counter.
-- Empty/null visitor id still returns the current total without incrementing.

create or replace function public.register_home_visitor(p_visitor_id text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count bigint;
  should_increment boolean := false;
begin
  if p_visitor_id is not null and length(trim(p_visitor_id)) > 0 then
    should_increment := true;

    insert into public.home_visitor_ids (counter_key, visitor_id)
    values ('home', p_visitor_id)
    on conflict do nothing;
  end if;

  if should_increment then
    update public.home_visitor_counter
    set hit_count = hit_count + 1
    where counter_key = 'home';

    if not found then
      insert into public.home_visitor_counter (counter_key, hit_count)
      values ('home', 6001)
      on conflict (counter_key) do update
      set hit_count = public.home_visitor_counter.hit_count + 1;
    end if;
  end if;

  select hit_count into current_count
  from public.home_visitor_counter
  where counter_key = 'home';

  return coalesce(current_count, 6000);
end;
$$;

grant execute on function public.register_home_visitor(text) to anon, authenticated;
