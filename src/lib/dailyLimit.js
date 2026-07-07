// 여기 저장되는 값은 UX 편의용일 뿐입니다 (버튼을 미리 비활성화해서
// 괜히 다이얼로그부터 띄우지 않기 위함). 실제 하루 1회 제한은
// supabase/schema.sql의 DB 트리거가 서버에서 강제합니다.

const STORAGE_PREFIX = 'mini-arcade:submitted'

function todayKey(gameId) {
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  return `${STORAGE_PREFIX}:${gameId}:${today}`
}

export function hasSubmittedToday(gameId) {
  try {
    return window.localStorage.getItem(todayKey(gameId)) === '1'
  } catch {
    return false
  }
}

export function markSubmittedToday(gameId) {
  try {
    window.localStorage.setItem(todayKey(gameId), '1')
  } catch {
    // localStorage를 못 쓰는 환경(사생활 보호 모드 등)에서는 조용히 무시
  }
}
