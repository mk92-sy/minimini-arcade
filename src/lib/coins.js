import { supabase } from './supabaseClient.js'

export const COIN_AWARD_LABELS = {
  daily_play: '이 게임 오늘의 플레이 보상',
  ad_bonus: '광고 시청 보너스',
  daily_rank_top3: '어제 3위 랭킹 보상',
  daily_rank_top2: '어제 2위 랭킹 보상',
  daily_rank_top1: '어제 1위 랭킹 보상',
  // 예전 버전(즉시 지급 마일스톤)의 흔적 — 새로 지급되진 않지만, 과거 기록에 남아있을 수 있어 라벨만 유지
  rank_top3: '이번 시즌 첫 3위 달성 보너스',
  rank_top2: '이번 시즌 첫 2위 달성 보너스',
  rank_top1: '이번 시즌 첫 1위 달성 보너스',
}

/**
 * 점수 등록 직후 호출합니다. 오늘 처음 플레이했는지를 서버(DB 함수)가 판단해서
 * 코인을 지급하고, 실제로 지급된 항목만 배열로 돌려줍니다 (중복 지급은 서버가 막아줌).
 * 1/2/3위 보상은 더 이상 여기서 즉시 지급되지 않습니다 — 매일 자정 배치 작업
 * (run_daily_rank_payout, api/cron/daily-rank-payout.js)이 전날 순위를 기준으로
 * 일괄 지급하고, 결과는 /notifications 페이지에서 확인할 수 있어요.
 * @returns {Promise<{ awards: { award_type: string, amount: number }[], error: Error|null }>}
 */
export async function claimCoinsForScore(gameId) {
  if (!supabase) return { awards: [], error: null }

  const { data, error } = await supabase.rpc('claim_coins_for_score', { p_game_id: gameId })
  if (error) {
    console.warn('[coins] 코인 지급 확인에 실패했어요.', error)
    return { awards: [], error }
  }

  return { awards: data ?? [], error: null }
}

const SIMULATED_AD_DURATION_MS = 3000

/**
 * ⚠️ 테스트/개발용. 실제 서비스에서는 쓰지 않는 치트성 기능이라, 프론트에서도
 * IP 허용 목록에 있는 사람(useDevToolsAccess)에게만 버튼을 보여줍니다.
 * DB 함수(dev_grant_test_coins)는 supabase/add_dev_test_coins.sql 참고.
 * @returns {Promise<{ data: { new_coins: number } | null, error: Error|null }>}
 */
export async function grantTestCoins(amount = 9999) {
  if (!supabase) return { data: null, error: null }

  const { data, error } = await supabase.rpc('dev_grant_test_coins', { p_amount: amount })
  if (error) {
    console.warn('[coins] 테스트 코인 지급에 실패했어요.', error)
    return { data: null, error }
  }

  return { data: data?.[0] ?? null, error: null }
}

/**
 * 보상형 광고 시청 + 보너스 코인 지급.
 * ⚠️ 아직 실제 광고 SDK(애드몹/카카오 애드핏 등)를 연동하지 않아서,
 * 여기서는 일정 시간 대기로 "광고 시청"을 흉내만 냅니다. 실제 SDK를 붙일 때는
 * 이 setTimeout 부분을 광고 SDK의 "보상 획득 콜백"으로 바꾸면 됩니다.
 * 지급 자체(하루 1회, 게임당)는 DB 함수(claim_ad_bonus)가 강제합니다.
 * @returns {Promise<{ award: { award_type: string, amount: number } | null, error: Error|null }>}
 */
export async function watchAdAndClaimBonus(gameId) {
  if (!supabase) return { award: null, error: null }

  // TODO: 실제 광고 SDK 연동 시 이 대기 대신 SDK의 보상 콜백을 기다리도록 교체
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_AD_DURATION_MS))

  const { data, error } = await supabase.rpc('claim_ad_bonus', { p_game_id: gameId })
  if (error) {
    return { award: null, error }
  }

  return { award: data?.[0] ?? null, error: null }
}
