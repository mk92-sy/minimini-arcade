-- schema.sql의 "insert into public.games ... ('reaction', 'asc')" 아래에 추가하거나
-- Supabase SQL Editor에서 이 파일만 별도로 실행해도 됩니다 (idempotent).
-- 숫자 맞추기는 시도 횟수가 낮을수록 좋은 게임이라 order_direction = 'asc'.
insert into public.games (id, order_direction) values ('guess', 'asc')
on conflict (id) do update set order_direction = excluded.order_direction;
