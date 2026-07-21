-- ─────────────────────────────────────────────────────────────
-- 마스터(운영자) 계정을 SQL로 직접 생성합니다.
-- "일반로그인" 탭은 회원가입 UI가 없어요 — 오직 이런 식으로 SQL Editor에서
-- 미리 만들어둔 계정만 로그인할 수 있습니다.
--
-- 아이디: master0323
-- 비밀번호: 1q2w3e4r!
-- 기본 코인: 9999
--
-- 아이디 뒤에는 프론트(AuthContext.jsx의 ADMIN_LOGIN_EMAIL_DOMAIN)와 반드시
-- 똑같은 가상 도메인(@mini-arcade.local)을 붙여야 로그인이 됩니다. 실제 메일이
-- 오가는 건 아니고, supabase auth가 이메일 "형식"만 요구해서 붙이는 것뿐이에요.
--
-- ⚠️ auth.users/auth.identities는 Supabase Auth(GoTrue)가 내부적으로 쓰는
-- 테이블이라 공식적으로 "직접 건드리는 걸 권장"하진 않습니다. 혹시 프로젝트의
-- Supabase 버전에 따라 컬럼이 살짝 다르면 이 INSERT가 에러날 수 있어요 — 그럴
-- 땐 아래 "대안" 섹션의 대시보드 방법을 대신 쓰면 100% 안전합니다.
-- ─────────────────────────────────────────────────────────────

create extension if not exists "pgcrypto";

-- 1) auth.users에 계정 생성 (비밀번호는 bcrypt로 해시해서 저장)
--    ⚠️ auth.users.email은 (Supabase 버전에 따라) partial unique index라
--    `on conflict (email)`이 안 먹을 수 있어서, insert ... select ... where not
--    exists(...) 형태로 안전하게 "이미 있으면 그냥 건너뛰기"를 구현합니다.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
)
select
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'master0323@mini-arcade.local',
  crypt('1q2w3e4r!', gen_salt('bf')),
  now(),
  null,
  '',
  null,
  '',
  null,
  '',
  '',
  null,
  null,
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  false,
  now(),
  now(),
  null,
  null,
  '',
  '',
  null,
  '',
  0,
  null,
  '',
  null,
  false,
  null
where not exists (
  select 1 from auth.users where email = 'master0323@mini-arcade.local'
);

-- 2) auth.identities에도 email provider 신원 정보 추가
--    (일부 supabase 클라이언트/대시보드 로직이 identities 존재를 전제로 하는 경우 대비)
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  gen_random_uuid(),
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  u.id::text,
  now(),
  now(),
  now()
from auth.users u
where u.email = 'master0323@mini-arcade.local'
  and not exists (
    select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
  );

-- 3) public.profiles에 마스터 계정 프로필을 코인 9999로 미리 만들어둠
--    (일반적으로는 첫 로그인 시 ensureProfile()이 자동으로 만들지만, 마스터
--    계정은 코인 초기값을 9999로 원하니 미리 만들어두는 편이 확실합니다)
insert into public.profiles (id, nickname, provider, coins)
select u.id, 'master0323', 'email', 9999
from auth.users u
where u.email = 'master0323@mini-arcade.local'
on conflict (id) do update set coins = 9999;

-- ── 확인 ──
-- select id, email, email_confirmed_at from auth.users where email = 'master0323@mini-arcade.local';
-- select * from public.profiles where nickname = 'master0323';

-- ── 비밀번호를 나중에 바꾸고 싶다면 ──
-- update auth.users
-- set encrypted_password = crypt('새비밀번호', gen_salt('bf')), updated_at = now()
-- where email = 'master0323@mini-arcade.local';

-- ── 대안: SQL이 버전 차이로 에러난다면 ──
-- Supabase 대시보드 → Authentication → Users → "Add user" → Email:
-- master0323@mini-arcade.local / Password: 1q2w3e4r! / "Auto Confirm User" 체크
-- 로 만든 뒤, 위 3번 profiles insert 블록만 SQL Editor에서 실행하면 됩니다.
