import { createClient } from '@supabase/supabase-js'

// service_role 키는 RLS를 완전히 우회하므로 반드시 서버(이 함수) 안에서만 써야 합니다.
// SUPABASE_SERVICE_ROLE_KEY는 VITE_ 접두사가 없어서 클라이언트 번들에 절대 포함되지 않습니다.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' })
    return
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    res.status(500).json({ error: '서버에 Supabase 서비스 키가 설정되어 있지 않아요.' })
    return
  }

  const authHeader = req.headers.authorization || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) {
    res.status(401).json({ error: '로그인이 필요합니다.' })
    return
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 토큰이 진짜 유효한 로그인 세션인지 서버에서 검증 (클라이언트가 임의로 다른 사람 계정을
  // 지우도록 userId를 body로 받는 방식은 쓰지 않음 — 반드시 토큰에서 유저를 뽑아야 함)
  const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token)
  if (userError || !userData?.user) {
    res.status(401).json({ error: '유효하지 않은 로그인 정보예요.' })
    return
  }

  const user = userData.user
  const identities = user.identities?.length ? user.identities : [{ provider: 'unknown', id: user.id }]

  // 재가입 24시간 제한을 걸기 위해, 실제 삭제 전에 먼저 기록을 남김
  const rows = identities.map((identity) => ({
    provider: identity.provider,
    provider_user_id: identity.id,
  }))

  const { error: logError } = await supabaseAdmin.from('deleted_accounts').insert(rows)
  if (logError) {
    console.error('[delete-account] 탈퇴 기록 저장 실패', logError)
    // 기록에 실패해도 탈퇴 자체는 계속 진행함 (이 경우 재가입 제한만 못 걸릴 뿐)
  }

  // profiles/scores/likes는 전부 auth.users를 참조하는 on delete cascade라
  // 계정 삭제와 동시에 함께 지워짐
  const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (deleteError) {
    console.error('[delete-account] 계정 삭제 실패', deleteError)
    res.status(500).json({ error: '계정 삭제에 실패했어요. 잠시 후 다시 시도해주세요.' })
    return
  }

  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ success: true })
}
