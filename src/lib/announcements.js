import { supabase } from './supabaseClient.js'

const TABLE = 'announcements'

/**
 * 전광판에 흐를 활성 공지사항을 가져옵니다.
 * 클라이언트는 조회만 가능하고(RLS), 작성/삭제는 Supabase 대시보드
 * SQL Editor에서 관리자가 직접 처리합니다 (README 참고).
 */
export async function fetchActiveAnnouncements() {
  if (!supabase) {
    return { data: [], error: null }
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select('id, message')
    .eq('active', true)
    .order('created_at', { ascending: true })

  return { data: data ?? [], error }
}
