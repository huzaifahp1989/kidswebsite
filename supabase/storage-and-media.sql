-- Supabase media library + storage setup
-- Project: https://jlqrbbqsuksncrxjcmbc.supabase.co
--
-- IMPORTANT: If the full script fails, Supabase rolls back EVERYTHING
-- (including the table create). Run these files one at a time instead:
--   1) step1-media-assets.sql
--   2) step2-storage-bucket.sql
--   3) step3-admin-write-policies.sql  (requires schema.sql first)
--
-- Or run this whole file only after schema.sql succeeded.

-- 1) Media assets table (searchable image library)
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

create index if not exists media_assets_folder_idx on public.media_assets (folder);
create index if not exists media_assets_created_at_idx on public.media_assets (created_at desc);
create index if not exists media_assets_name_idx on public.media_assets (name);
create index if not exists media_assets_file_name_idx on public.media_assets (file_name);

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

-- 2) Storage bucket for images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'media',
  'media',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- 3) Storage policies
drop policy if exists "Public read media bucket" on storage.objects;
create policy "Public read media bucket"
  on storage.objects for select
  using (bucket_id = 'media');

drop policy if exists "Authenticated upload media bucket" on storage.objects;
create policy "Authenticated upload media bucket"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'media');

drop policy if exists "Authenticated update own media bucket" on storage.objects;
create policy "Authenticated update own media bucket"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'media' and auth.uid() = owner)
  with check (bucket_id = 'media');

drop policy if exists "Authenticated delete own media bucket" on storage.objects;
create policy "Authenticated delete own media bucket"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'media' and auth.uid() = owner);

-- 4) Admin write access for announcements & sponsors (authenticated admin UI)
drop policy if exists "Authenticated manage announcements" on public.announcements;
create policy "Authenticated manage announcements"
  on public.announcements for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated manage sponsors" on public.sponsors;
create policy "Authenticated manage sponsors"
  on public.sponsors for all
  to authenticated
  using (true)
  with check (true);

-- 5) Optional: mark admin user in users table
-- update public.users set role = 'admin' where email = 'huzaify786@gmail.com';
