import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { IconGoogle, IconKakao } from './icons.jsx'

const TAB = {
  SNS: 'sns',
  ID: 'id',
}

/**
 * 로그인 방법 선택 모달. 로그아웃/닉네임/탈퇴는 전부 이 모달 밖으로 옮겨졌어요
 * (로그아웃: 헤더의 로그아웃 아이콘 버튼 / 닉네임·탈퇴: /settings 페이지).
 *
 * 탭 2개:
 * - SNS로그인(기본): 구글/카카오. 일반 이용자용.
 * - 일반로그인: 아이디/비밀번호. 운영자가 SQL로 미리 만들어둔 계정 전용이라
 *   여기엔 회원가입 UI가 없어요(supabase/add_master_account.sql 참고).
 */
export default function AuthModal() {
  const {
    modalOpen,
    closeAuthModal,
    authError,
    clearAuthError,
    signInWithGoogle,
    signInWithKakao,
    signInWithId,
  } = useAuth()

  const [tab, setTab] = useState(TAB.SNS)
  const [loginId, setLoginId] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [idLoginStatus, setIdLoginStatus] = useState('idle') // idle | busy

  if (!modalOpen) return null

  const handleClose = () => {
    clearAuthError()
    closeAuthModal()
  }

  const handleTabChange = (nextTab) => {
    if (nextTab === tab) return
    clearAuthError()
    setTab(nextTab)
  }

  const handleIdLoginSubmit = async (e) => {
    e.preventDefault()
    if (idLoginStatus === 'busy') return

    setIdLoginStatus('busy')
    const { error } = await signInWithId(loginId, loginPassword)
    setIdLoginStatus('idle')

    if (!error) {
      setLoginId('')
      setLoginPassword('')
    }
  }

  return (
    <div className="dialog__overlay" role="presentation" onClick={handleClose}>
      <div
        className="dialog__panel auth-modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="dialog__title">로그인</h2>

        <div className="auth-modal__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === TAB.SNS}
            className={`auth-modal__tab${tab === TAB.SNS ? ' auth-modal__tab--active' : ''}`}
            onClick={() => handleTabChange(TAB.SNS)}
          >
            SNS로그인
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === TAB.ID}
            className={`auth-modal__tab${tab === TAB.ID ? ' auth-modal__tab--active' : ''}`}
            onClick={() => handleTabChange(TAB.ID)}
          >
            일반로그인
          </button>
        </div>

        {tab === TAB.SNS ? (
          <>
            <p className="dialog__message">
              구글 또는 카카오 계정으로 바로 시작할 수 있어요.{'\n'}랭킹 등록은 로그인 후에 가능합니다.
            </p>
            <div className="auth-modal__providers">
              <button
                type="button"
                className="auth-modal__provider auth-modal__provider--google"
                onClick={signInWithGoogle}
              >
                <IconGoogle /> 구글로 로그인
              </button>
              <button
                type="button"
                className="auth-modal__provider auth-modal__provider--kakao"
                onClick={signInWithKakao}
              >
                <IconKakao /> 카카오로 로그인
              </button>
            </div>
          </>
        ) : (
          <form className="auth-modal__id-form" onSubmit={handleIdLoginSubmit}>
            <p className="dialog__message">운영자 전용 로그인이에요. 별도 회원가입은 지원하지 않아요.</p>
            <label className="auth-modal__field">
              <span>아이디</span>
              <input
                type="text"
                autoComplete="username"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                placeholder="아이디"
              />
            </label>
            <label className="auth-modal__field">
              <span>비밀번호</span>
              <input
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="비밀번호"
              />
            </label>
            <button type="submit" className="auth-modal__id-submit" disabled={idLoginStatus === 'busy'}>
              {idLoginStatus === 'busy' ? '로그인 중...' : '로그인'}
            </button>
          </form>
        )}

        {authError && <p className="auth-modal__error">{authError}</p>}

        <div className="dialog__actions">
          <button type="button" className="dialog__button dialog__button--ghost" onClick={handleClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
