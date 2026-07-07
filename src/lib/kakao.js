const KAKAO_SDK_SRC = 'https://developers.kakao.com/sdk/js/kakao.js'
let loadPromise = null

function loadKakaoSdk() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('브라우저 환경이 아닙니다.'))
  }
  if (window.Kakao?.isInitialized?.()) {
    return Promise.resolve(window.Kakao)
  }
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${KAKAO_SDK_SRC}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Kakao))
      existing.addEventListener('error', reject)
      return
    }
    const script = document.createElement('script')
    script.src = KAKAO_SDK_SRC
    script.async = true
    script.onload = () => resolve(window.Kakao)
    script.onerror = reject
    document.head.appendChild(script)
  }).then((Kakao) => {
    const jsKey = import.meta.env.VITE_KAKAO_JS_KEY
    if (jsKey && !Kakao.isInitialized()) {
      Kakao.init(jsKey)
    }
    return Kakao
  })

  return loadPromise
}

export function isKakaoConfigured() {
  return Boolean(import.meta.env.VITE_KAKAO_JS_KEY)
}

export async function shareToKakao({ title, text, url }) {
  if (!isKakaoConfigured()) {
    throw new Error('VITE_KAKAO_JS_KEY가 설정되어 있지 않습니다. .env를 확인해주세요.')
  }
  const Kakao = await loadKakaoSdk()
  Kakao.Share.sendDefault({
    objectType: 'text',
    text: `${title}\n${text}`,
    link: { mobileWebUrl: url, webUrl: url },
  })
}
