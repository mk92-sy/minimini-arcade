import { supabase } from './supabaseClient.js'
import { generateNickname } from './nickname.js'
import { getDisplayByteLength, NICKNAME_MAX_BYTES, NICKNAME_MAX_BYTES_LABEL } from './nicknameValidation.js'

const MAX_NICKNAME_RETRIES = 5

const PROFILE_COLUMNS = 'id, nickname, provider, coins, equipped_nickname_color, equipped_badge, equipped_border'

// 동시에 여러 번 ensureProfile(user)가 호출돼도(예: getSession()과 onAuthStateChange가
// 거의 동시에 session을 갱신해서 effect가 두 번 도는 경우, 특히 StrictMode 개발 환경)
// 실제 INSERT는 유저당 한 번만 나가도록 진행 중인 Promise를 캐싱해서 재사용합니다.
const pendingCreations = new Map()

/**
 * 로그인한 유저의 프로필을 가져오고, 없으면 랜덤 닉네임으로 새로 만듭니다.
 */
export async function ensureProfile(user) {
  if (!supabase || !user) return null

  const { data: existing, error: fetchError } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', user.id)
    .maybeSingle()

  if (fetchError) {
    console.warn('[profile] 프로필을 불러오지 못했어요.', fetchError)
    return null
  }

  if (existing) return existing

  if (pendingCreations.has(user.id)) {
    return pendingCreations.get(user.id)
  }

  const creation = createProfile(user).finally(() => {
    pendingCreations.delete(user.id)
  })
  pendingCreations.set(user.id, creation)
  return creation
}

async function createProfile(user) {
  const provider = user.app_metadata?.provider === 'kakao' ? 'kakao' : 'google'

  for (let attempt = 0; attempt < MAX_NICKNAME_RETRIES; attempt += 1) {
    const nickname = generateNickname(provider)
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ id: user.id, nickname, provider }])
      .select(PROFILE_COLUMNS)
      .single()

    if (!error) return data

    if (error.code === '23505') {
      // unique 위반이 "id"(기본키) 때문인지 "nickname" 때문인지는 에러 코드만으로는
      // 구분이 안 돼요. id 충돌이면(동시 요청 등으로 다른 곳에서 이미 만들어짐) 그
      // 행을 다시 조회해서 반환하고, 진짜 닉네임 충돌일 때만 새 닉네임으로 재시도합니다.
      // (예전 코드는 이 구분 없이 항상 "닉네임 충돌"로 간주해서 재시도했는데, id 충돌인
      // 경우엔 몇 번을 재시도해도 계속 실패해 결국 null을 반환하는 버그가 있었습니다.)
      const { data: nowExisting } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', user.id)
        .maybeSingle()
      if (nowExisting) return nowExisting
      continue
    }

    console.warn('[profile] 프로필 생성 실패', error)
    return null
  }

  console.warn('[profile] 닉네임 랜덤 생성이 여러 번 충돌했어요.')
  return null
}

export async function updateNickname(userId, nextNickname) {
  if (!supabase) {
    return { data: null, error: new Error('Supabase가 연결되어 있지 않습니다.') }
  }

  const trimmed = nextNickname.trim()
  if (trimmed.length === 0) {
    return { data: null, error: new Error('닉네임을 입력해주세요.') }
  }
  if (getDisplayByteLength(trimmed) > NICKNAME_MAX_BYTES) {
    return { data: null, error: new Error(`닉네임은 최대 ${NICKNAME_MAX_BYTES_LABEL}까지 입력할 수 있어요.`) }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update({ nickname: trimmed })
    .eq('id', userId)
    .select(PROFILE_COLUMNS)
    .single()

  if (error?.code === '23505') {
    return { data: null, error: new Error('이미 사용 중인 닉네임이에요.') }
  }

  return { data, error }
}
