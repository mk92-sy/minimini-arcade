import { useEffect } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'

/**
 * OAuth 팝업 창 안에서만 렌더링됩니다 (App.jsx가 ?auth_popup=1 쿼리로 감지).
 * 세션이 잡히는 즉시(부모 창과 localStorage를 공유하므로 부모 창도 곧바로
 * 로그인 상태가 됨) 스스로 창을 닫습니다.
 */
export default function PopupAuthCallback() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return undefined
    // 세션이 로컬스토리지에 기록된 직후라, 아주 짧게만 대기 후 닫음
    const timer = setTimeout(() => window.close(), 250)
    return () => clearTimeout(timer)
  }, [user])

  const params = new URLSearchParams(window.location.search)
  const oauthError = params.get('error_description') || params.get('error')

  return (
    <div className="popup-auth">
      <div className="popup-auth__card">
        {oauthError ? (
          <>
            <p className="popup-auth__title">로그인에 실패했어요</p>
            <p className="popup-auth__desc">{oauthError}</p>
            <button type="button" className="popup-auth__close" onClick={() => window.close()}>
              창 닫기
            </button>
          </>
        ) : (
          <>
            <span className="popup-auth__spinner" aria-hidden="true" />
            <p className="popup-auth__title">로그인 처리 중...</p>
            <p className="popup-auth__desc">완료되면 이 창은 자동으로 닫혀요.</p>
          </>
        )}
      </div>
    </div>
  )
}
