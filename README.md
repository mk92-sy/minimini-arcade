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

**Supabase Auth URL 설정**
**Authentication → URL Configuration**에서
- Site URL: `https://minimini-arcade.vercel.app`
- Redirect URLs: `https://minimini-arcade.vercel.app`, `http://localhost:5173` 둘 다 추가 (로컬 개발도 되게)

### 닉네임 규칙

최초 로그인 시 자동으로 랜덤 닉네임이 생성돼요: **랜덤 문자열 10글자 + provider suffix** (구글 로그인 → `g`, 카카오 로그인 → `k`). 로그인 버튼(우측 상단) 클릭 → "닉네임 변경"에서 원하는 이름으로 바꿀 수 있어요.

### 랭킹은 회원만 등록 가능

- `scores` 테이블의 insert RLS 정책이 `auth.uid() = user_id`를 요구해서, 로그인하지 않은 요청은 애초에 DB가 거부합니다.
- 로그아웃 상태에서 게임 결과 화면에 가면 "랭킹 등록은 로그인 후 이용할 수 있어요" 안내와 로그인 버튼만 보이고, 로그인하면 자동으로 프로필 닉네임으로 등록 폼이 나타나요.

### 하루 1회 랭킹 등록 제한

- DB 트리거(`scores_enforce_daily_limit`)가 같은 `game_id`에 대해 오늘 이미 같은 `user_id`로 등록한 기록이 있으면 insert 자체를 거부합니다. 로그인 기반이라 예전 IP 방식보다 훨씬 신뢰도가 높아요.
- 프론트(`SubmitScoreForm`)는 등록 버튼 클릭 시 "하루에 한 번만 가능해요" 확인 다이얼로그를 띄우고, 성공/거부 이후에는 버튼을 비활성화합니다. `localStorage`에도 오늘 등록 여부를 기록해서(UX 편의용) 새로고침해도 폼이 다시 안 뜨게 했어요 — 실제 방어선은 어디까지나 DB 트리거입니다.

### 랭킹 표시 (최대 10위 + 메달 + 1시간 캐시)

- 최대 10위까지만 보여주고, 1·2·3위는 금/은/동 메달 아이콘으로 표시돼요.
- 실시간 조회가 아니라 **1시간 단위로 캐시**돼요: 처음 불러올 때 `localStorage`에 결과와 조회 시각을 저장해두고, 1시간이 지나기 전까지는 새로고침해도 Supabase에 다시 요청하지 않습니다. 리더보드 위에 "⏱ 랭킹은 1시간마다 업데이트돼요 · 마지막 업데이트 HH:MM" 안내 문구가 항상 떠요.
- 데스크탑(뷰포트 860px 이상)에서는 게임 화면 오른쪽에 고정 표시되고, 모바일에서는 게임 아래로 쌓여요.

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

## 환경변수 정리

| 변수 | 어디에 필요한가 | 필수 여부 |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | 로그인 · 랭킹 조회/등록 | 없으면 전부 비활성 |
| `DEVTOOLS_ALLOWED_IPS` | 개발자도구 가드 예외 IP (서버 전용, Vercel 대시보드에 등록) | 없으면 모든 방문자에게 가드 적용 |

구글/카카오 로그인 키는 `.env`가 아니라 **Supabase 대시보드**에 등록합니다 (위 "회원가입/로그인 설정" 참고).

## Vercel 배포

1. GitHub에 이 프로젝트를 올리기
2. [vercel.com](https://vercel.com)에서 New Project → 해당 레포 선택
3. Framework Preset: **Vite** 자동 인식 (Build: `vite build`, Output: `dist`)
4. Environment Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `DEVTOOLS_ALLOWED_IPS`(선택) 추가
5. Deploy

`vercel.json`에 SPA 라우팅용 rewrite가 포함되어 있어서 `/game/reaction` 같은 경로를 새로고침해도 404가 안 뜹니다 (`/api/*`는 rewrite 대상에서 제외됨).

## 구조

```
api/
  devtools-guard.js         # Vercel 서버리스 함수: 요청 IP가 허용 목록인지 확인
supabase/
  schema.sql                 # profiles + scores 테이블, RLS 정책, 하루 1회 제한 트리거
src/
  context/
    AuthContext.jsx           # 로그인 세션/프로필 상태 + 로그인 모달 open 상태
  hooks/
    useDevToolsAccess.js      # /api/devtools-guard 호출해서 가드 on/off 판단
    useDevToolsGuard.js       # 우클릭/단축키 차단 (가벼운 저지선)
  lib/
    supabaseClient.js         # Supabase 클라이언트 (env 없으면 null)
    scores.js                  # fetchLeaderboard / submitScore (로그인 필요)
    profile.js                  # 프로필 조회/생성/닉네임 변경
    nickname.js                  # 랜덤 닉네임 생성 (10글자 + g/k)
    dailyLimit.js                 # 로컬 "오늘 등록했는지" 캐시 (UX 편의용)
  data/games.js                  # 8개 게임 메타데이터
  components/
    GameCard.jsx, CabinetIcon.jsx   # 메인 화면 전용
    common/                          # 게임 공통 컴포넌트
      GameShell.jsx                  # 게임 페이지 공통 헤더/뒤로가기 (wide 옵션: 2단 레이아웃)
      AuthButton.jsx                  # 우측 상단 고정 로그인/계정 버튼
      AuthModal.jsx                    # 로그인(구글/카카오) · 계정(닉네임 변경, 로그아웃) 모달
      Leaderboard.jsx                   # 랭킹 보드 (최대 10위, 메달, 1시간 캐시)
      SubmitScoreForm.jsx               # 점수 등록 (로그인 필요 + 확인 다이얼로그 + 하루 제한)
      ConfirmDialog.jsx                  # 범용 확인 다이얼로그
      ShareButton.jsx                     # SNS 공유 (아이콘 전용)
      icons.jsx                            # 공유/로그인 버튼용 SVG 아이콘 세트
  games/
    ReactionGame.jsx          # 반응속도 테스트 (완성, 2단 레이아웃 적용)
  pages/
    Home.jsx, GamePlaceholder.jsx
  styles/index.css
```

## 다음 게임 만들 때

1. `src/games/`에 새 게임 컴포넌트 작성
2. `App.jsx`에 `/game/<id>` 라우트 추가 (GamePlaceholder보다 위에 둘 것)
3. `GameShell`에 `wide` prop을 주고, 안에 `.game-layout` / `.game-layout__main` / `.game-layout__side`로 게임 화면과 `Leaderboard`를 나눠 배치하면 데스크탑에서 자동으로 오른쪽 사이드바가 됨
4. 랭킹이 필요하면 `Leaderboard` / `SubmitScoreForm`을 그대로 가져다 쓰고 `gameId`와 `order`(점수가 낮을수록 좋은 게임이면 `'asc'`, 높을수록 좋으면 `'desc'`)만 맞춰주면 됨. `SubmitScoreForm`에는 `useAuth()`의 `openAuthModal`을 `onRequestLogin`으로 넘겨주세요.
5. 공유 문구만 게임에 맞게 바꿔서 `ShareButton`에 넘기면 끝 (항상 노출되므로 결과가 없을 때의 기본 문구도 챙기기)

> 참고: 이 샌드박스는 외부 네트워크가 막혀 있어서 `npm install` / 빌드를 직접 실행해 검증하지 못했어요. 로컬에서 `npm install && npm run dev`로 확인해보시고, 에러 있으면 바로 고쳐드릴게요.
