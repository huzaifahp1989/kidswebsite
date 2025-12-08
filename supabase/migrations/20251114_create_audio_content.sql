create table if not exists public.audio_content (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid,
  title text not null,
  slug text not null unique,
  mp3_url text,
  cover_image text,
  description text,
  transcript text,
  moral_lesson text,
  duration text,
  age_group text default 'all',
  category text default 'nasheed',
  subcategory text,
  language text default 'English',
  allow_download boolean default false,
  featured boolean default false,
  plays_count integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.audio_content enable row level security;

create policy "audio_select_all" on public.audio_content for select using (true);
create policy "audio_insert_owner" on public.audio_content for insert with check (auth.uid() = owner_id);
create policy "audio_update_owner" on public.audio_content for update using (auth.uid() = owner_id);

grant select on public.audio_content to anon;
grant select, insert, update on public.audio_content to authenticated;

create index if not exists idx_audio_content_slug on public.audio_content(slug);