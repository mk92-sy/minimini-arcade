# Mini Arcade

React + Vite(JS, no TypeScript)로 만든 8개 미니 웹게임 허브.

- 메인 화면(아케이드 로비) 구성 완료
- 첫 번째 게임 **반응속도 테스트** 구현 완료 (`/game/reaction`)
- 나머지 7개는 `/game/:id` 경로에서 "OUT OF ORDER" 플레이스홀더로 표시됨
- 랭킹 / 회원가입·로그인 / SNS 공유는 **모든 게임이 공유하는 공통 컴포넌트**로 분리해뒀어요
- 랭킹 등록은 **로그인한 회원만** 가능 (구글 / 카카오)

## 로컬 실행

```bash
npm install
cp .env.example .env   # Supabase 정보 채워넣기
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

⚠️ `npm run dev`(Vite)는 `/api/*` 서버리스 함수(회원 탈퇴, 개발자도구 가드)를 실행하지 않아요. 로컬에서 이 기능들까지 테스트하려면:

```bash
npm i -g vercel
vercel dev
```

`vercel dev`는 `.env`를 자동으로 안 읽으니, Vercel 프로젝트와 연결(`vercel link`) 후 `vercel env pull`로 환경변수를 받아오거나, 직접 `.env`를 만들어서 `--listen` 옵션과 함께 써야 해요.

## Supabase 설정 (DB + 로그인)

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. 프로젝트의 **SQL Editor**에서 `supabase/schema.sql` 내용을 그대로 실행
   → `profiles` 테이블(닉네임) + `scores` 테이블(랭킹) + RLS 정책 + 하루 1회 제한 트리거 생성
   - 이미 이전 버전 스키마를 실행했던 프로젝트라면, 그냥 **다시 한 번 통째로 실행**하면 됩니다 (전부 `if not exists` / `drop ... if exists` + `create`라 안전하게 재실행 가능하고, 기존 랭킹 데이터도 유지돼요)
3. **Settings → API**에서 `Project URL`과 `anon public` 키를 복사해 `.env`에 채우기
4. 아래 "회원가입/로그인 설정"을 따라 구글·카카오 로그인을 켜기

`.env`가 비어 있어도 앱 자체는 정상 동작해요 — 랭킹 조회만 되고 로그인/등록은 "연결 안 됨" 상태로 표시됩니다.

### 회원가입/로그인 설정 (구글 · 카카오)

구글/카카오 로그인은 **Supabase Auth가 공식 지원하는 OAuth Provider**를 그대로 쓰기 때문에, 우리 코드에는 별도 클라이언트 키가 필요 없어요. Supabase 대시보드에서 provider를 켜고 발급받은 키를 등록하기만 하면 됩니다.

**공통: Supabase Auth 콜백 URL 확인**
`https://<프로젝트-ref>.supabase.co/auth/v1/callback` — Supabase 대시보드 **Authentication → URL Configuration**에서 확인 가능. 구글/카카오 콘솔 양쪽 다 이 URL을 "리디렉션 URI"로 등록해야 해요.

**구글**
1. [Google Cloud Console](https://console.cloud.google.com) → OAuth 동의 화면 설정 (외부/테스트 또는 게시)
2. 사용자 인증 정보 → OAuth 클라이언트 ID 생성 (애플리케이션 유형: 웹 애플리케이션)
3. 승인된 리디렉션 URI에 위 Supabase 콜백 URL 등록
4. 발급된 클라이언트 ID/보안 비밀번호를 Supabase 대시보드 **Authentication → Providers → Google**에 입력하고 활성화

**카카오**
1. [Kakao Developers](https://developers.kakao.com) → 애플리케이션 추가
2. 제품 설정 → **카카오 로그인** 활성화, Redirect URI에 위 Supabase 콜백 URL 등록
3. 앱 설정 → 플랫폼 → Web에 배포 도메인 등록 (`https://minimini-arcade.vercel.app`, 로컬 테스트용 `http://localhost:5173`)
4. 앱 키의 **REST API 키**와, 보안 → Client Secret(발급 후 "사용함")을 Supabase 대시보드 **Authentication → Providers → Kakao**에 입력하고 활성화

> ⚠️ Supabase는 카카오 로그인 시 기본적으로 `account_email`, `profile_image`, `profile_nickname` 세 가지 동의항목을 한꺼번에 요청해요. 이 중 `account_email`은 카카오 비즈니스 앱 전환 + 검수를 받아야 쓸 수 있는 항목이라, 안 받아둔 상태로 로그인을 시도하면 `KOE205` 에러가 납니다. 이 프로젝트는 카카오 프로필 정보를 아예 안 쓰고(닉네임은 자체 랜덤 생성) 있어서, `AuthContext.jsx`의 `signInWithKakao`에서 `scopes: 'profile_nickname'`만 요청하도록 최소화해뒀어요 — 카카오 개발자 콘솔에서 `profile_nickname` 동의항목만 켜져 있으면(대부분 기본 활성화) 별도 비즈니스 전환 없이 바로 동작합니다.

**Supabase Auth URL 설정**
**Authentication → URL Configuration**에서
- Site URL: `https://minimini-arcade.vercel.app`
- Redirect URLs: `https://minimini-arcade.vercel.app`, `http://localhost:5173` 둘 다 추가 (로컬 개발도 되게)

### 닉네임 규칙

- 최초 로그인 시 자동으로 랜덤 닉네임이 생성돼요: **랜덤 문자열 10글자 + provider suffix** (구글 로그인 → `g`, 카카오 로그인 → `k`). 로그인 버튼(우측 상단) 클릭 → "닉네임 변경"에서 원하는 이름으로 바꿀 수 있어요.
- 최대 길이는 **한글 12자(24바이트)**예요. 한글/이모지 등은 2바이트, 영문·숫자·기호는 1바이트로 계산하는 한국 웹에서 흔한 방식이라, 한글로만 채우면 12자, 영문으로만 채우면 24자까지 가능해요. 이 검증은 `src/lib/nicknameValidation.js`에서 하고, 입력창에 실시간 바이트 카운터가 떠요.
- ⚠️ 부적절한 닉네임(욕설·비방·광고성 문구 등)은 별도 경고 없이 계정이 삭제될 수 있다는 안내 문구를 닉네임 변경 화면에 표시해뒀어요. 다만 이건 어디까지나 **안내 문구**이고, 실제로 부적절한 닉네임을 자동으로 걸러내거나 삭제하는 필터/모더레이션 로직은 아직 구현되어 있지 않아요 — 신고 기능이나 관리자 검토 프로세스가 필요하면 별도로 요청해주세요.

### 랭킹은 회원만 등록 가능

- `scores` 테이블의 insert RLS 정책이 `auth.uid() = user_id`를 요구해서, 로그인하지 않은 요청은 애초에 DB가 거부합니다.
- 로그아웃 상태에서 게임 결과 화면에 가면 "랭킹 등록은 로그인 후 이용할 수 있어요" 안내와 로그인 버튼만 보이고, 로그인하면 자동으로 프로필 닉네임으로 등록 폼이 나타나요.

### 하루 1회 랭킹 등록 제한

- DB 트리거(`scores_enforce_daily_limit`)가 같은 `game_id`에 대해 오늘(한국시간 KST 기준) 이미 같은 `user_id`로 등록한 기록이 있으면 insert 자체를 거부합니다. 로그인 기반이라 예전 IP 방식보다 훨씬 신뢰도가 높아요.
- 프론트(`SubmitScoreForm`)는 등록 버튼 클릭 시 "하루에 한 번만 가능해요" 확인 다이얼로그를 띄우고, 성공/거부 이후에는 버튼을 비활성화합니다. `localStorage`에도 게임+**계정**+날짜 단위로 오늘 등록 여부를 기록해서(UX 편의용) 새로고침해도 폼이 다시 안 뜨게 했어요 — 실제 방어선은 어디까지나 DB 트리거입니다.
- ⚠️ **수정된 버그 2개**: (1) 로컬 캐시 키에 계정 구분이 빠져있어서, 같은 브라우저에서 다른 계정으로 로그인해도 이전 계정의 등록 여부를 보여주던 문제 → 캐시 키에 `user_id`를 포함하도록 수정. (2) 날짜 계산이 UTC 기준이라 실제로는 한국시간 오전 9시에 풀리던 문제(DB 트리거도 동일) → 클라이언트/DB 둘 다 `Asia/Seoul` 자정 기준으로 통일. 이 수정을 반영하려면 `schema.sql`을 다시 실행해야 트리거가 갱신됩니다.

### 회원 탈퇴 (계정 완전 삭제 + 24시간 재가입 제한)

- 로그인 모달의 "내 계정" 화면 하단에 작은 "회원 탈퇴" 링크가 있어요. 누르면 확인 다이얼로그가 뜨고, 확정하면 실제로 계정이 삭제됩니다.
- anon 키로는 `auth.users`를 직접 지울 수 없어서, `/api/delete-account.js`라는 **Vercel 서버리스 함수**가 `service_role` 키로 대신 처리해요. 요청 시 현재 로그인 세션의 access token을 서버에서 검증한 뒤, 본인 계정만 삭제할 수 있게 했어요.
- `profiles` / `scores` / `likes` 테이블은 전부 `auth.users`를 참조하는 `on delete cascade`라, 계정이 삭제되는 즉시 랭킹 기록과 좋아요도 함께 지워집니다.
- 삭제 직전에 `deleted_accounts` 테이블에 (provider, provider의 유저 id)를 기록해두고, 이후 24시간 안에 같은 구글/카카오 계정으로 로그인을 시도하면 `is_recently_deleted()` DB 함수로 감지해서 즉시 로그아웃시키고 "탈퇴 후 24시간이 지나야 재가입할 수 있어요" 메시지를 보여줘요. `deleted_accounts` 테이블 자체는 RLS만 걸려있고 정책이 하나도 없어서, service_role(서버) 또는 이 security-definer 함수를 통해서만 접근 가능합니다.
- 이 기능을 쓰려면 `.env`(로컬) 및 Vercel 환경변수에 `SUPABASE_SERVICE_ROLE_KEY`를 추가해야 해요 (아래 "환경변수 정리" 참고).

### 랭킹 표시 (최대 10위 + 메달 + 내 순위 + 1시간 캐시)

- 최대 10위까지만 보여주고, 1·2·3위는 금/은/동 메달 아이콘으로 표시돼요.
- top-10과 "내 순위"는 둘 다 **한 사람의 베스트 기록만** 집계해요(`get_leaderboard_top` / `get_my_rank` DB 함수). 하루 1회 제한 때문에 한 사람이 여러 날에 걸쳐 여러 행을 가질 수 있는데, 그걸 그대로 보여주면 같은 사람이 순위표를 도배하는 것처럼 보일 수 있어서 이렇게 통일했어요.
- 리스트 아래에는 로그인한 사용자의 **내 순위 박스**가 항상 떠요: "내 순위 N위 · 총 M명 중 상위 P%". 아직 기록이 없으면 "아직 등록한 기록이 없어요", 로그아웃 상태면 "로그인하면 내 순위를 확인할 수 있어요"가 표시돼요.
- 실시간 조회가 아니라 **1시간 단위로 캐시**돼요: 처음 불러올 때 `localStorage`에 결과(top-10 + 내 순위)와 조회 시각을 함께 저장해두고, 1시간이 지나기 전까지는 새로고침해도 Supabase에 다시 요청하지 않습니다. 리더보드 위에 "⏱ 랭킹은 1시간마다 업데이트돼요 · 마지막 업데이트 HH:MM" 안내 문구가 항상 떠요.
- 단, **내가 방금 점수를 등록했을 때는 예외**예요. 데이터가 확실히 바뀐 시점이니 그 순간만 캐시를 건너뛰고 강제로 새로 불러온 뒤, 그 결과로 캐시를 다시 채워서 다음 1시간은 또 캐시를 씁니다 (`Leaderboard`의 `refreshSignal` prop, `SubmitScoreForm`의 `onSubmitted` 콜백으로 연결돼 있어요). 좋아요 토글이나 단순 새로고침 등 "데이터가 안 바뀐 게 확실한" 경우는 계속 캐시를 씁니다.
- 데스크탑(뷰포트 860px 이상)에서는 게임 화면 오른쪽에 고정 표시되고, 모바일에서는 게임 아래로 쌓여요.

### 좋아요(하트) & 도전자 수

- 게임 페이지에는 하트 버튼이 있어서(로그인 필요) 좋아요를 토글할 수 있어요. `likes` 테이블에 게임당 사용자당 1행만 허용해서 중복 좋아요를 막습니다.
- 메인 화면의 각 게임 카드에도 하트 수와 "도전자 수"(그 게임에 랭킹을 등록한 적 있는 고유 사용자 수, `game_participant_counts` 뷰)가 함께 표시돼요.
- 도전자 수가 9,999명을 넘으면 "9,999+"로 표시됩니다(`formatChallengerCount`).
- `likes` 테이블 자체는 RLS로 본인 행만 조회 가능하지만, 총 개수는 `get_like_count(s)` DB 함수(security definer)로 공개 집계해서 누구나 볼 수 있게 했어요.

### 개발자도구 접근 제한 (허용 IP 제외)

- `/api/devtools-guard.js`가 Vercel 서버리스 함수로 배포되어, 요청자의 실제 IP를 서버에서 확인하고 `DEVTOOLS_ALLOWED_IPS`(서버 전용 env, 콤마로 여러 개 가능)에 있는 IP에만 개발자도구를 허용합니다.
- 허용되지 않은 방문자에게는 우클릭 메뉴 차단 + F12 / Ctrl(Cmd)+Shift+I,J,C / Ctrl+U 같은 단축키 차단이 걸려요.
- **로컬 개발(`npm run dev`)에서는 항상 꺼져 있어요.**
- Vercel **Project Settings → Environment Variables**에 `DEVTOOLS_ALLOWED_IPS`를 본인 맥의 공인 IP로 등록하세요 (확인: https://whatismyip.com).
- ⚠️ 완벽 차단이 아니라 가벼운 저지선이에요. 진짜 부정 등록 방지는 위의 "하루 1회 제한" DB 트리거가 담당합니다.

### SNS 공유

- `ShareButton`은 아이콘 전용 버튼들로 구성됩니다: 공유하기(Web Share API, 지원 브라우저에서만 노출), X(트위터), Facebook, 링크 복사(성공 시 체크 아이콘으로 전환).
- 카카오톡 공유 버튼은 제거했어요 — "공유하기" 버튼을 누르면 뜨는 시스템 공유 시트에 카카오톡이 이미 포함되어 있어서 중복이었습니다.
- 게임 진행 상태(대기/성공/실패)와 상관없이 항상 보여요. 결과가 있을 때는 점수를 포함한 문구로, 없을 때는 게임 홍보 문구로 자동 전환됩니다.

### 랭킹 등록 다이얼로그 규칙

- 등록이 **가능한** 상황(로그인 + 오늘 미등록)에서만 "랭킹 등록" 버튼이 나타나고, 클릭하면 확인 다이얼로그("등록하시겠습니까?")가 떠요.
- 등록이 **불가능한** 상황(비로그인 / 오늘 이미 등록함)에서는 다이얼로그 없이, 게임 하단에 이유를 설명하는 안내 메시지만 보여줍니다.

## 환경변수 정리


| 변수 | 어디에 필요한가 | 필수 여부 |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | 로그인 · 랭킹 조회/등록 | 없으면 전부 비활성 |
| `SUPABASE_SERVICE_ROLE_KEY` | 회원 탈퇴 처리 (`/api/delete-account.js`, 서버 전용) | 없으면 탈퇴 버튼 클릭 시 에러 |
| `DEVTOOLS_ALLOWED_IPS` | 개발자도구 가드 예외 IP (서버 전용, Vercel 대시보드에 등록) | 없으면 모든 방문자에게 가드 적용 |

구글/카카오 로그인 키는 `.env`가 아니라 **Supabase 대시보드**에 등록합니다 (위 "회원가입/로그인 설정" 참고).

## Vercel 배포

1. GitHub에 이 프로젝트를 올리기
2. [vercel.com](https://vercel.com)에서 New Project → 해당 레포 선택
3. Framework Preset: **Vite** 자동 인식 (Build: `vite build`, Output: `dist`)
4. Environment Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DEVTOOLS_ALLOWED_IPS`(선택) 추가
5. Deploy

`vercel.json`은 `/game/*` 경로만 명시적으로 `index.html`로 rewrite해서, `/game/reaction` 새로고침해도 404가 안 뜹니다. `/api/*`는 애초에 규칙 대상이 아니라 항상 정상 동작합니다.

## 구조

```
api/
  devtools-guard.js         # Vercel 서버리스 함수: 요청 IP가 허용 목록인지 확인
  delete-account.js          # Vercel 서버리스 함수: service_role로 계정 완전 삭제
supabase/
  schema.sql                 # profiles/scores/likes/deleted_accounts 테이블, RLS, DB 함수들
src/
  context/
    AuthContext.jsx           # 로그인 세션/프로필 상태, 로그인 모달, 탈퇴, 재가입 차단 체크
  hooks/
    useDevToolsAccess.js      # /api/devtools-guard 호출해서 가드 on/off 판단
    useDevToolsGuard.js       # 우클릭/단축키 차단 (가벼운 저지선)
  lib/
    supabaseClient.js         # Supabase 클라이언트 (env 없으면 null)
    scores.js                  # fetchLeaderboard / fetchMyRank / submitScore (로그인 필요)
    profile.js                  # 프로필 조회/생성/닉네임 변경
    nickname.js                  # 랜덤 닉네임 생성 (10글자 + g/k)
    nicknameValidation.js         # 닉네임 바이트 길이 검증 (한글 12자/24바이트)
    likes.js                       # 좋아요 토글 + 개수 조회
    gameStats.js                    # 홈 화면 카드용 좋아요/도전자 수 집계
    dailyLimit.js                    # 로컬 "오늘 등록했는지" 캐시 (UX 편의용)
  data/games.js                  # 8개 게임 메타데이터
  components/
    GameCard.jsx, CabinetIcon.jsx   # 메인 화면 전용 (좋아요/도전자 수 표시 포함)
    common/                          # 게임 공통 컴포넌트
      GameShell.jsx                  # 게임 페이지 공통 헤더/뒤로가기 (wide 옵션: 2단 레이아웃)
      AuthButton.jsx                  # 우측 상단 고정 로그인/계정 버튼
      AuthModal.jsx                    # 로그인(구글/카카오) · 계정(닉네임 변경, 탈퇴, 로그아웃) 모달
      Leaderboard.jsx                   # 랭킹 보드 (최대 10위, 메달, 내 순위 박스, 1시간 캐시)
      SubmitScoreForm.jsx               # 점수 등록 (로그인 필요 + 확인 다이얼로그 + 하루 제한)
      LikeButton.jsx                     # 좋아요(하트) 토글 버튼
      ConfirmDialog.jsx                   # 범용 확인 다이얼로그
      ShareButton.jsx                      # SNS 공유 (아이콘 전용)
      icons.jsx                             # 공유/로그인/좋아요 버튼용 SVG 아이콘 세트
  games/
    ReactionGame.jsx          # 반응속도 테스트 (완성, 2단 레이아웃 적용)
  pages/
    Home.jsx, GamePlaceholder.jsx
  styles/index.css
```

### 코인 시스템

- 지급 규칙: 게임별 플레이(점수 등록) 시 1코인(게임당 하루 1회) / 적립 단계에서 광고 시청(선택) 시 +2코인(게임당 하루 1회) / 그 게임 이번 시즌 첫 3위 10·2위 20·1위 50코인(게임당·시즌당 1회, `coin_transactions`의 unique 인덱스로 중복 방지). 모두 KST 00시 기준으로 리셋돼요.
- 순위 마일스톤은 시즌(분기)이 바뀌면 다시 받을 수 있어요. 같은 시즌 안에서는 순위가 오르내려도(예: 2위→5위→2위) 이미 받은 등수는 다시 지급되지 않아요.
- ⚠️ 광고 시청은 아직 실제 광고 SDK 연동 전이라 `src/lib/coins.js`에서 3초 대기로 시뮬레이션만 해요. 실제 광고(애드몹/카카오 애드핏 등) 붙일 때 그 부분만 SDK 콜백으로 바꾸면 됩니다.
- 지급되면 모달로 안내하고, 우측 상단 버튼에 코인 잔액이 항상 표시돼요.
- 랭킹은 실제로 지우지 않고 `scores.season`(예: `2026-Q3`) 컬럼으로 필터링해서 "분기가 바뀌면 자동으로 리셋된 것처럼" 보이게 했어요. 코인 마일스톤도 같은 season 값을 기준으로 리셋돼요.
- 새 게임 추가 시 `public.games` 테이블에 `(id, order_direction)` 행을 하나 추가해야 코인 마일스톤 판정이 정확히 동작해요.



### 공통 헤더 & 하단 메뉴

- `Header.jsx`: sticky 상단 헤더. 홈에서는 로고, `/game/:id`에서는 뒤로가기+게임 제목을 자동으로 보여줘요(URL만 보고 `games.js`에서 찾음, 게임 컴포넌트가 title을 따로 넘길 필요 없음). 오른쪽엔 항상 `AuthButton`(로그인/코인/닉네임).
- `BottomNav.jsx`: 게임/상점/알림/설정 4탭, 고정. 현재 경로로 활성 탭을 자동 판정(게임 탭은 `/`와 `/game/*` 둘 다 활성).
- 상점·알림 페이지는 "COMING SOON" 안내만 있는 자리 표시자예요 (`ComingSoon.jsx` 공용 컴포넌트).
- 닉네임 변경은 계정 모달에서 `/settings` 페이지로 옮겼어요. 모달에는 "설정에서 변경" 버튼만 남아있어요.

## 다음 게임 만들 때

1. `src/games/`에 새 게임 컴포넌트 작성
2. `App.jsx`에 `/game/<id>` 라우트 추가 (GamePlaceholder보다 위에 둘 것)
3. `GameShell`에 `wide` prop을 주고, 안에 `.game-layout` / `.game-layout__main` / `.game-layout__side`로 게임 화면과 `Leaderboard`를 나눠 배치하면 데스크탑에서 자동으로 오른쪽 사이드바가 됨
4. 랭킹이 필요하면 `Leaderboard` / `SubmitScoreForm`을 그대로 가져다 쓰고 `gameId`와 `order`(점수가 낮을수록 좋은 게임이면 `'asc'`, 높을수록 좋으면 `'desc'`)만 맞춰주면 됨. `SubmitScoreForm`에는 `useAuth()`의 `openAuthModal`을 `onRequestLogin`으로 넘겨주세요.
5. 공유 문구만 게임에 맞게 바꿔서 `ShareButton`에 넘기면 끝 (항상 노출되므로 결과가 없을 때의 기본 문구도 챙기기)
6. `LikeButton gameId="<id>" onRequestLogin={openAuthModal}`도 같은 자리에 놔두면 좋아요 기능이 그대로 딸려옴 (메인 화면 카드의 좋아요/도전자 수는 `game_participant_counts` 뷰와 `get_like_counts()` 함수가 자동으로 집계하므로 별도 설정 불필요)

> 참고: 이 샌드박스는 외부 네트워크가 막혀 있어서 `npm install` / 빌드를 직접 실행해 검증하지 못했어요. 로컬에서 `npm install && npm run dev`로 확인해보시고, 에러 있으면 바로 고쳐드릴게요.
