-- add_store.sql 실행 이후, SQL Editor에서 이 파일을 별도로 실행하세요 (idempotent).
--
-- 지금까지는 상점에서 닉네임 컬러/뱃지를 "장착"해도 profiles.equipped_* 컬럼만 바뀌고,
-- 실제로 그 값을 보여주는 곳이 없었습니다. 리더보드는 다른 유저의 데이터를 보여주는
-- 화면이라 프론트에서 그냥 조회할 수 없고, get_leaderboard_top() 자체가 색상/뱃지를
-- 함께 내려줘야 해서 여기서 반환 컬럼을 확장합니다.
--
-- 리턴 타입(컬럼 구성)이 바뀌므로 create or replace 전에 기존 함수를 drop해야 합니다.
drop function if exists public.get_leaderboard_top(text, text, int);

create or replace function public.get_leaderboard_top(p_game_id text, p_order text default 'desc', p_limit int default 10)
returns table (
  user_id uuid,
  nickname text,
  score numeric,
  nickname_color_hex text,
  badge_icon text
)
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
  select
    b.user_id,
    b.nickname,
    b.score,
    nc.color_hex as nickname_color_hex,
    bd.icon as badge_icon
  from best_per_user b
  left join public.profiles p on p.id = b.user_id
  left join public.store_items nc on nc.id = p.equipped_nickname_color
  left join public.store_items bd on bd.id = p.equipped_badge
  order by
    case when p_order = 'asc' then b.score end asc,
    case when p_order = 'desc' then b.score end desc
  limit greatest(p_limit, 0);
$$;

grant execute on function public.get_leaderboard_top(text, text, int) to anon, authenticated;
