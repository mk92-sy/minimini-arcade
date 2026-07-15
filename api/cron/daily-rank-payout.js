import { createClient } from '@supabase/supabase-js'

// Vercel Cron이 하루 한 번(자정 KST 직후) 호출합니다. vercel.json의 "crons" 설정 참고.
// CRON_SECRET을 Vercel 프로젝트 환경변수에 등록해두면, Vercel이 크론 호출 시
// 자동으로 `Authorization: Bearer <CRON_SECRET>` 헤더를 붙여줍니다. 그 값을
// 여기서 검증해서, 외부에서 이 URL을 알아내 임의로 호출하는 걸 막습니다.
export default async function handler(req, res) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = req.headers.authorization || ''

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: '서버에 Supabase 서비스 키가 설정되어 있지 않아요.' })
    return
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // run_daily_rank_payout()은 service_role에게만 실행 권한이 있는 DB 함수입니다.
  // 내부에서 unique 인덱스로 중복 지급을 막기 때문에, 이 요청이 재시도되거나
  // 크론이 실수로 두 번 실행돼도 안전합니다(멱등).
  const { data, error } = await supabaseAdmin.rpc('run_daily_rank_payout')

  if (error) {
    console.error('[daily-rank-payout] 지급 실패', error)
    res.status(500).json({ error: error.message })
    return
  }

  const results = data ?? []
  const awardedCount = results.filter((r) => r.awarded).length
  const skippedCount = results.length - awardedCount

  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ success: true, awardedCount, skippedCount, results })
}
