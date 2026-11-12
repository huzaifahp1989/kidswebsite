-- ---------------------------------------------------------------------------
-- Removing a worship entry that was added by mistake
-- ---------------------------------------------------------------------------
-- Project: Islam Media Central shared master database (jlqrbbqsuksncrxjcmbc).
-- Additive and safe to re-run.
--
-- The tracker is anonymous, so there is no account to check an entry against.
-- Instead every entry is written with a random idempotency key that only the
-- device which created it ever sees — the client keeps the key in localStorage.
-- These two functions delete by that key, so a person can undo their own
-- mistake but cannot touch anyone else's entry, because no one can guess
-- another device's key.
--
-- Nothing becomes readable here: the functions only DELETE the exact keys they
-- are handed, and clients stay INSERT-only on both tables.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Qur'an juz rows
-- ---------------------------------------------------------------------------

create or replace function public.remove_quran_juz_entries(
  p_idempotency_keys text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  -- An empty or missing list is a valid no-op, not an error.
  if p_idempotency_keys is null or array_length(p_idempotency_keys, 1) is null then
    return jsonb_build_object('deleted', 0);
  end if;

  with gone as (
    delete from public.quran_juz_logs
     where idempotency_key = any (p_idempotency_keys)
    returning 1
  )
  select count(*)::integer into v_deleted from gone;

  return jsonb_build_object('deleted', v_deleted);
end $$;

-- ---------------------------------------------------------------------------
-- 2. Durood rows
-- ---------------------------------------------------------------------------

create or replace function public.remove_durood_entries(
  p_idempotency_keys text[]
)
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
    delete from public.durood_completions
     where idempotency_key = any (p_idempotency_keys)
    returning 1
  )
  select count(*)::integer into v_deleted from gone;

  return jsonb_build_object('deleted', v_deleted);
end $$;

-- ---------------------------------------------------------------------------
-- 3. Execute grants
-- Signed-out visitors only need EXECUTE; both functions are SECURITY DEFINER.
-- ---------------------------------------------------------------------------

revoke all on function public.remove_quran_juz_entries(text[]) from public;
revoke all on function public.remove_durood_entries(text[]) from public;

grant execute on function public.remove_quran_juz_entries(text[]) to anon, authenticated;
grant execute on function public.remove_durood_entries(text[]) to anon, authenticated;
