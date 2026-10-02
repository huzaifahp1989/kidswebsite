create schema if not exists extensions;
create extension if not exists vector with schema extensions;

alter table if exists public.users
  add column if not exists preferred_language text not null default 'en'
  check (preferred_language in ('en','ur','gu','ar'));

create table if not exists public.imc_features (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null default '',
  category text not null,
  route text not null,
  icon text not null default 'BookOpen',
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint imc_features_route_allowed check (route in ('/Home','/FullQuran','/Hadith','/KidsZone','/Games','/Quizzes','/Leaderboard','/Videos','/AudioNew','/Multimedia','/Stories','/ContactUs','/Features','/About','/Competition','/Login','/Signup'))
);

create table if not exists public.imc_help_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null unique,
  category text not null,
  feature text,
  question text,
  questions text[] not null default '{}',
  answer text not null,
  keywords text[] not null default '{}',
  navigation_route text,
  is_published boolean not null default false,
  priority integer not null default 0,
  version integer not null default 1,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint imc_help_articles_route_allowed check (navigation_route is null or navigation_route in ('/Home','/FullQuran','/Hadith','/KidsZone','/Games','/Quizzes','/Leaderboard','/Videos','/AudioNew','/Multimedia','/Stories','/ContactUs','/Features','/About','/Competition','/Login','/Signup'))
);

create table if not exists public.imc_help_chunks (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null references public.imc_help_articles(id) on delete cascade,
  content text not null,
  embedding extensions.vector(1536) not null,
  chunk_index integer not null default 0,
  created_at timestamptz not null default now(),
  unique (article_id, chunk_index)
);

create table if not exists public.imc_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now()
);

create table if not exists public.imc_chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.imc_chat_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.imc_chat_feedback (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.imc_chat_messages(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rating text not null check (rating in ('helpful','not_helpful')),
  feedback text,
  created_at timestamptz not null default now(),
  unique (message_id, user_id)
);

create table if not exists public.imc_unanswered_questions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  question text not null,
  question_key text not null,
  category text,
  current_screen text,
  frequency integer not null default 1,
  status text not null default 'new' check (status in ('new','reviewing','answered','ignored')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_asked_at timestamptz not null default now(),
  unique (question_key, current_screen)
);

create table if not exists public.imc_assistant_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.imc_assistant_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0
);

create table if not exists public.imc_assistant_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('question','navigation_click')),
  feature text,
  route text,
  duration_ms integer,
  created_at timestamptz not null default now(),
  constraint imc_assistant_events_route_allowed check (route is null or route in ('/Home','/FullQuran','/Hadith','/KidsZone','/Games','/Quizzes','/Leaderboard','/Videos','/AudioNew','/Multimedia','/Stories','/ContactUs','/Features','/About','/Competition','/Login','/Signup'))
);

create index if not exists imc_help_articles_published_category_idx on public.imc_help_articles (category, priority desc) where is_published = true;
create index if not exists imc_help_articles_feature_idx on public.imc_help_articles (feature) where is_published = true;
create index if not exists imc_help_chunks_embedding_idx on public.imc_help_chunks using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 100);
create index if not exists imc_chat_sessions_user_recent_idx on public.imc_chat_sessions (user_id, last_message_at desc);
create index if not exists imc_chat_messages_owner_recent_idx on public.imc_chat_messages (user_id, session_id, created_at);
create index if not exists imc_chat_feedback_user_idx on public.imc_chat_feedback (user_id, rating);
create index if not exists imc_unanswered_status_recent_idx on public.imc_unanswered_questions (status, updated_at desc);
create index if not exists imc_assistant_events_recent_idx on public.imc_assistant_events (event_type, created_at desc);
create index if not exists imc_assistant_events_feature_idx on public.imc_assistant_events (feature, created_at desc);

alter table public.imc_features enable row level security;
alter table public.imc_help_articles enable row level security;
alter table public.imc_help_chunks enable row level security;
alter table public.imc_chat_sessions enable row level security;
alter table public.imc_chat_messages enable row level security;
alter table public.imc_chat_feedback enable row level security;
alter table public.imc_unanswered_questions enable row level security;
alter table public.imc_assistant_settings enable row level security;
alter table public.imc_assistant_rate_limits enable row level security;
alter table public.imc_assistant_events enable row level security;

create policy "Anyone can read active assistant features" on public.imc_features
  for select using (is_active = true);
create policy "Users read their own assistant sessions" on public.imc_chat_sessions
  for select using (auth.uid() = user_id);
create policy "Users read their own assistant messages" on public.imc_chat_messages
  for select using (auth.uid() = user_id);
create policy "Users read their own assistant feedback" on public.imc_chat_feedback
  for select using (auth.uid() = user_id);
create policy "Users submit feedback for their own messages" on public.imc_chat_feedback
  for insert with check (
    auth.uid() = user_id and exists (
      select 1 from public.imc_chat_messages m
      where m.id = message_id and m.user_id = auth.uid() and m.role = 'assistant'
    )
  );
create policy "Users update their own assistant feedback" on public.imc_chat_feedback
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.imc_match_help_chunks(query_embedding extensions.vector(1536), match_count integer default 5)
returns table (article_id uuid, content text, similarity double precision)
language sql stable security definer
set search_path = public, extensions
as $$
  select c.article_id, c.content, (1 - (c.embedding <=> query_embedding))::double precision as similarity
  from public.imc_help_chunks c
  join public.imc_help_articles a on a.id = c.article_id
  where a.is_published = true
  order by c.embedding <=> query_embedding
  limit greatest(1, least(match_count, 8));
$$;

create or replace function public.imc_consume_rate_limit(p_bucket_key text, p_limit integer)
returns boolean
language plpgsql security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  insert into public.imc_assistant_rate_limits (bucket_key, window_started_at, request_count)
  values (p_bucket_key, now(), 1)
  on conflict (bucket_key) do update set
    window_started_at = case
      when public.imc_assistant_rate_limits.window_started_at < now() - interval '1 hour' then now()
      else public.imc_assistant_rate_limits.window_started_at
    end,
    request_count = case
      when public.imc_assistant_rate_limits.window_started_at < now() - interval '1 hour' then 1
      else public.imc_assistant_rate_limits.request_count + 1
    end
  returning request_count into current_count;
  return current_count <= greatest(1, least(p_limit, 1000));
end;
$$;

create or replace function public.imc_record_unanswered_question(p_user_id uuid, p_question text, p_category text, p_current_screen text)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  normalized text := md5(lower(regexp_replace(trim(p_question), '\s+', ' ', 'g')));
  screen text := coalesce(nullif(left(p_current_screen, 100), ''), 'unknown');
begin
  insert into public.imc_unanswered_questions (user_id, question, question_key, category, current_screen)
  values (p_user_id, left(p_question, 1200), normalized, nullif(left(p_category, 100), ''), screen)
  on conflict (question_key, current_screen) do update set
    frequency = public.imc_unanswered_questions.frequency + 1,
    question = excluded.question,
    category = coalesce(excluded.category, public.imc_unanswered_questions.category),
    user_id = coalesce(public.imc_unanswered_questions.user_id, excluded.user_id),
    updated_at = now(),
    last_asked_at = now();
end;
$$;

revoke all on function public.imc_match_help_chunks(extensions.vector, integer) from public, anon, authenticated;
revoke all on function public.imc_consume_rate_limit(text, integer) from public, anon, authenticated;
revoke all on function public.imc_record_unanswered_question(uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.imc_match_help_chunks(extensions.vector, integer) to service_role;
grant execute on function public.imc_consume_rate_limit(text, integer) to service_role;
grant execute on function public.imc_record_unanswered_question(uuid, text, text, text) to service_role;

insert into public.imc_features (name, description, category, route, icon, sort_order) values
  ('Quran', 'Read and explore Quran tools.', 'Quran', '/FullQuran', 'BookOpen', 10),
  ('Hadith', 'Browse the Hadith area.', 'Learning', '/Hadith', 'BookOpen', 20),
  ('Kids Zone', 'Open children''s learning content.', 'Kids Zone', '/KidsZone', 'Gamepad2', 30),
  ('Games', 'Play learning games.', 'Games', '/Games', 'Gamepad2', 40),
  ('Quizzes', 'Open available quizzes.', 'Quiz', '/Quizzes', 'HelpCircle', 50),
  ('Leaderboard', 'View the learner leaderboard.', 'Leaderboard', '/Leaderboard', 'Trophy', 60),
  ('Videos', 'Browse available video content.', 'Media', '/Videos', 'Video', 70),
  ('Audio Library', 'Browse audio content.', 'Media', '/AudioNew', 'Headphones', 80),
  ('Multimedia', 'Explore the multimedia section.', 'Media', '/Multimedia', 'Play', 90),
  ('Stories', 'Explore stories.', 'Learning', '/Stories', 'BookOpen', 100),
  ('Features', 'Explore the platform feature guide.', 'General', '/Features', 'Sparkles', 110),
  ('Radio', 'Open the home page where the radio player is available.', 'Radio', '/Home', 'Radio', 120),
  ('Notifications', 'Open the app notification area.', 'Notifications', '/Home', 'Bell', 130),
  ('Competitions', 'Open current competition information.', 'Competitions', '/Competition', 'Trophy', 140)
on conflict (name) do nothing;

insert into public.imc_assistant_settings (key, value) values
  ('ai_enabled', 'true'::jsonb),
  ('voice_enabled', 'false'::jsonb),
  ('anonymous_chat_enabled', 'true'::jsonb),
  ('anonymous_questions_per_hour', '10'::jsonb),
  ('authenticated_questions_per_hour', '50'::jsonb),
  ('confidence_threshold', '0.68'::jsonb),
  ('default_language', '"en"'::jsonb),
  ('assistant_name', '"IMC Assistant"'::jsonb),
  ('assistant_greeting', '"Assalamu Alaikum! How can I help you today?"'::jsonb),
  ('fallback_message', '"I don''t have the latest information about that feature yet. Please contact the Islam Media Central support team for help."'::jsonb),
  ('support_url', '"/ContactUs"'::jsonb),
  ('support_email', '""'::jsonb),
  ('support_whatsapp', '""'::jsonb),
  ('support_website', '""'::jsonb),
  ('suggested_questions', '["How do I listen to Quran?","How do I change reciter?","Where are the Kids Games?","How do I enter the quiz?","How does the leaderboard work?","Where can I find podcasts?","What features are available?"]'::jsonb)
on conflict (key) do nothing;

insert into public.imc_help_articles (title, category, feature, question, questions, answer, keywords, navigation_route, is_published)
values
  ('How to open Quran', 'Quran', 'quran', 'How do I open Quran?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{quran,open}', '/FullQuran', false),
  ('How to listen to Quran', 'Quran', 'quran_audio', 'How do I listen to Quran?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{quran,audio,listen}', '/FullQuran', false),
  ('How to select a Surah', 'Quran', 'surah_selection', 'How do I select a Surah?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{surah,select,quran}', '/FullQuran', false),
  ('How to change reciter', 'Quran', 'reciter', 'How do I change the reciter?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{reciter,quran,audio}', '/FullQuran', false),
  ('How to use Recite Along', 'Quran', 'recite_along', 'How do I use Recite Along?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{recite,along,recitation}', '/FullQuran', false),
  ('How to use English translation', 'Quran', 'translation', 'How do I use English translation?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{translation,english,quran}', '/FullQuran', false),
  ('How to use Quran tracker', 'Quran', 'quran_tracker', 'How do I use the Quran tracker?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{tracker,progress,quran}', '/FullQuran', false),
  ('Quran audio troubleshooting', 'Technical Support', 'quran_audio', 'Quran audio is not playing', '{}', 'Draft for administrator review. Add verified troubleshooting steps before publishing.', '{quran,audio,troubleshooting}', '/FullQuran', false),
  ('How to open Hadith', 'Hadith', 'hadith', 'Where can I find Hadith?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{hadith,open}', '/Hadith', false),
  ('How to find a Hadith book', 'Hadith', 'hadith_books', 'How do I find a Hadith book?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{hadith,book,find}', '/Hadith', false),
  ('How to search Hadith', 'Hadith', 'hadith_search', 'How do I search Hadith?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{hadith,search}', '/Hadith', false),
  ('How to open Kids Zone', 'Kids Zone', 'kids_zone', 'How do I open Kids Zone?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{kids,zone,children}', '/KidsZone', false),
  ('How to play games', 'Games', 'games', 'How do I play games?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{kids,games,play}', '/Games', false),
  ('How to take quizzes', 'Quiz', 'quiz', 'How do I take a quiz?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{kids,quiz}', '/Quizzes', false),
  ('How the leaderboard works', 'Leaderboard', 'leaderboard', 'How does the leaderboard work?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{leaderboard,points}', '/Leaderboard', false),
  ('How to enter competitions', 'Competitions', 'competitions', 'How do I enter competitions?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{competition,enter}', '/Competition', false),
  ('How giveaways work', 'Giveaways', 'giveaways', 'How do giveaways work?', '{}', 'Draft for administrator review. Add verified rules before publishing.', '{giveaway,prize,rules}', null, false),
  ('How to listen to Radio', 'Radio', 'radio', 'How do I listen to Radio?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{radio,listen}', '/Home', false),
  ('How to watch live programmes', 'Live Programmes', 'live_programmes', 'Where can I watch live programmes?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{live,programmes,watch}', '/Videos', false),
  ('How to find podcasts', 'Podcasts', 'podcasts', 'Where can I find podcasts?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{podcasts,audio}', '/AudioNew', false),
  ('How to listen to nasheeds', 'Nasheeds', 'nasheeds', 'How do I listen to nasheeds?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{nasheeds,audio}', '/AudioNew', false),
  ('How to find Qiraat', 'Qiraat', 'qiraat', 'Where can I find Qiraat?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{qiraat,recitation}', '/AudioNew', false),
  ('How to register', 'Account', 'registration', 'How do I create an account?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{register,account,signup}', '/Signup', false),
  ('How to log in', 'Account', 'login', 'How do I log in?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{login,account}', '/Login', false),
  ('Password help', 'Account', 'password', 'I forgot my password. What should I do?', '{}', 'Draft for administrator review. Add verified account recovery steps before publishing.', '{password,forgot,reset}', '/Login', false),
  ('Notifications help', 'Notifications', 'notifications', 'How do I turn notifications on?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{notifications,push}', '/Home', false),
  ('Profile settings', 'Profile', 'profile', 'Where are profile settings?', '{}', 'Draft for administrator review. Add verified steps before publishing.', '{profile,settings}', '/Home', false),
  ('What is Islam Media Central?', 'General App Information', 'general', 'What is Islam Media Central?', '{}', 'Draft for administrator review. Add approved description before publishing.', '{about,imc,platform}', '/About', false),
  ('What features are available?', 'General App Information', 'features', 'What features are available?', '{}', 'Draft for administrator review. The app feature list is generated from active feature records.', '{features,available}', '/Features', false),
  ('How to contact support', 'Technical Support', 'support', 'How do I contact support?', '{}', 'Draft for administrator review. Configure official support details before publishing.', '{support,contact,help}', '/ContactUs', false)
on conflict (title) do nothing;

comment on table public.imc_chat_messages is 'Authenticated conversation messages; clients may only read their own rows. All writes use the secured server API.';
comment on table public.imc_assistant_rate_limits is 'Short-lived hashed rate-limit identities. Purge stale rows periodically.';