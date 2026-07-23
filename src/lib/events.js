import { supabase } from './supabaseClient.js'

const EVENT_COLUMNS =
  'id, type, title, summary, description, icon, tint, reward_summary, start_at, end_at, sort_order, active'

/**
 * 활성화된(active) 이벤트 목록을 노출 순서대로 가져옵니다. (그리드 목록용)
 */
export async function fetchEvents() {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.warn('[events] 이벤트 목록을 불러오지 못했어요.', error)
    return []
  }

  return data ?? []
}

/**
 * 이벤트 상세페이지용 단건 조회. 비공개(active=false)여도 직접 링크로는 보여줄 수 있게
 * active 필터를 걸지 않고, 상세페이지 쪽에서 상태 배지로 "종료"를 표시합니다.
 * @returns {Promise<object|null>} 없으면 null
 */
export async function fetchEventById(id) {
  if (!supabase || !id) return null

  const { data, error } = await supabase.from('events').select(EVENT_COLUMNS).eq('id', id).maybeSingle()

  if (error) {
    console.warn('[events] 이벤트를 불러오지 못했어요.', error)
    return null
  }

  return data
}

/**
 * 이벤트 게시 상태를 계산합니다. 카드/상세 배지에 공통으로 씁니다.
 */
export function getEventStatus(event) {
  if (!event?.active) return { key: 'ended', label: '종료' }

  const now = new Date()
  if (event.start_at && new Date(event.start_at) > now) return { key: 'upcoming', label: '예정' }
  if (event.end_at && new Date(event.end_at) < now) return { key: 'ended', label: '종료' }

  return { key: 'live', label: '진행중' }
}

/**
 * 로그인한 유저의 이번 달 출석 기록. 달력 렌더링용.
 * @returns {Promise<{attend_date: string, reward_amount: number, is_bonus: boolean}[]>}
 */
export async function fetchMyAttendanceMonth(eventId, year, month) {
  if (!supabase) return []

  const { data, error } = await supabase.rpc('get_event_attendance_month', {
    p_event_id: eventId,
    p_year: year,
    p_month: month,
  })

  if (error) {
    console.warn('[events] 출석 기록을 불러오지 못했어요.', error)
    return []
  }

  return data ?? []
}

/**
 * 오늘 출석 체크 + 코인 지급. 하루 1회, 주말엔 서버가 2배로 계산해서 지급합니다.
 * @returns {Promise<{ data: { reward_amount: number, is_bonus: boolean, new_coins: number } | null, error: Error|null }>}
 */
export async function claimEventAttendance(eventId) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 연결되어 있지 않습니다.') }
  }

  const { data, error } = await supabase.rpc('claim_event_attendance', { p_event_id: eventId })

  return { data: data?.[0] ?? null, error }
}
