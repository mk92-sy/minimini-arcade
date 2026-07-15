-- schema.sql의 "insert into public.games ..." 아래에 추가하거나
-- Supabase SQL Editor에서 이 파일만 별도로 실행해도 됩니다 (idempotent).
-- 엔들리스 러너는 점수가 높을수록 좋은 게임이라 order_direction = 'desc'.
insert into public.games (id, order_direction) values ('runner', 'desc')
on conflict (id) do update set order_direction = excluded.order_direction;
