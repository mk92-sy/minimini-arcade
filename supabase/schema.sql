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

-- 게임별 사용 예시:
--   반응속도 테스트 (ms, 낮을수록 좋음)  -> game_id = 'reaction'
--   숫자 맞추기 (시도 횟수, 낮을수록 좋음) -> game_id = 'guess'
--   2048 (점수, 높을수록 좋음)          -> game_id = '2048'
