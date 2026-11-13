-- MerakKutusu / CuriosityBox Supabase Schema & Anti-Cheat RPC

create extension if not exists "pgcrypto";

create table if not exists public.players (
  id uuid primary key,
  nickname text not null default 'Merak Kaşifi',
  xp integer not null default 0 check (xp >= 0),
  weekly_xp integer not null default 0 check (weekly_xp >= 0),
  daily_sprint_score integer not null default 0 check (daily_sprint_score >= 0),
  league_tier text not null default 'bronze' check (league_tier in ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  streak_days integer not null default 1 check (streak_days >= 1),
  updated_at timestamptz not null default now()
);

create table if not exists public.quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  quiz_mode text not null check (quiz_mode in ('daily', 'weekly', 'memory', 'duel')),
  score integer not null check (score >= 0),
  duration_sec integer not null check (duration_sec >= 1),
  correct_count integer not null check (correct_count >= 0),
  question_count integer not null check (question_count >= 1),
  created_at timestamptz not null default now()
);

create index if not exists idx_players_weekly_xp on public.players (weekly_xp desc);
create index if not exists idx_players_daily_score on public.players (daily_sprint_score desc);
create index if not exists idx_players_xp on public.players (xp desc);

alter table public.players enable row level security;
alter table public.quiz_submissions enable row level security;

drop policy if exists "Players readable by everyone" on public.players;
create policy "Players readable by everyone"
  on public.players for select
  using (true);

drop policy if exists "Submissions readable by everyone" on public.quiz_submissions;
create policy "Submissions readable by everyone"
  on public.quiz_submissions for select
  using (true);

-- Anti-cheat verified score submission RPC
create or replace function public.submit_quiz_score(
  p_player_id uuid,
  p_nickname text,
  p_quiz_mode text,
  p_score integer,
  p_duration_sec integer,
  p_correct_count integer,
  p_question_count integer
)
returns jsonb
language plpgsql
security definer
as $$
declare
  v_max_possible integer;
  v_safe_score integer;
  v_safe_nick text;
  v_new_xp integer;
  v_tier text;
begin
  if p_duration_sec < 2 then
    raise exception 'Submission rejected: unrealistic completion time';
  end if;

  if p_correct_count > p_question_count then
    raise exception 'Submission rejected: invalid correct count';
  end if;

  -- Max theoretical score: +100 base + +25*streak + remaining seconds * 5
  v_max_possible := (p_question_count * 350) + 450;
  v_safe_score := greatest(0, least(p_score, v_max_possible));
  v_safe_nick := left(coalesce(nullif(trim(p_nickname), ''), 'Merak Kaşifi'), 24);

  insert into public.players (id, nickname, xp, weekly_xp, daily_sprint_score, updated_at)
  values (
    p_player_id,
    v_safe_nick,
    v_safe_score,
    v_safe_score,
    case when p_quiz_mode = 'daily' then v_safe_score else 0 end,
    now()
  )
  on conflict (id) do update
  set
    nickname = excluded.nickname,
    xp = public.players.xp + v_safe_score,
    weekly_xp = public.players.weekly_xp + v_safe_score,
    daily_sprint_score = case
      when p_quiz_mode = 'daily' then greatest(public.players.daily_sprint_score, v_safe_score)
      else public.players.daily_sprint_score
    end,
    updated_at = now()
  returning xp into v_new_xp;

  v_tier := case
    when v_new_xp >= 2800 then 'diamond'
    when v_new_xp >= 1800 then 'platinum'
    when v_new_xp >= 1000 then 'gold'
    when v_new_xp >= 400 then 'silver'
    else 'bronze'
  end;

  update public.players set league_tier = v_tier where id = p_player_id;

  insert into public.quiz_submissions (
    player_id, quiz_mode, score, duration_sec, correct_count, question_count
  ) values (
    p_player_id, p_quiz_mode, v_safe_score, p_duration_sec, p_correct_count, p_question_count
  );

  return jsonb_build_object(
    'accepted', true,
    'verified_score', v_safe_score,
    'total_xp', v_new_xp,
    'league_tier', v_tier
  );
end;
$$;
