import { supabase } from './supabaseClient.js'
import { generateNickname } from './nickname.js'
import { getDisplayByteLength, NICKNAME_MAX_BYTES, NICKNAME_MAX_BYTES_LABEL } from './nicknameValidation.js'

const MAX_NICKNAME_RETRIES = 5

const PROFILE_COLUMNS = 'id, nickname, provider, coins, equipped_nickname_color, equipped_badge, equipped_border'

/**
 * 로그인한 유저의 프로필을 가져오고, 없으면 랜덤 닉네임으로 새로 만듭니다.
 * 닉네임 unique 제약에 걸리면(아주 드문 충돌) 다른 랜덤값으로 재시도합니다.
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

  const provider = user.app_metadata?.provider === 'kakao' ? 'kakao' : 'google'

  for (let attempt = 0; attempt < MAX_NICKNAME_RETRIES; attempt += 1) {
    const nickname = generateNickname(provider)
    const { data, error } = await supabase
      .from('profiles')
      .insert([{ id: user.id, nickname, provider }])
      .select(PROFILE_COLUMNS)
      .single()

    if (!error) return data
    if (error.code !== '23505') {
      // unique 위반(닉네임 중복) 이외의 에러면 재시도해도 소용없음
      console.warn('[profile] 프로필 생성 실패', error)
      return null
    }
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
