alter table public.announcements
  add column if not exists image_urls text[] default '{}';

notify pgrst, 'reload schema';
