-- Supabase SQL Editor에서 이 파일만 별도로 실행하세요 (idempotent).
-- ⚠️ schema.sql을 통째로 다시 실행하지 마세요 — get_leaderboard_top 등 다른 함수가
-- 예전 버전으로 되돌아갈 수 있습니다(자세한 내용은 README 참고). 이 파일은 딱
-- claim_coins_for_score() 하나만, 지급액만 1 -> 10으로 바꿔서 재정의합니다.

create or replace function public.claim_coins_for_score(p_game_id text)
returns table (award_type text, amount integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Seoul')::date;
  v_claimed_count int;
  v_extra_allowed int;
  v_max_claims int;
  v_reward constant int := 10; -- 기본 플레이 보상 (예전 1코인 -> 10코인)
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select count(*) into v_claimed_count
  from public.coin_transactions
  where user_id = v_user and game_id = p_game_id and reward_date = v_today and type = 'daily_play';

  select coalesce(extra_allowed, 0) into v_extra_allowed
  from public.daily_retry_allowance
  where user_id = v_user and game_id = p_game_id and reward_date = v_today;

  v_max_claims := 1 + coalesce(v_extra_allowed, 0);

  if v_claimed_count < v_max_claims then
    begin
      insert into public.coin_transactions (user_id, game_id, type, amount, reward_date, claim_seq)
      values (v_user, p_game_id, 'daily_play', v_reward, v_today, v_claimed_count + 1);
      update public.profiles set coins = coins + v_reward where id = v_user;
      insert into public.notifications (user_id, type, game_id, amount)
      values (v_user, 'daily_play_reward', p_game_id, v_reward);
      award_type := 'daily_play';
      amount := v_reward;
      return next;
    exception when unique_violation then
      null; -- 동시 요청으로 같은 슬롯이 이미 채워짐 (안전장치, 중복 지급 방지)
    end;
  end if;

  return;
end;
$$;

grant execute on function public.claim_coins_for_score(text) to authenticated;
