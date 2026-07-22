-- add_store.sql 실행 이후, Supabase SQL Editor에서 이 파일을 별도로 실행하세요 (idempotent).
--
-- 상점 아이템에 할인율(discount_percent, 0~100)을 추가합니다.
-- store_items.price는 계속 "정가"로 두고, 실제 결제 금액은 정가 * (1 - 할인율/100)로
-- 계산합니다. purchase_store_item()도 함께 갱신해서, 화면에 보이는 할인가와
-- 실제로 차감되는 코인이 항상 일치하도록 만듭니다 (프론트가 정가를 보내도 서버가
-- 할인을 적용해 계산하므로 클라이언트 조작으로 더 싸게 살 수 없습니다).

alter table public.store_items
  add column if not exists discount_percent integer not null default 0
    check (discount_percent >= 0 and discount_percent <= 100);

-- 필요할 때 특정 아이템에 할인을 걸고 싶으면 예: 
--   update public.store_items set discount_percent = 30 where id = 'nickname_gold';
-- 할인을 끄고 싶으면 discount_percent = 0으로 되돌리면 됩니다.

create or replace function public.purchase_store_item(p_item_id text, p_quantity int default 1)
returns table (new_coins int, new_quantity int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_price int;
  v_discount int;
  v_unit_price int;
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

  select price, stackable, coalesce(discount_percent, 0) into v_price, v_stackable, v_discount
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

  -- 정가에서 할인율만큼 뺀 실제 결제 단가 (원 단위 반올림)
  v_unit_price := round(v_price * (100 - v_discount) / 100.0);
  v_total := v_unit_price * p_quantity;

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
  values (v_user, p_item_id, p_quantity, v_unit_price, v_total);

  select coins into new_coins from public.profiles where id = v_user;
  select quantity into new_quantity from public.user_inventory where user_id = v_user and item_id = p_item_id;

  return next;
end;
$$;

grant execute on function public.purchase_store_item(text, int) to authenticated;
