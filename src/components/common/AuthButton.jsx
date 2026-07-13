import { useAuth } from '../../context/AuthContext.jsx'
import { IconCoin } from './icons.jsx'

export default function AuthButton() {
  const { isConfigured, user, nickname, coins, openAuthModal } = useAuth()

  if (!isConfigured) return null

  return (
    <button type="button" className="auth-button" onClick={openAuthModal}>
      {user ? (
        <>
          <span className="auth-button__coins">
            <IconCoin /> {coins.toLocaleString('ko-KR')}
          </span>
          <span className="auth-button__divider" aria-hidden="true" />
          <span className="auth-button__dot" aria-hidden="true" />
          <span className="auth-button__name">{nickname ?? '내 계정'}</span>
        </>
      ) : (
        '로그인'
      )}
    </button>
  )
}
