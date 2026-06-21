create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text,
  text text,
  image_url text,
  image_urls text[] default '{}',
  link_url text,
  link_label text default 'Learn more',
  active boolean default true,
  show_on_home boolean default true,
  show_as_popup boolean default false,
  "order" integer default 0,
  popup_delay_seconds integer default 3,
  popup_cooldown_hours integer default 24,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.announcements enable row level security;

drop policy if exists "Public read announcements" on public.announcements;
create policy "Public read announcements"
  on public.announcements for select
  using (active = true);

drop policy if exists "Authenticated manage announcements" on public.announcements;
create policy "Authenticated manage announcements"
  on public.announcements for all
  to authenticated
  using (true)
  with check (true);

notify pgrst, 'reload schema';
