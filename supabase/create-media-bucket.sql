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
