import { useAuth } from '../../context/AuthContext.jsx'
import { IconGoogle, IconKakao } from './icons.jsx'

/**
 * 로그인 방법 선택 모달. 로그아웃/닉네임/탈퇴는 전부 이 모달 밖으로 옮겨졌어요
 * (로그아웃: 헤더의 로그아웃 아이콘 버튼 / 닉네임·탈퇴: /settings 페이지).
 */
export default function AuthModal() {
  const { modalOpen, closeAuthModal, authError, clearAuthError, signInWithGoogle, signInWithKakao } = useAuth()

  if (!modalOpen) return null

  const handleClose = () => {
    clearAuthError()
    closeAuthModal()
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
