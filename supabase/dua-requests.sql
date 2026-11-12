-- ---------------------------------------------------------------------------
-- Public dua requests
-- ---------------------------------------------------------------------------
-- Project: Islam Media Central shared master database (jlqrbbqsuksncrxjcmbc).
-- Additive and safe to re-run.
--
-- A visitor can ask the community to make dua for someone by name, and the
-- request shows publicly at the top of the worship tracker as
-- "Dua request for <name>" followed by what they wrote.
--
-- The browser never touches the table: the three SECURITY DEFINER functions
-- below are the only way in or out, which is what keeps the poster anonymous
-- and stops anyone writing rows directly.
--
-- Nobody has to sign in, so there is no owner column to check. A request is
-- therefore removed by the idempotency key the device generated when it posted
-- it — a key that only ever lived in that device's localStorage. Someone else
-- cannot delete another person's request because they never see the key.
--
-- is_public exists so a request can be hidden later without losing the row; the
-- read function only ever returns public ones.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Requests
-- ---------------------------------------------------------------------------

create table if not exists public.dua_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid,
  subject_name    text not null,
  message         text not null,
  is_public       boolean not null default true,
  idempotency_key text,
  created_at      timestamptz not null default now()
);

-- A retry or a double tap sends the same key, so it can only land once.
create unique index if not exists dua_requests_idem_idx
  on public.dua_requests (idempotency_key)
  where idempotency_key is not null;

-- The board always reads newest first.
create index if not exists dua_requests_recent_idx
  on public.dua_requests (created_at desc);

alter table public.dua_requests enable row level security;

-- ---------------------------------------------------------------------------
-- 2. Post a request
-- ---------------------------------------------------------------------------

create or replace function public.add_dua_request(
  p_subject_name text,
  p_message text,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subject text       := btrim(coalesce(p_subject_name, ''));
  v_message text       := btrim(coalesce(p_message, ''));
  v_created timestamptz := now();
begin
  if v_subject = '' then
    raise exception 'Please say who the dua is for so it can be shared.'
      using errcode = '22023';
  end if;

  if v_message = '' then
    raise exception 'Please write the dua request before sending it.'
      using errcode = '22023';
  end if;

  -- Matches the tracker's own limits, so the public board stays readable.
  if char_length(v_subject) > 40 then
    v_subject := left(v_subject, 40);
  end if;

  if char_length(v_message) > 240 then
    v_message := left(v_message, 240);
  end if;

  insert into public.dua_requests (subject_name, message, idempotency_key, created_at)
  values (v_subject, v_message, p_idempotency_key, v_created)
  on conflict do nothing;

  return jsonb_build_object(
    'subject_name', v_subject,
    'message',      v_message,
    'created_at',   v_created
  );
end $$;

-- ---------------------------------------------------------------------------
-- 3. Read the board
-- Newest first, public rows only. The idempotency key is deliberately NOT
-- returned: it is the delete credential, so publishing it would let anyone
-- remove anyone else's request.
-- ---------------------------------------------------------------------------

create or replace function public.get_dua_requests(p_limit integer default 5)
returns table (
  id           uuid,
  subject_name text,
  message      text,
  created_at   timestamptz
)
language sql
security definer
set search_path = public
as $$
  select d.id, d.subject_name, d.message, d.created_at
  from public.dua_requests d
  where d.is_public
  order by d.created_at desc
  limit least(greatest(coalesce(p_limit, 5), 1), 20);
$$;

-- ---------------------------------------------------------------------------
-- 4. Remove a request this device posted
-- ---------------------------------------------------------------------------

create or replace function public.remove_dua_requests(p_idempotency_keys text[])
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  if p_idempotency_keys is null or array_length(p_idempotency_keys, 1) is null then
    return jsonb_build_object('deleted', 0);
  end if;

  with gone as (
    delete from public.dua_requests
    where idempotency_key = any (p_idempotency_keys)
    returning 1
  )
  select count(*)::integer into v_deleted from gone;

  return jsonb_build_object('deleted', v_deleted);
end $$;

-- ---------------------------------------------------------------------------
-- 5. Execute grants
-- Signed-out visitors only need EXECUTE; every function is SECURITY DEFINER.
-- ---------------------------------------------------------------------------

revoke all on function public.add_dua_request(text, text, text) from public;
revoke all on function public.get_dua_requests(integer) from public;
revoke all on function public.remove_dua_requests(text[]) from public;

grant execute on function public.add_dua_request(text, text, text) to anon, authenticated;
grant execute on function public.get_dua_requests(integer) to anon, authenticated;
grant execute on function public.remove_dua_requests(text[]) to anon, authenticated;
