import { useAuth } from '../../context/AuthContext.jsx'

export default function AuthButton() {
  const { isConfigured, user, nickname, openAuthModal } = useAuth()

  if (!isConfigured) return null

  return (
    <button type="button" className="auth-button" onClick={openAuthModal}>
      {user ? (
        <>
          <span className="auth-button__dot" aria-hidden="true" />
          <span className="auth-button__name">{nickname ?? '내 계정'}</span>
        </>
      ) : (
        '로그인'
      )}
    </button>
  )
}
