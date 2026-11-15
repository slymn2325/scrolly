-- Scrolla / MerakKutusu Authoritative Postgres Schema (Heroku Postgres & Supabase compatible)
-- Mirrors runtime DDL in lib/db.ts cleanly and idempotently.

create table if not exists public.facts (
  id serial primary key,
  slug text unique not null,
  category text not null,
  title_tr text,
  title_en text,
  summary_tr text,
  summary_en text,
  detail_tr text,
  detail_en text,
  question_tr text,
  question_en text,
  unit_tr text,
  unit_en text,
  min_val numeric,
  max_val numeric,
  answer_val numeric,
  sketch_type text,
  visual_query text,
  gif_url text,
  gif_query text,
  quiz_tr jsonb,
  quiz_en jsonb,
  source_name text,
  source_url text,
  likes_count int default 0,
  created_at timestamptz default now()
);

alter table public.facts add column if not exists visual_query text;
alter table public.facts add column if not exists gif_url text;
alter table public.facts add column if not exists gif_query text;
alter table public.facts add column if not exists quiz_tr jsonb;
alter table public.facts add column if not exists quiz_en jsonb;

create index if not exists idx_facts_category on public.facts (category);

create table if not exists public.fact_events (
  id bigserial primary key,
  device_id text not null,
  fact_slug text not null,
  category text not null,
  event_type text not null,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists idx_fact_events_slug_type on public.fact_events (fact_slug, event_type);
create index if not exists idx_fact_events_device on public.fact_events (device_id, created_at desc);

create table if not exists public.fact_likes (
  id bigserial primary key,
  fact_slug text not null,
  device_id text not null,
  created_at timestamptz default now(),
  unique (fact_slug, device_id)
);

create table if not exists public.profiles (
  device_id text primary key,
  username text default 'Kâşif',
  handle text default '',
  xp int default 0,
  weekly_xp int default 0,
  daily_best_score int default 0,
  last_daily_quiz_date text default '',
  last_visit_date text default '',
  streak int default 1,
  last_active_date date,
  seen_ids jsonb default '[]'::jsonb,
  favorite_ids jsonb default '[]'::jsonb,
  category_weights jsonb default '{}'::jsonb,
  category_accuracy jsonb default '{}'::jsonb,
  badges jsonb default '[]'::jsonb,
  updated_at timestamptz default now()
);

alter table public.profiles add column if not exists handle text default '';
alter table public.profiles add column if not exists weekly_xp int default 0;
alter table public.profiles add column if not exists daily_best_score int default 0;
alter table public.profiles add column if not exists last_daily_quiz_date text default '';
alter table public.profiles add column if not exists last_visit_date text default '';
alter table public.profiles add column if not exists seen_ids jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists favorite_ids jsonb default '[]'::jsonb;
alter table public.profiles add column if not exists category_weights jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists category_accuracy jsonb default '{}'::jsonb;
alter table public.profiles add column if not exists badges jsonb default '[]'::jsonb;

create index if not exists idx_profiles_xp on public.profiles (xp desc);
create index if not exists idx_profiles_weekly_xp on public.profiles (weekly_xp desc);
create index if not exists idx_profiles_daily_score on public.profiles (last_daily_quiz_date, daily_best_score desc);

create table if not exists public.quiz_submissions (
  id bigserial primary key,
  device_id text not null,
  username text not null default 'Kâşif',
  mode text not null default 'daily',
  score int not null default 0,
  correct_count int not null default 0,
  total_questions int not null default 1,
  quiz_date text not null default '',
  created_at timestamptz default now()
);

alter table public.quiz_submissions add column if not exists device_id text default '';
alter table public.quiz_submissions add column if not exists username text default 'Kâşif';
alter table public.quiz_submissions add column if not exists mode text default 'daily';
alter table public.quiz_submissions add column if not exists correct_count int default 0;
alter table public.quiz_submissions add column if not exists total_questions int default 1;
alter table public.quiz_submissions add column if not exists quiz_date text default '';

create index if not exists idx_quiz_submissions_mode_date
  on public.quiz_submissions (mode, quiz_date, score desc);

create table if not exists public.duel_rooms (
  code text primary key,
  mode text not null default 'duel',
  category text not null default 'all',
  question_count int not null default 5,
  card_ids jsonb not null default '[]'::jsonb,
  host_id text not null,
  players jsonb not null default '[]'::jsonb,
  kicked_ids jsonb not null default '[]'::jsonb,
  status text not null default 'lobby',
  starts_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.duel_rooms add column if not exists kicked_ids jsonb default '[]'::jsonb;
alter table public.duel_rooms add column if not exists starts_at timestamptz;
alter table public.duel_rooms add column if not exists updated_at timestamptz default now();

-- Generated English vocabulary cards (mirrors types/vocabulary.ts VocabularyCard 1:1)
create table if not exists public.vocabulary_cards (
  id text primary key,
  word text unique not null,
  phonetic text default '',
  part_of_speech text default '',
  meaning_tr text not null,
  definition_en text not null,
  example_en text not null,
  example_tr text not null,
  quiz_options jsonb not null,
  correct_index int not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_vocabulary_cards_created on public.vocabulary_cards (created_at desc);

create table if not exists public.scheduler_state (
  id integer primary key default 1 check (id = 1),
  last_card_generation_at timestamptz,
  gif_hour_window_start timestamptz not null default now(),
  gif_requests_in_window integer not null default 0,
  is_generating_cards boolean not null default false,
  is_matching_gifs boolean not null default false,
  card_lock_started_at timestamptz,
  gif_lock_started_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.scheduler_state (
  id,
  gif_hour_window_start,
  gif_requests_in_window,
  is_generating_cards,
  is_matching_gifs
) values (1, now(), 0, false, false)
on conflict (id) do nothing;

create table if not exists public.contact_messages (
  id bigserial primary key,
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  lang text default 'tr',
  created_at timestamptz default now()
);

create or replace view public.fact_engagement_summary as
select
  f.id,
  f.slug,
  f.category,
  f.title_tr,
  f.title_en,
  coalesce(f.likes_count, 0) as likes_count,
  count(e.id) filter (where e.event_type = 'detail_open')::int as detail_opens,
  count(e.id) filter (where e.event_type = 'quick_guess')::int as guess_attempts,
  coalesce(
    round(
      avg((e.meta->>'accuracy')::numeric) filter (
        where e.event_type = 'quick_guess'
          and (e.meta ? 'accuracy')
          and (e.meta->>'accuracy') ~ '^[0-9]+(\\.[0-9]+)?$'
      ),
      2
    ),
    0
  ) as avg_accuracy,
  coalesce(
    round(
      avg((e.meta->>'dwell_sec')::numeric) filter (
        where e.event_type = 'card_dwell'
          and (e.meta ? 'dwell_sec')
          and (e.meta->>'dwell_sec') ~ '^[0-9]+(\\.[0-9]+)?$'
      ),
      2
    ),
    0
  ) as avg_dwell_sec,
  count(e.id) filter (where e.event_type = 'share')::int as shares_count,
  f.created_at
from public.facts f
left join public.fact_events e on e.fact_slug = f.slug
group by
  f.id,
  f.slug,
  f.category,
  f.title_tr,
  f.title_en,
  f.likes_count,
  f.created_at;
