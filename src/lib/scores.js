import { supabase } from './supabaseClient.js'

const TABLE = 'scores'
const NOT_CONNECTED_ERROR = new Error(
  'Supabase가 연결되어 있지 않습니다. .env 파일에 VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY를 설정해주세요.',
)

/**
 * 특정 게임의 랭킹을 가져옵니다. 한 사람의 베스트 기록만 집계합니다(get_leaderboard_top).
 * @param {string} gameId - games.js의 id (예: 'reaction')
 * @param {{ order?: 'asc' | 'desc', limit?: number }} options
 *   order: 'asc'면 점수가 낮을수록 상위 (반응속도처럼 낮을수록 좋은 게임용)
 *          'desc'면 점수가 높을수록 상위 (일반적인 점수 게임용)
 */
export async function fetchLeaderboard(gameId, { order = 'desc', limit = 10 } = {}) {
  if (!supabase) {
    return { data: [], error: NOT_CONNECTED_ERROR }
  }

  const { data, error } = await supabase.rpc('get_leaderboard_top', {
    p_game_id: gameId,
    p_order: order,
    p_limit: Math.min(limit, 10),
  })

  return { data: data ?? [], error }
}

/**
 * 로그인한 사용자의 순위/총 참가자 수를 가져옵니다.
 * @param {string} gameId
 * @param {string|null} userId - 비로그인이면 null (호출하지 않고 바로 null 반환)
 * @param {'asc'|'desc'} order
 */
export async function fetchMyRank(gameId, userId, order = 'desc') {
  if (!supabase || !userId) {
    return { data: null, error: null }
  }

  const { data, error } = await supabase.rpc('get_my_rank', {
    p_game_id: gameId,
    p_user_id: userId,
    p_order: order,
  })

  // returns table이라 배열로 옴; 기록이 없으면 빈 배열
  return { data: data?.[0] ?? null, error }
}

/**
 * 점수를 랭킹에 등록합니다. 로그인한 사용자만 가능 (RLS: auth.uid() = user_id).
 * @param {string} gameId
 * @param {string} userId - 로그인한 사용자 id (supabase auth user.id)
 * @param {string} nickname - 프로필에 저장된 닉네임
 * @param {number} score
 * @param {object} meta - 게임별 부가 정보 (선택)
 */
export async function submitScore(gameId, userId, nickname, score, meta = {}) {
  if (!supabase) {
    return { data: null, error: NOT_CONNECTED_ERROR }
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert([{ game_id: gameId, user_id: userId, nickname: nickname.slice(0, 20), score, meta }])
    .select()
    .single()

  return { data, error }
}
