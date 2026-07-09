// 여기 저장되는 값은 UX 편의용일 뿐입니다 (버튼을 미리 비활성화해서
// 괜히 다이얼로그부터 띄우지 않기 위함). 실제 하루 1회 제한은
// supabase/schema.sql의 DB 트리거가 서버에서(user_id 기준으로) 강제합니다.
//
// 반드시 userId까지 키에 포함해야 합니다 — 게임ID+날짜로만 캐시하면
// 같은 브라우저에서 다른 계정으로 로그인했을 때 "이미 등록함" 상태가
// 잘못 넘어와버립니다 (실제로 있었던 버그).

const STORAGE_PREFIX = 'mini-arcade:submitted'

// DB 트리거와 동일하게 KST(Asia/Seoul, UTC+9) 자정 기준으로 날짜를 계산합니다.
// (그냥 new Date().toISOString()을 쓰면 UTC 자정 = 한국 시간 오전 9시에 풀려버림)
function todayKST() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return kst.toISOString().slice(0, 10)
}

function todayKey(gameId, userId) {
  return `${STORAGE_PREFIX}:${gameId}:${userId ?? 'anon'}:${todayKST()}`
}

export function hasSubmittedToday(gameId, userId) {
  if (!userId) return false
  try {
    return window.localStorage.getItem(todayKey(gameId, userId)) === '1'
  } catch {
    return false
  }
}

export function markSubmittedToday(gameId, userId) {
  if (!userId) return
  try {
    window.localStorage.setItem(todayKey(gameId, userId), '1')
  } catch {
    // localStorage를 못 쓰는 환경(사생활 보호 모드 등)에서는 조용히 무시
  }
}
