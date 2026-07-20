import { supabase } from './supabaseClient.js'

const NOT_CONNECTED_ERROR = new Error('Supabase가 연결되어 있지 않습니다.')

/**
 * 상품 카탈로그를 가져옵니다 (누구나 조회 가능, 로그인 불필요).
 */
export async function fetchStoreItems() {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('store_items')
    .select('id, category, subcategory, name, description, price, stackable, icon, color_hex, sort_order')
    .eq('active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.warn('[store] 상품 목록을 불러오지 못했어요.', error)
    return []
  }

  return data ?? []
}

/**
 * 로그인한 유저의 보유 아이템(수량)을 가져옵니다. { [itemId]: quantity } 형태로 변환해서 반환.
 */
export async function fetchInventory(userId) {
  if (!supabase || !userId) return {}

  const { data, error } = await supabase.from('user_inventory').select('item_id, quantity').eq('user_id', userId)

  if (error) {
    console.warn('[store] 내 아이템을 불러오지 못했어요.', error)
    return {}
  }

  const map = {}
  for (const row of data ?? []) {
    map[row.item_id] = row.quantity
  }
  return map
}

/**
 * 아이템 구매. 코인 차감 + 인벤토리 적립을 서버(RPC)에서 원자적으로 처리합니다.
 * @returns {Promise<{ data: { new_coins: number, new_quantity: number } | null, error: Error|null }>}
 */
export async function purchaseItem(itemId, quantity = 1) {
  if (!supabase) return { data: null, error: NOT_CONNECTED_ERROR }

  const { data, error } = await supabase.rpc('purchase_store_item', {
    p_item_id: itemId,
    p_quantity: quantity,
  })

  return { data: data?.[0] ?? null, error }
}

/**
 * 코스메틱 아이템 장착/해제 토글. 이미 장착돼 있으면 해제됩니다.
 * @returns {Promise<{ data: { equipped_nickname_color, equipped_badge, equipped_border } | null, error: Error|null }>}
 */
export async function equipItem(itemId) {
  if (!supabase) return { data: null, error: NOT_CONNECTED_ERROR }

  const { data, error } = await supabase.rpc('equip_store_item', { p_item_id: itemId })

  return { data: data?.[0] ?? null, error }
}

/**
 * 소모품 사용 (재고 1 차감). retry_ticket류는 gameId가 필요합니다.
 * @returns {Promise<{ data: { remaining_quantity: number } | null, error: Error|null }>}
 */
export async function useConsumable(itemId, gameId = null) {
  if (!supabase) return { data: null, error: NOT_CONNECTED_ERROR }

  const { data, error } = await supabase.rpc('use_store_item', {
    p_item_id: itemId,
    p_game_id: gameId,
  })

  return { data: data?.[0] ?? null, error }
}
