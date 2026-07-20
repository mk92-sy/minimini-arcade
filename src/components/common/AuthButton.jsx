import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { IconLogIn, IconLogOut } from './icons.jsx'

export default function AuthButton() {
  const {
    isConfigured,
    user,
    nickname,
    equippedNicknameColorHex,
    equippedBadgeIcon,
    equippedBorder,
    openAuthModal,
    signOut,
  } = useAuth()
  const navigate = useNavigate()

  if (!isConfigured) return null

  if (!user) {
    return (
      <button type="button" className="auth-button auth-button--login" onClick={openAuthModal}>
        <IconLogIn /> 로그인
      </button>
    )
  }

  return (
    <div className={`auth-button${equippedBorder ? ' auth-button--border-glow' : ''}`}>
      <button type="button" className="auth-button__name" onClick={() => navigate('/settings')}>
        <span className="auth-button__dot" aria-hidden="true" />
        {equippedBadgeIcon && (
          <span className="auth-button__badge" aria-hidden="true">
            {equippedBadgeIcon}
          </span>
        )}
        <span
          className="auth-button__nickname-text"
          style={equippedNicknameColorHex ? { color: equippedNicknameColorHex } : undefined}
        >
          {nickname ?? '내 계정'}
        </span>
      </button>
      <span className="auth-button__divider" aria-hidden="true" />
      <button type="button" className="auth-button__icon" onClick={signOut} aria-label="로그아웃" title="로그아웃">
        <IconLogOut />
      </button>
    </div>
  )
}
