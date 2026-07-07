# Mini Arcade

React + Vite(JS, no TypeScript)로 만든 8개 미니 웹게임 허브.

- 메인 화면(아케이드 로비) 구성 완료
- 첫 번째 게임 **반응속도 테스트** 구현 완료 (`/game/reaction`)
- 나머지 7개는 `/game/:id` 경로에서 "OUT OF ORDER" 플레이스홀더로 표시됨
- 랭킹(Leaderboard) / 점수 등록 / SNS 공유는 **모든 게임이 공유하는 공통 컴포넌트**로 분리해뒀어요

## 로컬 실행

```bash
npm install
cp .env.example .env   # Supabase 정보 채워넣기
npm run dev
```

브라우저에서 `http://localhost:5173` 접속.

## Supabase 설정 (랭킹 저장용)

1. [supabase.com](https://supabase.com) 에서 새 프로젝트 생성
2. 프로젝트의 **SQL Editor**에서 `supabase/schema.sql` 내용을 그대로 실행 → `scores` 테이블 + RLS 정책 + 하루 1회 제한 트리거 생성
   - 이미 스키마를 실행했던 프로젝트라면, 그냥 **다시 한 번 통째로 실행**하면 됩니다 (전부 `if not exists` / `or replace`라 안전하게 재실행 가능)
3. **Settings → API**에서 `Project URL`과 `anon public` 키를 복사
4. `.env` 파일에 채우기 (아래 "환경변수" 참고)

`.env`가 비어 있어도 앱 자체는 정상 동작해요 — 랭킹 조회/등록만 "연결 안 됨" 상태로 표시됩니다 (콘솔에 경고 로그).

모든 게임은 `scores` 테이블 하나를 `game_id` 컬럼으로 구분해서 공유합니다.

### 하루 1회 랭킹 등록 제한

- **실제 방어는 DB 트리거**(`scores_enforce_daily_limit`)가 담당합니다: 같은 `game_id`에 대해 오늘 이미 같은 IP 또는 같은 닉네임으로 등록한 기록이 있으면 insert 자체를 거부해요.
- IP는 클라이언트가 보내는 게 아니라 PostgREST가 넘겨주는 요청 헤더(`x-forwarded-for`)를 서버(트리거)가 직접 읽어서 기록합니다.
- 프론트엔드(`SubmitScoreForm`)는 등록 버튼 클릭 시 "하루에 한 번만 가능해요" 안내 다이얼로그를 띄우고, 성공/거부 이후에는 버튼을 비활성화합니다. `localStorage`에도 오늘 등록 여부를 기록해서 새로고침해도 다시 폼이 안 뜨게 해뒀어요 — 다만 이건 UX 편의용일 뿐, 진짜 방어선은 DB 트리거입니다.
- ⚠️ `x-forwarded-for`는 이론상 조작 가능한 헤더라 완벽한 어뷰징 방지는 아니에요. 닉네임 중복 체크까지 같이 걸어서 "가벼운 억제" 수준으로 봐주세요. 더 확실하게 하려면 나중에 로그인(예: Supabase Auth의 소셜 로그인)을 붙이는 게 정공법입니다.

### 개발자도구 접근 제한 (허용 IP 제외)

- `/api/devtools-guard.js`가 Vercel 서버리스 함수로 배포되어, 요청자의 실제 IP를 서버에서 확인하고 `DEVTOOLS_ALLOWED_IPS`(서버 전용 env, 콤마로 여러 개 가능)에 있는 IP에만 `{ allowed: true }`를 돌려줍니다.
- 허용되지 않은 방문자에게는 우클릭 메뉴 차단 + F12 / Ctrl(Cmd)+Shift+I,J,C / Ctrl+U 같은 개발자도구 단축키 차단이 걸립니다.
- **로컬 개발(`npm run dev`)에서는 항상 꺼져 있어요** — 매번 막히면 작업이 안 되니까요.
- Vercel에 배포할 때 **Project Settings → Environment Variables**에 `DEVTOOLS_ALLOWED_IPS`를 본인 맥의 공인 IP로 등록하세요 (확인: https://whatismyip.com). `.env.example`에는 `vercel dev`로 로컬 테스트할 때 쓸 수 있도록 예시만 넣어뒀어요.
- ⚠️ **솔직히 말씀드리면, 이건 "완벽 차단"이 아니라 가벼운 저지선이에요.** 우클릭/F12 정도만 막을 뿐, 브라우저 메뉴로 직접 개발자도구를 열거나, 모바일 원격 디버깅, 네트워크 프록시 툴(예: 프록시맨, Charles) 등으로는 얼마든지 우회할 수 있습니다. 진짜 "점수 조작 방지"는 위에서 설명한 **서버 사이드 하루 제한 트리거**가 실질적인 역할을 해요. 이 기능은 어디까지나 캐주얼한 사용자가 우연히/장난으로 devtools를 여는 것 정도를 막는 용도로 이해해주세요.
- 공인 IP는 가정용 인터넷 회선이면 시간이 지나면 바뀔 수 있어요(동적 IP). 안 열리면 다시 확인하고 값을 갱신해주세요.

### SNS 공유 아이콘

- `ShareButton`은 텍스트 없이 아이콘만 있는 버튼들로 구성됩니다: 카카오톡(따로 분리, 크게), 공유하기(Web Share API, 지원 브라우저에서만 노출), X(트위터), Facebook, 링크 복사(복사 성공 시 체크 아이콘으로 전환).
- 카카오톡 공유를 실제로 동작시키려면 `.env`의 `VITE_KAKAO_JS_KEY`를 채우세요. 비어 있으면 카카오 버튼이 흐리게 disabled 처리됩니다.
- 아이콘들은 각 브랜드를 알아볼 수 있도록 직접 그린 단순화된 로고 형태의 SVG예요 (외부 아이콘 라이브러리 의존 없음).

## 환경변수 정리

| 변수 | 어디에 필요한가 | 필수 여부 |
|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | 랭킹 조회/등록 | 없으면 랭킹 기능만 비활성 |
| `VITE_KAKAO_JS_KEY` | 카카오톡 공유 | 없으면 카카오 버튼만 disabled |
| `DEVTOOLS_ALLOWED_IPS` | 개발자도구 가드 예외 IP (서버 전용, Vercel 대시보드에 등록) | 없으면 모든 방문자에게 가드 적용 |


## Vercel 배포

1. GitHub에 이 프로젝트를 올리기
2. [vercel.com](https://vercel.com)에서 New Project → 해당 레포 선택
3. Framework Preset: **Vite** 자동 인식 (Build: `vite build`, Output: `dist`)
4. Environment Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_KAKAO_JS_KEY`(선택), `DEVTOOLS_ALLOWED_IPS`(선택) 추가
5. Deploy

`vercel.json`에 SPA 라우팅용 rewrite가 포함되어 있어서 `/game/reaction` 같은 경로를 새로고침해도 404가 안 뜹니다.

## 구조

```
api/
  devtools-guard.js         # Vercel 서버리스 함수: 요청 IP가 허용 목록인지 확인
supabase/
  schema.sql                 # scores 테이블 + RLS 정책 + 하루 1회 제한 트리거
src/
  hooks/
    useDevToolsAccess.js      # /api/devtools-guard 호출해서 가드 on/off 판단
    useDevToolsGuard.js       # 우클릭/단축키 차단 (가벼운 저지선)
  lib/
    supabaseClient.js         # Supabase 클라이언트 (env 없으면 null)
    scores.js                  # fetchLeaderboard / submitScore
    dailyLimit.js               # 로컬 "오늘 등록했는지" 캐시 (UX 편의용)
    kakao.js                     # Kakao SDK 로더 + 공유 함수
  data/games.js                  # 8개 게임 메타데이터
  components/
    GameCard.jsx, CabinetIcon.jsx   # 메인 화면 전용
    common/                          # 게임 공통 컴포넌트
      GameShell.jsx                  # 게임 페이지 공통 헤더/뒤로가기
      Leaderboard.jsx                 # 랭킹 보드
      SubmitScoreForm.jsx             # 닉네임 + 점수 등록 (확인 다이얼로그 + 하루 제한)
      ConfirmDialog.jsx                # 범용 확인 다이얼로그
      ShareButton.jsx                   # SNS 공유 (아이콘 전용, 카카오 분리)
      icons.jsx                          # 공유 버튼용 SVG 아이콘 세트
  games/
    ReactionGame.jsx          # 반응속도 테스트 (완성)
  pages/
    Home.jsx, GamePlaceholder.jsx
  styles/index.css
```

## 다음 게임 만들 때

1. `src/games/`에 새 게임 컴포넌트 작성
2. `App.jsx`에 `/game/<id>` 라우트 추가 (GamePlaceholder보다 위에 둘 것)
3. 랭킹이 필요하면 `Leaderboard` / `SubmitScoreForm`을 그대로 가져다 쓰고 `gameId`와 `order`(점수가 낮을수록 좋은 게임이면 `'asc'`, 높을수록 좋으면 `'desc'`)만 맞춰주면 됨
4. 공유 문구만 게임에 맞게 바꿔서 `ShareButton`에 넘기면 끝

> 참고: 이 샌드박스는 외부 네트워크가 막혀 있어서 `npm install` / 빌드를 직접 실행해 검증하지 못했어요. 로컬에서 `npm install && npm run dev`로 확인해보시고, 에러 있으면 바로 고쳐드릴게요.

