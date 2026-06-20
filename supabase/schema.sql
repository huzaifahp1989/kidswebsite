-- Run in Supabase SQL editor for project jlqrbbqsuksncrxjcmbc

create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  points integer default 0,
  total_points integer,
  age integer,
  city text,
  madrasah_maktab text,
  avatar text,
  role text default 'user',
  last_award jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.sponsors (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  link_url text,
  image_url text,
  type text default 'sponsor',
  placement text default 'home',
  "order" integer default 0,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text,
  text text,
  image_url text,
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

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  story_id text,
  answers jsonb,
  score numeric,
  user_email text,
  meta jsonb,
  created_at timestamptz default now()
);

create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  game_type text,
  points_awarded integer default 0,
  at timestamptz default now()
);

create table if not exists public.child_progress_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  log_date date,
  quran integer default 0,
  salah integer default 0,
  tasbeeh integer default 0,
  durood integer default 0,
  helping_parents integer default 0,
  notes text,
  created_at timestamptz default now()
);

alter table public.users enable row level security;
alter table public.sponsors enable row level security;
alter table public.announcements enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.game_scores enable row level security;
alter table public.child_progress_logs enable row level security;

create policy "Public read announcements" on public.announcements
  for select using (active = true);

create policy "Public read sponsors" on public.sponsors
  for select using (active = true);

create policy "Users read own profile" on public.users
  for select using (auth.uid() = id);

create policy "Users update own profile" on public.users
  for update using (auth.uid() = id);

create policy "Users insert own profile" on public.users
  for insert with check (auth.uid() = id);

create policy "Authenticated read leaderboard" on public.users
  for select using (auth.role() = 'authenticated');

create policy "Users read own game scores" on public.game_scores
  for select using (auth.uid() = user_id);

create policy "Users insert own game scores" on public.game_scores
  for insert with check (auth.uid() = user_id);

create policy "Users manage own progress logs" on public.child_progress_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Anyone can submit quiz answers" on public.quiz_answers
  for insert with check (true);

-- Admin writes: tighten these policies in production using service role or admin claims.
