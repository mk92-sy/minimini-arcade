-- Mini Arcade 공통 랭킹 테이블
-- 게임이 몇 개가 되든 이 테이블 하나를 공유하고, game_id 컬럼으로 구분합니다.
-- Supabase Dashboard → SQL Editor 에서 그대로 실행하세요.

create extension if not exists "pgcrypto";

create table if not exists public.scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  nickname text not null,
  score numeric not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- 게임별 랭킹 정렬(점수순)을 빠르게 조회하기 위한 인덱스
create index if not exists scores_game_id_score_idx
  on public.scores (game_id, score);

alter table public.scores enable row level security;

-- 누구나 랭킹을 조회할 수 있음 (로그인 불필요)
create policy "scores_select_all"
  on public.scores for select
  using (true);

-- 누구나 자신의 점수를 등록할 수 있음. 닉네임/게임ID 길이만 최소 검증.
-- update/delete 정책은 의도적으로 만들지 않음 -> RLS가 기본 차단.
create policy "scores_insert_all"
  on public.scores for insert
  with check (
    char_length(nickname) between 1 and 20
    and char_length(game_id) between 1 and 50
  );

-- ─────────────────────────────────────────────────────────────
-- 하루 1회 등록 제한 (게임별로 IP 또는 닉네임 기준, 당일 자정 기준)
-- PostgREST가 요청 헤더를 세션 설정(request.headers)으로 넘겨주는 걸 이용해서
-- 클라이언트가 별도로 IP를 보내지 않아도 서버가 직접 클라이언트 IP를 기록함.
-- ⚠️ 주의: x-forwarded-for는 이론상 조작 가능한 헤더라 완벽한 방어는 아니고,
--          닉네임 중복 체크와 함께 "가벼운 어뷰징 억제" 목적으로만 사용하세요.
-- ─────────────────────────────────────────────────────────────

alter table public.scores add column if not exists ip_address text;

create or replace function public.scores_enforce_daily_limit()
returns trigger as $$
declare
  client_ip text;
  existing_count int;
begin
  client_ip := coalesce(
    nullif(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1), ''),
    'unknown'
  );

  new.ip_address := client_ip;

  select count(*) into existing_count
  from public.scores
  where game_id = new.game_id
    and created_at >= date_trunc('day', now())
    and (ip_address = client_ip or nickname = new.nickname);

  if existing_count > 0 then
    raise exception 'DAILY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists scores_daily_limit_trigger on public.scores;

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
