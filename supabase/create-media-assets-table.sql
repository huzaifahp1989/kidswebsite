create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  name text,
  file_name text not null,
  storage_path text not null unique,
  public_url text not null,
  mime_type text,
  size_bytes bigint,
  tags text[] default '{}',
  folder text default 'general',
  uploaded_by uuid,
  created_at timestamptz default now()
);

alter table public.media_assets enable row level security;

drop policy if exists "Public read media assets" on public.media_assets;
create policy "Public read media assets"
  on public.media_assets for select
  using (true);

drop policy if exists "Authenticated insert media assets" on public.media_assets;
create policy "Authenticated insert media assets"
  on public.media_assets for insert
  to authenticated
  with check (auth.uid() = uploaded_by);

drop policy if exists "Authenticated delete own media assets" on public.media_assets;
create policy "Authenticated delete own media assets"
  on public.media_assets for delete
  to authenticated
  using (auth.uid() = uploaded_by);

notify pgrst, 'reload schema';
