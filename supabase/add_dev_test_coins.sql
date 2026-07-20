-- ─────────────────────────────────────────────────────────────
-- ⚠️ 테스트/개발 전용. 로그인한 자신에게 코인을 마음대로 지급하는 치트성 함수입니다.
-- 실서비스 오픈 전에는 이 파일을 실행하지 않거나, 이미 실행했다면 맨 아래
-- "제거" 블록으로 함수를 지워서 완전히 막아주세요.
--
-- 프론트(Store.jsx)는 이 버튼을 useDevToolsAccess()가 허용된 사람(로컬 개발 /
-- IP 허용 목록)에게만 보여주지만, 그건 "버튼을 숨기는" 수준이라 이 함수가
-- DB에 존재하는 한 로그인한 사용자라면 누구나 supabase.rpc()를 직접 호출해서
-- 코인을 받아갈 수 있습니다. 반드시 테스트가 끝나면 제거하세요.
-- ─────────────────────────────────────────────────────────────

create or replace function public.dev_grant_test_coins(p_amount int default 9999)
returns table (new_coins int)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if p_amount is null or p_amount = 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  update public.profiles set coins = greatest(0, coins + p_amount) where id = v_user;

  select coins into new_coins from public.profiles where id = v_user;
  return next;
end;
$$;

grant execute on function public.dev_grant_test_coins(int) to authenticated;

-- ── 테스트가 끝나면 아래 두 줄만 SQL Editor에서 실행해서 완전히 제거하세요 ──
-- revoke execute on function public.dev_grant_test_coins(int) from authenticated;
-- drop function if exists public.dev_grant_test_coins(int);
