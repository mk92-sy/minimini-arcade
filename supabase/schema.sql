-- Mini Arcade 공통 스키마
-- Supabase Dashboard → SQL Editor 에서 통째로 실행하세요.
-- 전부 idempotent(재실행 안전)하게 짜여있어서, 이미 실행했던 프로젝트에
-- 다시 실행해도 안전합니다 (기존 데이터는 유지됨).

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────────────────────
-- profiles: 로그인한 사용자의 닉네임 저장
-- 최초 로그인 시 프론트(src/lib/profile.js)에서 자동 생성함
-- (랜덤문자열 10글자 + 구글이면 g, 카카오면 k)
--
-- 닉네임 길이 제한(한글 12글자/24바이트, "한글=2바이트" 기준)은
-- 프론트(src/lib/nicknameValidation.js)에서 검증합니다. 여기 DB 제약은
-- 실제 UTF-8 바이트 수 기준이 아니라 문자 수 기준의 느슨한 안전망입니다.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null unique,
  provider text not null,
  coins integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists coins integer not null default 0;

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
  with check (auth.uid() = id and char_length(nickname) between 1 and 24);

-- ─────────────────────────────────────────────────────────────
-- scores: 게임별 랭킹. game_id 컬럼으로 게임을 구분해서 하나의
-- 테이블을 모든 게임이 공유합니다. 로그인한 사용자만 등록 가능.
-- 한 사람이 하루 1개씩 여러 날에 걸쳐 여러 행을 가질 수 있으므로,
-- "참가자 수"나 "내 랭킹"은 반드시 user_id 기준으로 집계해야 함.
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

alter table public.scores add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.scores drop column if exists ip_address;

create index if not exists scores_game_id_score_idx
  on public.scores (game_id, score);

create index if not exists scores_game_id_user_id_idx
  on public.scores (game_id, user_id);

alter table public.scores enable row level security;

drop policy if exists "scores_select_all" on public.scores;
create policy "scores_select_all"
  on public.scores for select
  using (true);

drop policy if exists "scores_insert_all" on public.scores;
drop policy if exists "scores_insert_own" on public.scores;
create policy "scores_insert_own"
  on public.scores for insert
  with check (
    auth.uid() = user_id
    and char_length(nickname) between 1 and 24
    and char_length(game_id) between 1 and 50
  );

-- 하루 1회 등록 제한 (게임별로 user_id 기준, 한국시간(KST) 자정 기준)
-- ⚠️ 세션 타임존에 의존하는 date_trunc('day', now()) 대신, 명시적으로
-- Asia/Seoul로 변환한 날짜를 비교합니다. (예전엔 세션 타임존이 UTC라
-- 한국시간 오전 9시에 풀리는 버그가 있었음)
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
    and (created_at at time zone 'Asia/Seoul')::date = (now() at time zone 'Asia/Seoul')::date;

  if existing_count > 0 then
    raise exception 'DAILY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger scores_daily_limit_trigger
  before insert on public.scores
  for each row execute function public.scores_enforce_daily_limit();

-- ─────────────────────────────────────────────────────────────
-- 분기별 시즌 (1~3월/4~6월/7~9월/10~12월, 한국시간 기준)
-- 랭킹은 "리셋"이 아니라 시즌으로 필터링하는 방식으로 구현합니다.
-- 과거 기록은 지우지 않고 DB에 그대로 남아있고, get_my_rank /
-- get_leaderboard_top이 항상 "현재 시즌" 데이터만 집계해서 보여줍니다.
-- 분기가 바뀌는 순간 자동으로 랭킹이 초기화된 것처럼 보이고,
-- 나중에 "지난 시즌 명예의 전당" 같은 기능도 만들 수 있습니다.
-- ─────────────────────────────────────────────────────────────

create or replace function public.current_season()
returns text
language sql
stable
as $$
  select to_char(now() at time zone 'Asia/Seoul', 'YYYY') || '-Q' ||
    ceil(extract(month from (now() at time zone 'Asia/Seoul')) / 3.0)::int;
$$;

alter table public.scores add column if not exists season text not null default public.current_season();

create index if not exists scores_game_id_season_score_idx
  on public.scores (game_id, season, score);

-- 게임별 정렬 방향(순위 계산용) 메타데이터. 코인 지급 함수가
-- 이걸 참고해서 "낮을수록 좋은 게임"인지 "높을수록 좋은 게임"인지 판단합니다.
create table if not exists public.games (
  id text primary key,
  order_direction text not null check (order_direction in ('asc', 'desc'))
);

insert into public.games (id, order_direction) values ('reaction', 'asc')
on conflict (id) do update set order_direction = excluded.order_direction;

-- ─────────────────────────────────────────────────────────────
-- 내 랭킹 / 총 참가자 수
-- 한 사람의 "베스트 기록"만 집계해서 순위를 매깁니다.
-- p_order: 'asc'면 낮을수록 좋음(반응속도 등), 'desc'면 높을수록 좋음.
-- ─────────────────────────────────────────────────────────────

create or replace function public.get_my_rank(p_game_id text, p_user_id uuid, p_order text default 'desc')
returns table (rank bigint, total bigint, best_score numeric)
language sql
security definer
set search_path = public
as $$
  with best_per_user as (
    select user_id,
      case when p_order = 'asc' then min(score) else max(score) end as best_score
    from public.scores
    where game_id = p_game_id
      and user_id is not null
      and season = public.current_season()
    group by user_id
  ),
  ranked as (
    select user_id, best_score,
      case when p_order = 'asc'
        then rank() over (order by best_score asc)
        else rank() over (order by best_score desc)
      end as rnk
    from best_per_user
  )
  select r.rnk as rank, (select count(*) from best_per_user) as total, r.best_score
  from ranked r
  where r.user_id = p_user_id;
$$;

grant execute on function public.get_my_rank(text, uuid, text) to anon, authenticated;

-- 상위 N위 리더보드 (get_my_rank와 동일하게 한 사람의 베스트 기록만 집계)
create or replace function public.get_leaderboard_top(p_game_id text, p_order text default 'desc', p_limit int default 10)
returns table (user_id uuid, nickname text, score numeric)
language sql
security definer
set search_path = public
as $$
  with best_per_user as (
    select distinct on (s.user_id)
      s.user_id, s.nickname, s.score
    from public.scores s
    where s.game_id = p_game_id
      and s.user_id is not null
      and s.season = public.current_season()
    order by s.user_id,
      case when p_order = 'asc' then s.score end asc,
      case when p_order = 'desc' then s.score end desc
  )
  select user_id, nickname, score
  from best_per_user
  order by
    case when p_order = 'asc' then score end asc,
    case when p_order = 'desc' then score end desc
  limit greatest(p_limit, 0);
$$;

grant execute on function public.get_leaderboard_top(text, text, int) to anon, authenticated;

-- 게임별 총 참가자 수 (메인 화면 카비닛 카드용)
create or replace view public.game_participant_counts as
select game_id, count(distinct user_id) as participants
from public.scores
where user_id is not null
group by game_id;

grant select on public.game_participant_counts to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 코인 시스템
-- - 게임별 1회 플레이(=점수 등록) 시 1코인, 게임당 하루(KST 자정 기준) 최대 1회
-- - 적립 단계에서 보상형 광고(선택) 시청 시 +2코인, 이것도 게임당 하루 최대 1회
--   (⚠️ 실제 광고 SDK 연동 전이라 프론트에서 3초 대기로 "시청"을 흉내만 냅니다.
--   나중에 애드몹/카카오 애드핏 등을 붙일 때 src/lib/coins.js의 claimAdBonus
--   호출부(시뮬레이션 부분)만 실제 광고 재생 완료 콜백으로 바꾸면 됩니다.)
-- - 그 게임에서 "이번 시즌 최초로" 3위/2위/1위 달성 시 각각 10/20/50코인,
--   게임당·시즌당 1회성 (분기가 바뀌면 다시 받을 수 있음 — scores.season과
--   동일한 기준으로 리셋되도록 coin_transactions에도 season 컬럼을 둠)
-- 지급은 claim_coins_for_score() / claim_ad_bonus()가 처리하고,
-- coin_transactions의 unique 인덱스가 중복 지급을 막는 안전장치입니다(멱등).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.coin_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  type text not null,
  amount integer not null,
  reward_date date, -- daily_play/ad_bonus 전용 (KST 기준 날짜). 마일스톤 타입은 null.
  season text not null default public.current_season(),
  created_at timestamptz not null default now()
);

alter table public.coin_transactions add column if not exists season text not null default public.current_season();

alter table public.coin_transactions drop constraint if exists coin_transactions_type_check;
alter table public.coin_transactions add constraint coin_transactions_type_check
  check (type in ('daily_play', 'ad_bonus', 'rank_top3', 'rank_top2', 'rank_top1'));

-- 게임당 하루 1회: 플레이 보상
create unique index if not exists coin_tx_daily_unique
  on public.coin_transactions (user_id, game_id, reward_date)
  where type = 'daily_play';

-- 게임당 하루 1회: 광고 보너스
create unique index if not exists coin_tx_ad_bonus_unique
  on public.coin_transactions (user_id, game_id, reward_date)
  where type = 'ad_bonus';

-- 게임당·시즌당 1회: 순위 마일스톤 (이전 버전엔 season이 없어서 평생 1회였음 -> 재생성)
drop index if exists public.coin_tx_milestone_unique;
create unique index if not exists coin_tx_milestone_season_unique
  on public.coin_transactions (user_id, game_id, type, season)
  where type in ('rank_top3', 'rank_top2', 'rank_top1');

alter table public.coin_transactions enable row level security;

drop policy if exists "coin_tx_select_own" on public.coin_transactions;
create policy "coin_tx_select_own"
  on public.coin_transactions for select
  using (auth.uid() = user_id);
-- insert/update/delete 정책 없음 -> 클라이언트 직접 조작 불가, 아래 함수들로만 지급됨

create or replace function public.claim_coins_for_score(p_game_id text)
returns table (award_type text, amount integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_order text;
  v_rank bigint;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  -- 1) 출석(플레이) 보상: 하루 1코인, 게임당 1회
  begin
    insert into public.coin_transactions (user_id, game_id, type, amount, reward_date)
    values (v_user, p_game_id, 'daily_play', 1, v_today);
    update public.profiles set coins = coins + 1 where id = v_user;
    award_type := 'daily_play';
    amount := 1;
    return next;
  exception when unique_violation then
    null; -- 오늘 이미 받음
  end;

  -- 2) 순위 마일스톤: 이 게임에서의 현재(이번 시즌) 순위를 확인
  --    같은 시즌 안에서 순위가 오르내려도(예: 2위 → 5위 → 2위) 이미 해당 등수를
  --    받았다면 unique 인덱스가 막아주므로 중복 지급되지 않습니다.
  select order_direction into v_order from public.games where id = p_game_id;
  if v_order is null then
    v_order := 'desc';
  end if;

  select rank into v_rank from public.get_my_rank(p_game_id, v_user, v_order) limit 1;

  if v_rank is not null then
    if v_rank <= 3 then
      begin
        insert into public.coin_transactions (user_id, game_id, type, amount)
        values (v_user, p_game_id, 'rank_top3', 10);
        update public.profiles set coins = coins + 10 where id = v_user;
        award_type := 'rank_top3';
        amount := 10;
        return next;
      exception when unique_violation then null;
      end;
    end if;

    if v_rank <= 2 then
      begin
        insert into public.coin_transactions (user_id, game_id, type, amount)
        values (v_user, p_game_id, 'rank_top2', 20);
        update public.profiles set coins = coins + 20 where id = v_user;
        award_type := 'rank_top2';
        amount := 20;
        return next;
      exception when unique_violation then null;
      end;
    end if;

    if v_rank <= 1 then
      begin
        insert into public.coin_transactions (user_id, game_id, type, amount)
        values (v_user, p_game_id, 'rank_top1', 50);
        update public.profiles set coins = coins + 50 where id = v_user;
        award_type := 'rank_top1';
        amount := 50;
        return next;
      exception when unique_violation then null;
      end;
    end if;
  end if;

  return;
end;
$$;

grant execute on function public.claim_coins_for_score(text) to authenticated;

-- 보상형 광고 시청 보너스: 게임당 하루 1회, +2코인.
-- 오늘 이 게임의 daily_play를 이미 받은 사람만 신청할 수 있게 해서(=오늘 플레이한 사람만),
-- 플레이 없이 광고만으로 코인을 파밍하는 걸 막습니다.
create or replace function public.claim_ad_bonus(p_game_id text)
returns table (award_type text, amount integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_played boolean;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select exists (
    select 1 from public.coin_transactions
    where user_id = v_user and game_id = p_game_id and type = 'daily_play' and reward_date = v_today
  ) into v_played;

  if not v_played then
    raise exception 'PLAY_REQUIRED_FIRST';
  end if;

  begin
    insert into public.coin_transactions (user_id, game_id, type, amount, reward_date)
    values (v_user, p_game_id, 'ad_bonus', 2, v_today);
    update public.profiles set coins = coins + 2 where id = v_user;
    award_type := 'ad_bonus';
    amount := 2;
    return next;
  exception when unique_violation then
    raise exception 'AD_BONUS_ALREADY_CLAIMED';
  end;

  return;
end;
$$;

grant execute on function public.claim_ad_bonus(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- likes: 게임별 좋아요(하트). 사용자당 게임당 1개만 (토글 insert/delete).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.likes (
  id uuid primary key default gen_random_uuid(),
  game_id text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (game_id, user_id)
);

alter table public.likes enable row level security;

drop policy if exists "likes_select_own" on public.likes;
create policy "likes_select_own"
  on public.likes for select
  using (auth.uid() = user_id);

drop policy if exists "likes_insert_own" on public.likes;
create policy "likes_insert_own"
  on public.likes for insert
  with check (auth.uid() = user_id);

drop policy if exists "likes_delete_own" on public.likes;
create policy "likes_delete_own"
  on public.likes for delete
  using (auth.uid() = user_id);

-- 좋아요 총 개수는 개인정보가 아니므로 공개 뷰로 집계해서 노출
-- (likes 테이블 자체는 본인 행만 볼 수 있게 제한했지만, 카운트는 누구나 볼 수 있어야 하므로
--  security definer 뷰 대신 함수를 씀 — 뷰는 RLS를 우회하려면 security_invoker=off가 필요해서
--  함수가 더 명확함)
create or replace function public.get_like_counts()
returns table (game_id text, likes bigint)
language sql
security definer
set search_path = public
as $$
  select game_id, count(*) as likes
  from public.likes
  group by game_id;
$$;

grant execute on function public.get_like_counts() to anon, authenticated;

create or replace function public.get_like_count(p_game_id text)
returns bigint
language sql
security definer
set search_path = public
as $$
  select count(*) from public.likes where game_id = p_game_id;
$$;

grant execute on function public.get_like_count(text) to anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- 회원 탈퇴 + 24시간 재가입 제한
-- 실제 탈퇴(계정 삭제)는 /api/delete-account.js 서버리스 함수가
-- service_role 키로 처리합니다 (클라이언트 anon 키로는 auth.users를
-- 지울 수 없음). scores/profiles/likes는 전부 auth.users를 참조하는
-- on delete cascade라 탈퇴 즉시 함께 삭제됩니다.
--
-- deleted_accounts 테이블은 RLS만 켜두고 정책을 하나도 만들지 않아서
-- anon/authenticated는 직접 조회/삽입이 불가능하고, service_role
-- (서버리스 함수) 또는 아래 security definer 함수를 통해서만 접근됩니다.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.deleted_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_user_id text not null,
  deleted_at timestamptz not null default now()
);

create index if not exists deleted_accounts_lookup_idx
  on public.deleted_accounts (provider, provider_user_id, deleted_at);

alter table public.deleted_accounts enable row level security;
-- 의도적으로 select/insert 정책 없음 -> anon/authenticated 전면 차단

create or replace function public.is_recently_deleted(p_provider text, p_provider_user_id text)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.deleted_accounts
    where provider = p_provider
      and provider_user_id = p_provider_user_id
      and deleted_at > now() - interval '24 hours'
  );
$$;

grant execute on function public.is_recently_deleted(text, text) to anon, authenticated;

-- 참고: 게임별로 "말도 안 되는 점수"를 막고 싶다면 이런 식의 체크도 추가할 수 있어요.
-- 예) 반응속도 게임은 사람이 물리적으로 100ms 이하로 반응하기 매우 어려우므로:
--   alter table public.scores add constraint reaction_score_plausible
--     check (game_id <> 'reaction' or (score between 50 and 5000));

-- 게임별 사용 예시:
--   반응속도 테스트 (ms, 낮을수록 좋음)  -> game_id = 'reaction'
--   숫자 맞추기 (시도 횟수, 낮을수록 좋음) -> game_id = 'guess'
--   2048 (점수, 높을수록 좋음)          -> game_id = '2048'
