-- ─────────────────────────────────────────────────────────────
-- 이벤트(Events) 시스템
-- Supabase SQL Editor에서 이 파일을 통째로 실행하세요 (idempotent, 재실행 안전).
-- schema.sql이 먼저 실행되어 있어야 합니다 (profiles/coin_transactions/notifications 필요).
--
-- 구성:
--   events              이벤트 카탈로그 (그리드/상세페이지에 노출). store_items와 동일한 원칙으로
--                        클라이언트는 조회만 가능하고, 실제 등록/수정은 SQL Editor 또는
--                        service_role 키를 쓰는 별도 관리자 도구에서만 합니다.
--   event_attendance    이벤트별·유저별·날짜별 출석 기록 (하루 1회, KST 기준)
--
-- type 컬럼으로 이벤트 종류를 구분합니다. 'attendance'는 출석체크 전용 위젯이 상세페이지에
-- 렌더링되고, 그 외(예: 'generic')는 description 텍스트만 보여주는 기본 템플릿을 씁니다.
-- 나중에 새 이벤트 유형이 필요하면 이 check 제약에 값만 추가하면 됩니다.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.events (
  id text primary key,
  type text not null default 'generic' check (type in ('generic', 'attendance')),
  title text not null,
  summary text not null default '',       -- 목록 카드용 한 줄 요약
  description text not null default '',   -- 상세페이지 본문 (generic 템플릿이 그대로 노출)
  icon text,                              -- 카드/상세 헤더용 이모지
  tint text not null default '#ffb703',   -- 카드/상세 포인트 색상 (games.js의 tint와 같은 패턴)
  reward_summary text,                    -- 카드에 배지로 보여줄 짧은 보상 요약 (예: "매일 10코인 · 주말 2배")
  start_at timestamptz,                   -- null이면 시작일 제한 없음
  end_at timestamptz,                     -- null이면 종료일 제한 없음
  sort_order integer not null default 0,
  active boolean not null default true,   -- 관리자 킬스위치 (false면 목록/상세 모두 비공개)
  created_at timestamptz not null default now()
);

alter table public.events enable row level security;

drop policy if exists "events_select_all" on public.events;
create policy "events_select_all"
  on public.events for select
  using (true);
-- insert/update/delete 정책 없음 -> 카탈로그는 SQL Editor(또는 관리자 도구)에서만 관리

create index if not exists events_sort_order_idx on public.events (sort_order);

create table if not exists public.event_attendance (
  user_id uuid not null references auth.users(id) on delete cascade,
  event_id text not null references public.events(id) on delete cascade,
  attend_date date not null,
  reward_amount integer not null,
  is_bonus boolean not null default false, -- 주말 등 배수 지급이었는지 (표시용)
  created_at timestamptz not null default now(),
  primary key (user_id, event_id, attend_date)
);

alter table public.event_attendance enable row level security;

drop policy if exists "event_attendance_select_own" on public.event_attendance;
create policy "event_attendance_select_own"
  on public.event_attendance for select
  using (auth.uid() = user_id);
-- insert 정책 없음 -> claim_event_attendance() 함수로만 생성됨

-- notifications / coin_transactions에 이벤트 보상 타입 추가
-- ⚠️ NOT VALID로 추가합니다: 기존 행을 전부 검증하지 않고 "앞으로의 insert/update"부터만
-- 강제합니다. 프로젝트에 따라 과거에 남아있는 레거시 type 값(예전 테스트 데이터 등) 때문에
-- 일반 add constraint가 "check constraint ... is violated by some row" 에러로 막힐 수 있어서,
-- 기존 데이터는 건드리지 않고 새 값만 허용 목록에 추가하는 안전한 방식을 씁니다.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('score_submitted', 'daily_play_reward', 'daily_rank_reward', 'admin_broadcast', 'event_reward'))
  not valid;

alter table public.coin_transactions drop constraint if exists coin_transactions_type_check;
alter table public.coin_transactions add constraint coin_transactions_type_check
  check (type in (
    'daily_play', 'ad_bonus',
    'rank_top3', 'rank_top2', 'rank_top1',
    'daily_rank_top3', 'daily_rank_top2', 'daily_rank_top1',
    'event_attendance'
  ))
  not valid;

-- 출석 체크 + 코인 지급. 하루 1회(KST 자정 기준), 토/일요일엔 2배 지급.
-- event_attendance의 (user_id, event_id, attend_date) 기본키가 중복 출석을 막아줍니다(멱등).
create or replace function public.claim_event_attendance(p_event_id text)
returns table (reward_amount int, is_bonus boolean, new_coins int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_dow int; -- 0=일요일 ... 6=토요일 (KST 기준)
  v_base_reward constant int := 10;
  v_reward int;
  v_bonus boolean;
  v_event record;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select id, type, active into v_event from public.events where id = p_event_id;
  if v_event.id is null then
    raise exception 'EVENT_NOT_FOUND';
  end if;
  if v_event.type <> 'attendance' then
    raise exception 'NOT_ATTENDANCE_EVENT';
  end if;
  if not v_event.active then
    raise exception 'EVENT_INACTIVE';
  end if;

  v_dow := extract(dow from (now() at time zone 'Asia/Seoul'))::int;
  v_bonus := v_dow in (0, 6);
  v_reward := case when v_bonus then v_base_reward * 2 else v_base_reward end;

  begin
    insert into public.event_attendance (user_id, event_id, attend_date, reward_amount, is_bonus)
    values (v_user, p_event_id, v_today, v_reward, v_bonus);
  exception when unique_violation then
    raise exception 'ALREADY_CHECKED_IN';
  end;

  update public.profiles set coins = coins + v_reward where id = v_user;

  insert into public.coin_transactions (user_id, game_id, type, amount, reward_date)
  values (v_user, p_event_id, 'event_attendance', v_reward, v_today);

  insert into public.notifications (user_id, type, game_id, amount)
  values (v_user, 'event_reward', p_event_id, v_reward);

  select coins into new_coins from public.profiles where id = v_user;

  reward_amount := v_reward;
  is_bonus := v_bonus;
  return next;
end;
$$;

grant execute on function public.claim_event_attendance(text) to authenticated;

-- 상세페이지 달력 렌더링용: 이번 달 내 출석 기록 조회
create or replace function public.get_event_attendance_month(p_event_id text, p_year int, p_month int)
returns table (attend_date date, reward_amount int, is_bonus boolean)
language sql
security definer
set search_path = public
as $$
  select attend_date, reward_amount, is_bonus
  from public.event_attendance
  where user_id = auth.uid()
    and event_id = p_event_id
    and extract(year from attend_date) = p_year
    and extract(month from attend_date) = p_month
  order by attend_date;
$$;

grant execute on function public.get_event_attendance_month(text, int, int) to authenticated;

-- 첫 이벤트: 매일 출석체크 (평일 10코인 / 주말 20코인)
insert into public.events
  (id, type, title, summary, description, icon, tint, reward_summary, sort_order, active)
values (
  'daily-attendance',
  'attendance',
  '매일 출석체크',
  '매일 접속해서 출석하고 코인 받아가세요. 주말엔 2배!',
  '하루 한 번, 출석 버튼만 누르면 코인을 드려요. 평일엔 10코인, 토·일요일엔 2배인 20코인이 지급됩니다. 자정(한국시간) 기준으로 매일 초기화돼요.',
  '📅',
  '#ffb703',
  '매일 10코인 · 주말 2배',
  1,
  true
)
on conflict (id) do update set
  type = excluded.type,
  title = excluded.title,
  summary = excluded.summary,
  description = excluded.description,
  icon = excluded.icon,
  tint = excluded.tint,
  reward_summary = excluded.reward_summary,
  sort_order = excluded.sort_order,
  active = excluded.active;
