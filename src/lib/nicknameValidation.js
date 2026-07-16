// 한국 웹에서 흔히 쓰는 바이트 계산 방식: 한글(및 기타 non-ASCII)은 2바이트,
// 영문/숫자/특수문자는 1바이트로 셉니다. 실제 UTF-8 저장 바이트 수(한글 = 3바이트)와는
// 다른, "표시 기준" 계산이라는 점 참고해주세요. 이 기준으로 16바이트 = 한글 8자예요.
// 띄어쓰기는 아예 입력 자체를 막습니다(hasWhitespace).
export const NICKNAME_MAX_BYTES = 16
export const NICKNAME_MAX_BYTES_LABEL = '한글 8자(16바이트)'

export function getDisplayByteLength(str) {
  let bytes = 0
  for (const ch of str) {
    bytes += ch.charCodeAt(0) > 127 ? 2 : 1
  }
  return bytes
}

export function hasWhitespace(str) {
  return /\s/.test(str)
}

export function isNicknameLengthValid(str) {
  return str.length > 0 && !hasWhitespace(str) && getDisplayByteLength(str) <= NICKNAME_MAX_BYTES
}
