import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import { IconLogIn, IconLogOut } from './icons.jsx'

export default function AuthButton() {
  const { isConfigured, user, nickname, openAuthModal, signOut } = useAuth()
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
    <div className="auth-button">
      <button type="button" className="auth-button__name" onClick={() => navigate('/settings')}>
        <span className="auth-button__dot" aria-hidden="true" />
        {nickname ?? '내 계정'}
      </button>
      <span className="auth-button__divider" aria-hidden="true" />
      <button type="button" className="auth-button__icon" onClick={signOut} aria-label="로그아웃" title="로그아웃">
        <IconLogOut />
      </button>
    </div>
  )
}
