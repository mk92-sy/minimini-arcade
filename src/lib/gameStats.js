import { supabase } from './supabaseClient.js'

/**
 * 게임 카드에 보여줄 통계를 한 번에 가져옵니다: { [gameId]: { likeCount, challengerCount } }
 */
export async function fetchGameStats() {
  if (!supabase) return {}

  const [{ data: participantRows }, { data: likeRows }] = await Promise.all([
    supabase.from('game_participant_counts').select('game_id, participants'),
    supabase.rpc('get_like_counts'),
  ])

  const map = {}

  for (const row of participantRows ?? []) {
    map[row.game_id] = { ...(map[row.game_id] ?? {}), challengerCount: Number(row.participants) || 0 }
  }
  for (const row of likeRows ?? []) {
    map[row.game_id] = { ...(map[row.game_id] ?? {}), likeCount: Number(row.likes) || 0 }
  }

  return map
}

/**
 * 오늘(KST) 로그인한 사용자가 랭킹을 등록한 게임 id들을 Set으로 돌려줍니다.
 * 비로그인이면 빈 Set.
 */
export async function fetchTodaySubmittedGameIds(userId) {
  if (!supabase || !userId) return new Set()

  const { data, error } = await supabase.rpc('get_today_submitted_games', { p_user_id: userId })
  if (error) {
    console.warn('[gameStats] 오늘 등록 여부를 불러오지 못했어요.', error)
    return new Set()
  }

  return new Set(data ?? [])
}

/**
 * 9,999명까지는 콤마 구분 숫자로, 그 이상은 "9,999+"로 표시.
 */
export function formatChallengerCount(count) {
  if (count > 9999) return '9,999+'
  return count.toLocaleString('ko-KR')
}
