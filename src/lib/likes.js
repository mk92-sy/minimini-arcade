import { supabase } from './supabaseClient.js'

const TABLE = 'likes'
const NOT_CONNECTED_ERROR = new Error('Supabase가 연결되어 있지 않습니다.')

/**
 * 좋아요 총 개수 + (로그인했다면) 내가 눌렀는지 여부를 함께 가져옵니다.
 */
export async function fetchLikeStatus(gameId, userId) {
  if (!supabase) return { liked: false, count: 0 }

  const countPromise = supabase.rpc('get_like_count', { p_game_id: gameId })
  const likedPromise = userId
    ? supabase.from(TABLE).select('id').eq('game_id', gameId).eq('user_id', userId).maybeSingle()
    : Promise.resolve({ data: null })

  const [{ data: count }, { data: likedRow }] = await Promise.all([countPromise, likedPromise])

  return { liked: Boolean(likedRow), count: count ?? 0 }
}

export async function likeGame(gameId, userId) {
  if (!supabase) return { error: NOT_CONNECTED_ERROR }
  const { error } = await supabase.from(TABLE).insert([{ game_id: gameId, user_id: userId }])
  return { error }
}

export async function unlikeGame(gameId, userId) {
  if (!supabase) return { error: NOT_CONNECTED_ERROR }
  const { error } = await supabase.from(TABLE).delete().eq('game_id', gameId).eq('user_id', userId)
  return { error }
}
