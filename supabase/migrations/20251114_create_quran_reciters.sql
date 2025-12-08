create table if not exists public.quran_reciters (
  id text primary key,
  owner_id uuid,
  name text not null,
  flag text,
  base_url text not null,
  supports_verse_audio boolean default false,
  verse_edition_id text,
  active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.quran_reciters enable row level security;

create policy "reciters_select_all" on public.quran_reciters for select using (true);
create policy "reciters_insert_owner" on public.quran_reciters for insert with check (auth.uid() = owner_id);
create policy "reciters_update_owner" on public.quran_reciters for update using (auth.uid() = owner_id);

grant select on public.quran_reciters to anon;
grant select, insert, update on public.quran_reciters to authenticated;