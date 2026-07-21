-- ─────────────────────────────────────────────────────────────
-- 상점(Store) 시스템
-- Supabase SQL Editor에서 이 파일을 통째로 실행하세요 (idempotent, 재실행 안전).
-- schema.sql이 먼저 실행되어 있어야 합니다 (profiles/coin 관련 테이블 필요).
--
-- 구성:
--   store_items            상품 카탈로그 (이름/가격/카테고리는 전부 임시값 — 나중에 이 테이블만 갱신하면 됨)
--   user_inventory         유저별 보유 수량 (코스메틱은 0/1, 소모품은 여러 개 스택 가능)
--   store_purchases        구매 로그
--   daily_retry_allowance  재도전권으로 늘어난 "게임당 하루 등록 허용 횟수" (오늘의 스토어 스코프 밖,
--                          다음 단계에서 SubmitScoreForm과 연동 예정 — 지금은 DB만 준비해둠)
--
-- 코인 차감/증가는 전부 security definer 함수를 통해서만 일어나서,
-- 클라이언트가 profiles.coins를 직접 조작할 수 없습니다 (기존 코인 시스템과 동일한 원칙).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.store_items (
  id text primary key,
  category text not null check (category in ('cosmetic', 'utility')),
  subcategory text not null check (subcategory in ('nickname_color', 'badge', 'border', 'retry_ticket', 'undo_token')),
  name text not null,
  description text not null default '',
  price integer not null check (price > 0),
  stackable boolean not null default false, -- true: 소모품(여러 개 구매/보유 가능), false: 코스메틱(1개만 보유)
  icon text,       -- 뱃지/소모품용 이모지
  color_hex text,  -- 닉네임 컬러용 헥스코드
  sort_order integer not null default 0,
  active boolean not null default true
);

alter table public.store_items enable row level security;

drop policy if exists "store_items_select_all" on public.store_items;
create policy "store_items_select_all"
  on public.store_items for select
  using (true);
-- insert/update 정책 없음 -> 카탈로그는 SQL Editor에서만 관리 (클라이언트 직접 수정 불가)

-- 이름/가격은 전부 임시값입니다. 나중에 바꾸고 싶으면 이 insert 블록만 값 고쳐서 다시 실행하면 돼요.
insert into public.store_items
  (id, category, subcategory, name, description, price, stackable, icon, color_hex, sort_order)
values
  ('nickname_gold', 'cosmetic', 'nickname_color', '닉네임 컬러: 골드',
    '리더보드/헤더에서 닉네임이 금색으로 표시돼요.', 30, false, null, '#FFD54A', 1),
  ('nickname_neon', 'cosmetic', 'nickname_color', '닉네임 컬러: 네온그린',
    '리더보드/헤더에서 닉네임이 네온그린으로 표시돼요.', 30, false, null, '#39FF88', 2),
  ('nickname_pink', 'cosmetic', 'nickname_color', '닉네임 컬러: 핑크',
    '리더보드/헤더에서 닉네임이 핑크로 표시돼요.', 30, false, null, '#FF6FA5', 3),
  ('badge_fire', 'cosmetic', 'badge', '칭호 뱃지: 🔥',
    '닉네임 옆에 장식용 불꽃 뱃지가 붙어요.', 20, false, '🔥', null, 4),
  ('badge_star', 'cosmetic', 'badge', '칭호 뱃지: ⭐',
    '닉네임 옆에 장식용 별 뱃지가 붙어요.', 20, false, '⭐', null, 5),
  ('badge_crown', 'cosmetic', 'badge', '칭호 뱃지: 👑',
    '닉네임 옆에 장식용 왕관 뱃지가 붙어요.', 40, false, '👑', null, 6),
  ('profile_border_glow', 'cosmetic', 'border', '프로필 테두리 이펙트',
    '헤더의 내 닉네임 버튼에 은은한 테두리 글로우 효과가 생겨요.', 60, false, null, null, 7),
  ('retry_ticket', 'utility', 'retry_ticket', '오늘 재도전권',
    '오늘 하루, 선택한 게임의 랭킹 등록을 한 번 더 할 수 있어요 (게임당 하루 최대 2회).', 15, true, '🎟️', null, 8),
  ('undo_token', 'utility', 'undo_token', '되돌리기 1회',
    '2048에서 마지막 이동을 한 번 취소할 수 있어요.', 10, true, '↩️', null, 9)
on conflict (id) do update set
  category = excluded.category,
  subcategory = excluded.subcategory,
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  stackable = excluded.stackable,
  icon = excluded.icon,
  color_hex = excluded.color_hex,
  sort_order = excluded.sort_order;

-- ─────────────────────────────────────────────────────────────
-- 유저별 보유 수량
-- ─────────────────────────────────────────────────────────────

create table if not exists public.user_inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.store_items(id),
  quantity integer not null default 0 check (quantity >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, item_id)
);

alter table public.user_inventory enable row level security;

drop policy if exists "user_inventory_select_own" on public.user_inventory;
create policy "user_inventory_select_own"
  on public.user_inventory for select
  using (auth.uid() = user_id);
-- insert/update/delete 정책 없음 -> purchase_store_item / use_store_item 함수로만 변경됨

-- ─────────────────────────────────────────────────────────────
-- 구매 로그
-- ─────────────────────────────────────────────────────────────

create table if not exists public.store_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null references public.store_items(id),
  quantity integer not null,
  unit_price integer not null,
  total_price integer not null,
  created_at timestamptz not null default now()
);

alter table public.store_purchases enable row level security;

drop policy if exists "store_purchases_select_own" on public.store_purchases;
create policy "store_purchases_select_own"
  on public.store_purchases for select
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 재도전권으로 늘어난 "게임당 하루 등록 허용 횟수".
-- ⚠️ 이 테이블은 지금 단계에서 준비만 해두는 것이고, scores_enforce_daily_limit
-- 트리거가 이 값을 참고하도록 이미 갱신해뒀습니다. 다만 프론트(SubmitScoreForm/
-- dailyLimit.js)는 아직 "허용 횟수"가 아니라 단순 boolean으로만 동작해서,
-- 재도전권을 실제로 사용해 두 번째 등록 버튼을 다시 띄우는 UI 연동은 다음 단계에서 진행합니다.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.daily_retry_allowance (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id text not null,
  reward_date date not null,
  extra_allowed integer not null default 0,
  primary key (user_id, game_id, reward_date)
);

alter table public.daily_retry_allowance enable row level security;

drop policy if exists "daily_retry_allowance_select_own" on public.daily_retry_allowance;
create policy "daily_retry_allowance_select_own"
  on public.daily_retry_allowance for select
  using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- profiles에 코스메틱 장착 슬롯 3개 추가 (닉네임 컬러 / 뱃지 / 테두리, 각 1개씩만 장착 가능)
-- ─────────────────────────────────────────────────────────────

alter table public.profiles add column if not exists equipped_nickname_color text references public.store_items(id);
alter table public.profiles add column if not exists equipped_badge text references public.store_items(id);
alter table public.profiles add column if not exists equipped_border text references public.store_items(id);

-- ─────────────────────────────────────────────────────────────
-- 하루 등록 제한 트리거 갱신: 재도전권으로 늘어난 허용 횟수(daily_retry_allowance)를 반영.
-- schema.sql의 scores_enforce_daily_limit()를 대체합니다 (트리거는 그대로, 함수 내용만 교체).
-- ─────────────────────────────────────────────────────────────

create or replace function public.scores_enforce_daily_limit()
returns trigger as $$
declare
  existing_count int;
  v_extra_allowed int;
  v_kst_time time;
  v_kst_date date;
begin
  v_kst_time := (now() at time zone 'Asia/Seoul')::time;
  if v_kst_time >= time '23:00:00' then
    raise exception 'RANKING_LOCKED' using errcode = 'P0001';
  end if;

  v_kst_date := (now() at time zone 'Asia/Seoul')::date;

  select count(*) into existing_count
  from public.scores
  where game_id = new.game_id
    and user_id = new.user_id
    and (created_at at time zone 'Asia/Seoul')::date = v_kst_date;

  select coalesce(dra.extra_allowed, 0) into v_extra_allowed
  from public.daily_retry_allowance dra
  where dra.user_id = new.user_id and dra.game_id = new.game_id and dra.reward_date = v_kst_date;

  if existing_count >= (1 + coalesce(v_extra_allowed, 0)) then
    raise exception 'DAILY_LIMIT_REACHED' using errcode = 'P0001';
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- ─────────────────────────────────────────────────────────────
-- 구매: 코인 차감 + 인벤토리 적립 + 로그, 전부 하나의 트랜잭션(함수)으로 처리
-- ─────────────────────────────────────────────────────────────

create or replace function public.purchase_store_item(p_item_id text, p_quantity int default 1)
returns table (new_coins int, new_quantity int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_price int;
  v_stackable boolean;
  v_total int;
  v_current_coins int;
  v_already_owned boolean;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'INVALID_QUANTITY';
  end if;

  select price, stackable into v_price, v_stackable
  from public.store_items where id = p_item_id and active;

  if v_price is null then
    raise exception 'ITEM_NOT_FOUND';
  end if;

  if not v_stackable then
    if p_quantity <> 1 then
      raise exception 'INVALID_QUANTITY';
    end if;
    select exists(
      select 1 from public.user_inventory where user_id = v_user and item_id = p_item_id
    ) into v_already_owned;
    if v_already_owned then
      raise exception 'ALREADY_OWNED';
    end if;
  end if;

  v_total := v_price * p_quantity;

  select coins into v_current_coins from public.profiles where id = v_user for update;
  if v_current_coins is null or v_current_coins < v_total then
    raise exception 'INSUFFICIENT_COINS';
  end if;

  update public.profiles set coins = coins - v_total where id = v_user;

  insert into public.user_inventory (user_id, item_id, quantity, updated_at)
  values (v_user, p_item_id, p_quantity, now())
  on conflict (user_id, item_id)
  do update set quantity = public.user_inventory.quantity + excluded.quantity, updated_at = now();

  insert into public.store_purchases (user_id, item_id, quantity, unit_price, total_price)
  values (v_user, p_item_id, p_quantity, v_price, v_total);

  select coins into new_coins from public.profiles where id = v_user;
  select quantity into new_quantity from public.user_inventory where user_id = v_user and item_id = p_item_id;

  return next;
end;
$$;

grant execute on function public.purchase_store_item(text, int) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 장착/해제 토글: 코스메틱 카테고리만 가능, 보유 확인 후 subcategory에 맞는 슬롯에 반영.
-- 이미 장착된 아이템을 다시 누르면 해제됩니다.
-- ─────────────────────────────────────────────────────────────

create or replace function public.equip_store_item(p_item_id text)
returns table (equipped_nickname_color text, equipped_badge text, equipped_border text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_category text;
  v_subcategory text;
  v_owned boolean;
  v_current text;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select category, subcategory into v_category, v_subcategory
  from public.store_items where id = p_item_id;

  if v_category is null then
    raise exception 'ITEM_NOT_FOUND';
  end if;
  if v_category <> 'cosmetic' then
    raise exception 'NOT_EQUIPPABLE';
  end if;

  select exists(
    select 1 from public.user_inventory where user_id = v_user and item_id = p_item_id
  ) into v_owned;
  if not v_owned then
    raise exception 'ITEM_NOT_OWNED';
  end if;

  if v_subcategory = 'nickname_color' then
    select p.equipped_nickname_color into v_current from public.profiles p where id = v_user;
    update public.profiles
      set equipped_nickname_color = case when v_current = p_item_id then null else p_item_id end
      where id = v_user;
  elsif v_subcategory = 'badge' then
    select p.equipped_badge into v_current from public.profiles p where id = v_user;
    update public.profiles
      set equipped_badge = case when v_current = p_item_id then null else p_item_id end
      where id = v_user;
  elsif v_subcategory = 'border' then
    select p.equipped_border into v_current from public.profiles p where id = v_user;
    update public.profiles
      set equipped_border = case when v_current = p_item_id then null else p_item_id end
      where id = v_user;
  else
    raise exception 'UNKNOWN_SUBCATEGORY';
  end if;

  return query
    select p.equipped_nickname_color, p.equipped_badge, p.equipped_border
    from public.profiles p where id = v_user;
end;
$$;

grant execute on function public.equip_store_item(text) to authenticated;

-- ─────────────────────────────────────────────────────────────
-- 소모: utility 카테고리만 가능, 재고 1 차감. retry_ticket은 game_id가 필수이며
-- daily_retry_allowance에 +1을 쌓아둡니다. 상품 설명("게임당 하루 최대 2회")과
-- 맞춰서, 하루에 재도전권으로 늘릴 수 있는 한도는 딱 1(=기본 1회 + 재도전 1회)로
-- 못박아둡니다 — 이미 오늘 다 썼으면 아이템을 아예 차감하지 않고 거부합니다.
-- ─────────────────────────────────────────────────────────────

create or replace function public.use_store_item(p_item_id text, p_game_id text default null)
returns table (remaining_quantity int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_category text;
  v_subcategory text;
  v_qty int;
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_current_extra int;
  v_max_extra_per_day constant int := 1;
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select category, subcategory into v_category, v_subcategory
  from public.store_items where id = p_item_id;

  if v_category is null then
    raise exception 'ITEM_NOT_FOUND';
  end if;
  if v_category <> 'utility' then
    raise exception 'NOT_CONSUMABLE';
  end if;

  if v_subcategory = 'retry_ticket' and p_game_id is null then
    raise exception 'GAME_ID_REQUIRED';
  end if;

  -- retry_ticket은 재고를 차감하기 "전에" 오늘 한도를 먼저 확인 -> 한도 초과면
  -- 아이템을 잃지 않고 그대로 거부됨.
  if v_subcategory = 'retry_ticket' then
    select dra.extra_allowed into v_current_extra
    from public.daily_retry_allowance dra
    where dra.user_id = v_user and dra.game_id = p_game_id and dra.reward_date = v_today;

    if coalesce(v_current_extra, 0) >= v_max_extra_per_day then
      raise exception 'RETRY_LIMIT_REACHED';
    end if;
  end if;

  select quantity into v_qty from public.user_inventory
  where user_id = v_user and item_id = p_item_id
  for update;

  if v_qty is null or v_qty <= 0 then
    raise exception 'ITEM_NOT_OWNED';
  end if;

  update public.user_inventory
    set quantity = quantity - 1, updated_at = now()
    where user_id = v_user and item_id = p_item_id;

  if v_subcategory = 'retry_ticket' then
    insert into public.daily_retry_allowance (user_id, game_id, reward_date, extra_allowed)
    values (v_user, p_game_id, v_today, 1)
    on conflict (user_id, game_id, reward_date)
    do update set extra_allowed = least(v_max_extra_per_day, public.daily_retry_allowance.extra_allowed + 1);
  end if;

  select quantity into v_qty from public.user_inventory
  where user_id = v_user and item_id = p_item_id;

  remaining_quantity := coalesce(v_qty, 0);
  return next;
end;
$$;

grant execute on function public.use_store_item(text, text) to authenticated;
