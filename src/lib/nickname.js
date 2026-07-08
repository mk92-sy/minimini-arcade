// 헷갈리는 문자(0/O, 1/l/I)는 빼서 눈으로 봤을 때 헷갈리지 않게 함
const NICKNAME_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'

function randomString(length) {
  const array = new Uint32Array(length)
  crypto.getRandomValues(array)
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += NICKNAME_CHARS[array[i] % NICKNAME_CHARS.length]
  }
  return out
}

/**
 * 랜덤 문자열 10글자 + provider suffix.
 * 구글: xxxxxxxxxxg / 카카오: xxxxxxxxxxk
 */
export function generateNickname(provider) {
  const suffix = provider === 'kakao' ? 'k' : 'g'
  return `${randomString(10)}${suffix}`
}
