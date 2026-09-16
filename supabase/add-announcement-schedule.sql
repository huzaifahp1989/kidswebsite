alter table public.announcements
  add column if not exists starts_at timestamptz;

alter table public.announcements
  add column if not exists ends_at timestamptz;

notify pgrst, 'reload schema';
