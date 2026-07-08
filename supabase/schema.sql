-- Mini Arcade 공통 스키마
-- Supabase Dashboard → SQL Editor 에서 통째로 실행하세요.
-- 전부 idempotent(재실행 안전)하게 짜여있어서, 이미 실행했던 프로젝트에
-- 다시 실행해도 안전합니다 (기존 데이터는 유지됨).

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- profiles: 로그인한 사용자의 닉네임 저장
-- 최초 로그인 시 프론트(src/lib/profile.js)에서 자동 생성함
-- (랜덤문자열 10글자 + 구글이면 g, 카카오면 k)
-- ─────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  provider text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all"
  on public.profiles for select
  using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id and char_length(nickname) between 2 and 20);

-- ─────────────────────────────────────────────────────────────
-- scores: 게임별 랭킹. game_id 컬럼으로 게임을 구분해서 하나의
-- 테이블을 모든 게임이 공유합니다. 이제 로그인한 사용자만 등록 가능.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  user_id uuid references auth.users(id) on delete cascade,
  nickname text not null,
  score numeric not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 예전 버전(IP 기반)에서 남아있을 수 있는 컬럼 정리 + 신규 컬럼 보강
alter table public.scores add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.scores drop column if exists ip_address;

create index if not exists scores_game_id_score_idx
  on public.scores (game_id, score);

alter table public.scores enable row level security;

-- 누구나 랭킹을 조회할 수 있음 (로그인 불필요)
drop policy if exists "scores_select_all" on public.scores;
create policy "scores_select_all"
  on public.scores for select
  using (true);

-- 예전 "누구나 등록 가능" 정책은 제거하고, 로그인한 사용자가
-- 자기 자신의 user_id로만 등록할 수 있도록 변경
drop policy if exists "scores_insert_all" on public.scores;
drop policy if exists "scores_insert_own" on public.scores;
create policy "scores_insert_own"
  on public.scores for insert
  with check (
    auth.uid() = user_id
    and char_length(nickname) between 1 and 20
    and char_length(game_id) between 1 and 50
  );

-- ─────────────────────────────────────────────────────────────
-- 하루 1회 등록 제한 (게임별로 user_id 기준, 당일 자정 기준)
-- 로그인 기반이라 예전 IP 방식보다 훨씬 신뢰도가 높습니다.
-- ─────────────────────────────────────────────────────────────

drop trigger if exists scores_daily_limit_trigger on public.scores;
drop function if exists public.scores_enforce_daily_limit();

create or replace function public.scores_enforce_daily_limit()
returns trigger as $$
declare
  existing_count int;
begin
  select count(*) into existing_count
  from public.scores
  where game_id = new.game_id
    and user_id = new.user_id
    and created_at >= date_trunc('day', now());

  if existing_count > 0 then
    raise exception 'DAILY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger scores_daily_limit_trigger
  before insert on public.scores
  for each row execute function public.scores_enforce_daily_limit();

-- 참고: 게임별로 "말도 안 되는 점수"를 막고 싶다면 이런 식의 체크도 추가할 수 있어요.
-- 예) 반응속도 게임은 사람이 물리적으로 100ms 이하로 반응하기 매우 어려우므로:
--   alter table public.scores add constraint reaction_score_plausible
--     check (game_id <> 'reaction' or (score between 50 and 5000));

-- 게임별 사용 예시:
--   반응속도 테스트 (ms, 낮을수록 좋음)  -> game_id = 'reaction'
--   숫자 맞추기 (시도 횟수, 낮을수록 좋음) -> game_id = 'guess'
--   2048 (점수, 높을수록 좋음)          -> game_id = '2048'
