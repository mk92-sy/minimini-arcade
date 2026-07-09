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
 * 9,999명까지는 콤마 구분 숫자로, 그 이상은 "9,999+"로 표시.
 */
export function formatChallengerCount(count) {
  if (count > 9999) return '9,999+'
  return count.toLocaleString('ko-KR')
}
