-- ---------------------------------------------------------------------------
-- Survey + prize draw (shared Supabase master DB: jlqrbbqsuksncrxjcmbc)
--
-- Supports the public page /Survey and the admin dashboard /AdminSurvey.
-- All reads/writes go through the service-role API (api/survey.js), so RLS is
-- enabled with NO anon/authenticated policies: participants and the public can
-- never read other people's entries, responses, or the winner tools directly.
--
-- Safe to re-run: every statement is idempotent and the seed only inserts when
-- the campaign is missing.
-- ---------------------------------------------------------------------------

-- 1. Campaigns ---------------------------------------------------------------
create table if not exists public.survey_campaigns (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  intro text,
  opens_at timestamptz not null default now(),
  closes_at timestamptz,
  max_winners integer not null default 3,
  terms_version text not null default 'v1',
  retention_months integer not null default 12,
  is_published boolean not null default true,
  draw_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Older installs may predate these columns; add them defensively.
alter table public.survey_campaigns add column if not exists terms_version text not null default 'v1';
alter table public.survey_campaigns add column if not exists retention_months integer not null default 12;
alter table public.survey_campaigns add column if not exists draw_completed_at timestamptz;

-- 2. Prizes ------------------------------------------------------------------
create table if not exists public.survey_prizes (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.survey_campaigns(id) on delete cascade,
  title text not null,
  description text,
  value_label text,
  image_url text,
  winners_count integer not null default 1,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists survey_prizes_campaign_idx
  on public.survey_prizes (campaign_id, sort_order);

-- 3. Entries (survey answers + prize draw entry) ------------------------------
create table if not exists public.survey_entries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.survey_campaigns(id) on delete cascade,
  first_name text not null,
  email text not null,
  email_normalized text not null,
  age_bracket text not null default 'adult',
  guardian_email text,
  guardian_consent boolean not null default false,
  marketing_opt_in boolean not null default false,
  terms_accepted boolean not null default false,
  consented_at timestamptz,
  answers jsonb not null default '{}'::jsonb,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

-- One entry per email address per campaign (duplicate prevention).
create unique index if not exists survey_entries_campaign_email_key
  on public.survey_entries (campaign_id, email_normalized);

create index if not exists survey_entries_campaign_created_idx
  on public.survey_entries (campaign_id, created_at desc);

-- 4. Winners -----------------------------------------------------------------
create table if not exists public.survey_winners (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.survey_campaigns(id) on delete cascade,
  entry_id uuid not null references public.survey_entries(id) on delete cascade,
  prize_id uuid references public.survey_prizes(id) on delete set null,
  selected_at timestamptz not null default now(),
  selection_method text not null default 'secure_random',
  selection_proof text,
  notified_at timestamptz,
  fulfillment_status text not null default 'selected',
  notes text,
  created_at timestamptz not null default now()
);

create unique index if not exists survey_winners_campaign_entry_key
  on public.survey_winners (campaign_id, entry_id);

create index if not exists survey_winners_campaign_idx
  on public.survey_winners (campaign_id, selected_at desc);

-- 5. Lock everything down ----------------------------------------------------
-- RLS with no policies means anon/authenticated keys are denied outright; only
-- the service role used by the API can read or write.
alter table public.survey_campaigns enable row level security;
alter table public.survey_prizes enable row level security;
alter table public.survey_entries enable row level security;
alter table public.survey_winners enable row level security;

revoke all on public.survey_campaigns from anon, authenticated;
revoke all on public.survey_prizes from anon, authenticated;
revoke all on public.survey_entries from anon, authenticated;
revoke all on public.survey_winners from anon, authenticated;

-- 6. Seed the first campaign (only when it does not exist yet) ---------------
insert into public.survey_campaigns (
  slug, title, subtitle, intro, opens_at, closes_at, max_winners, terms_version
)
select
  'have-your-say-2026',
  'Have Your Say & Win Prizes!',
  'Help us improve Islam Media Central! Complete our quick survey for a chance to win exciting prizes.',
  'Your answers take about 2–3 minutes and directly shape what we build next.',
  now(),
  now() + interval '60 days',
  3,
  'v1'
where not exists (select 1 from public.survey_campaigns where slug = 'have-your-say-2026');

insert into public.survey_prizes (
  campaign_id, title, description, value_label, image_url, winners_count, sort_order
)
select
  c.id,
  seed.title,
  seed.description,
  seed.value_label,
  seed.image_url,
  seed.winners_count,
  seed.sort_order
from public.survey_campaigns c
cross join (
  values
    (
      'Takeaway Gift Voucher',
      'Enjoy a meal on us — a takeaway voucher for a local restaurant of your choice.',
      '£25',
      'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20product%20photo%20of%20a%20takeaway%20meal%20in%20a%20kraft%20gift%20box%20beside%20a%20gift%20voucher%20card%2C%20clean%20light%20blue%20and%20white%20background%2C%20soft%20studio%20lighting%2C%20no%20people%2C%20no%20faces&image_size=landscape_4_3',
      1,
      0
    ),
    (
      'Amazon Gift Voucher',
      'A digital Amazon gift voucher delivered straight to your inbox.',
      '£25',
      'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20product%20photo%20of%20a%20gift%20voucher%20card%20with%20a%20golden%20ribbon%20bow%2C%20clean%20light%20blue%20background%2C%20soft%20studio%20lighting%2C%20blank%20card%2C%20no%20people%2C%20no%20faces&image_size=landscape_4_3',
      1,
      1
    ),
    (
      'Personalised Islam Media Central Mug & Keyring',
      'A personalised Islam Media Central mug with a matching keyring — a keepsake to enjoy every day.',
      'Personalised set',
      'https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=professional%20product%20photo%20of%20a%20white%20ceramic%20mug%20with%20a%20blue%20geometric%20star%20emblem%20next%20to%20a%20matching%20metal%20keyring%2C%20clean%20white%20background%2C%20soft%20studio%20lighting%2C%20no%20people%2C%20no%20faces&image_size=landscape_4_3',
      1,
      2
    )
) as seed(title, description, value_label, image_url, winners_count, sort_order)
where c.slug = 'have-your-say-2026'
  and not exists (select 1 from public.survey_prizes p where p.campaign_id = c.id);
