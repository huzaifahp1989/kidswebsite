-- Fix public.users when it has uid/user_id instead of id
-- Run ONE section below that matches your table (see diagnostic query first)

-- DIAGNOSTIC — run this first to see your columns:
-- select column_name, data_type
-- from information_schema.columns
-- where table_schema = 'public' and table_name = 'users'
-- order by ordinal_position;

-- OPTION A — use if your users table has a "uid" column (uncomment and run):
-- alter table public.users rename column uid to id;

-- OPTION B — use if your users table has a "user_id" column (uncomment and run):
-- alter table public.users rename column user_id to id;

-- OPTION C — use if there is no id/uid/user_id column yet (uncomment and run):
-- alter table public.users add column if not exists id uuid;

-- OPTION D — if id exists but is not uuid (uncomment and run):
-- alter table public.users alter column id type uuid using id::uuid;

-- OPTIONAL — add primary key if missing (skip if you get "already exists" error):
-- alter table public.users add primary key (id);
