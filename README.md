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
2. 프로젝트의 **SQL Editor**에서 `supabase/schema.sql` 내용을 그대로 실행 → `scores` 테이블 + RLS 정책 생성
3. **Settings → API**에서 `Project URL`과 `anon public` 키를 복사
4. `.env` 파일에 아래처럼 채우기:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=xxxxx
   ```
5. Vercel에 배포할 때도 **Project Settings → Environment Variables**에 동일하게 등록

`.env`가 비어 있어도 앱 자체는 정상 동작해요 — 랭킹 조회/등록만 "연결 안 됨" 상태로 표시됩니다 (콘솔에 경고 로그).

모든 게임은 `scores` 테이블 하나를 `game_id` 컬럼으로 구분해서 공유합니다. 새 게임을 추가할 때 테이블을 새로 만들 필요 없이, `gameId`만 다르게 넘기면 돼요.

## Vercel 배포

1. GitHub에 이 프로젝트를 올리기
2. [vercel.com](https://vercel.com)에서 New Project → 해당 레포 선택
3. Framework Preset: **Vite** 자동 인식 (Build: `vite build`, Output: `dist`)
4. Environment Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가
5. Deploy

`vercel.json`에 SPA 라우팅용 rewrite가 포함되어 있어서 `/game/reaction` 같은 경로를 새로고침해도 404가 안 뜹니다.

## 구조

```
supabase/
  schema.sql               # scores 테이블 + RLS 정책 (Supabase SQL Editor에 실행)
src/
  lib/
    supabaseClient.js       # Supabase 클라이언트 (env 없으면 null)
    scores.js               # fetchLeaderboard / submitScore
  data/games.js              # 8개 게임 메타데이터
  components/
    GameCard.jsx, CabinetIcon.jsx   # 메인 화면 전용
    common/                          # 게임 공통 컴포넌트
      GameShell.jsx                  # 게임 페이지 공통 헤더/뒤로가기
      Leaderboard.jsx                 # 랭킹 보드
      SubmitScoreForm.jsx             # 닉네임 + 점수 등록
      ShareButton.jsx                  # SNS 공유 (Web Share API + X/FB 링크 + 복사)
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

