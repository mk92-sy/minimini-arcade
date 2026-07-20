// 팝업 창을 통한 소셜 로그인 헬퍼.
//
// 동작 원리:
// 1. `skipBrowserRedirect: true`로 signInWithOAuth를 호출하면 현재 탭은 이동하지
//    않고, 이동할 provider URL만 돌려받는다. 이 URL을 window.open()으로 새 팝업에서 연다.
// 2. 이때 PKCE code_verifier는 이미 이 탭(부모 창)의 localStorage에 저장된다.
// 3. 로그인을 마친 provider가 팝업을 다시 우리 앱(redirectTo, ?auth_popup=1)으로
//    돌려보내면, 팝업 안에서 로드된 앱(App.jsx가 PopupAuthCallback을 렌더링)이
//    같은 localStorage에서 code_verifier를 찾아 세션 교환을 완료하고 저장한다.
// 4. 부모 창과 팝업은 같은 출처라 localStorage를 공유하므로, supabase-js가 기본
//    제공하는 탭 간 세션 동기화(storage 이벤트)로 부모 창의 세션도 즉시 갱신된다.
// 5. 팝업은 세션이 생긴 걸 확인하면 스스로 창을 닫는다(PopupAuthCallback 참고).

const POPUP_NAME = 'mini-arcade-oauth'
const POPUP_FEATURES = 'width=480,height=640,menubar=no,toolbar=no,location=no,status=no,noopener=no'

export const AUTH_POPUP_QUERY_KEY = 'auth_popup'

function buildRedirectUrl() {
  const url = new URL(window.location.origin + window.location.pathname)
  url.searchParams.set(AUTH_POPUP_QUERY_KEY, '1')
  return url.toString()
}

/**
 * 팝업 창에서 OAuth 로그인을 시작합니다.
 * 팝업이 차단된 경우에는 현재 탭에서 이동하는 방식으로 안전하게 대체합니다.
 */
export async function startOAuthPopup(supabase, provider, extraOptions = {}) {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: buildRedirectUrl(),
      skipBrowserRedirect: true,
      ...extraOptions,
    },
  })

  if (error || !data?.url) {
    return { error: error ?? new Error('로그인 URL을 가져오지 못했어요.') }
  }

  const popup = window.open(data.url, POPUP_NAME, POPUP_FEATURES)

  if (!popup) {
    // 팝업 차단 등으로 못 열었으면 현재 탭에서라도 로그인은 되게끔 대체 이동
    window.location.assign(data.url)
    return { error: null }
  }

  popup.focus()
  return { error: null }
}

/**
 * supabase-js가 로컬스토리지에 남기는 인증 관련 캐시(세션 토큰, PKCE
 * code_verifier 등, 전부 `sb-` 접두사)를 모두 지웁니다. 로그아웃 시 호출해서
 * 로그인 흔적이 남지 않도록 합니다.
 */
export function clearSupabaseLocalCache() {
  try {
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('sb-'))
      .forEach((key) => window.localStorage.removeItem(key))
  } catch {
    // localStorage 접근이 막힌 환경(시크릿 모드 등)에서는 조용히 무시
  }
}
