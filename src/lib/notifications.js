import { supabase } from './supabaseClient.js'

const TABLE = 'notifications'

export async function fetchNotifications(userId, limit = 50) {
  if (!supabase || !userId) return { data: [], error: null }

  const { data, error } = await supabase
    .from(TABLE)
    .select('id, type, game_id, amount, rank, reward_date, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return { data: data ?? [], error }
}

export async function markAllNotificationsRead(userId) {
  if (!supabase || !userId) return { error: null }

  const { error } = await supabase
    .from(TABLE)
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null)

  return { error }
}

export async function deleteAllNotifications(userId) {
  if (!supabase || !userId) return { error: null }

  const { error } = await supabase.from(TABLE).delete().eq('user_id', userId)

  return { error }
}
