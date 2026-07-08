import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { IconGoogle, IconKakao } from './icons.jsx'

export default function AuthModal() {
  const {
    modalOpen,
    closeAuthModal,
    user,
    nickname,
    signInWithGoogle,
    signInWithKakao,
    signOut,
    changeNickname,
  } = useAuth()

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | error
  const [saveError, setSaveError] = useState('')

  if (!modalOpen) return null

  const startEdit = () => {
    setEditValue(nickname ?? '')
    setSaveStatus('idle')
    setEditing(true)
  }

  const handleSave = async () => {
    setSaveStatus('saving')
    const { error } = await changeNickname(editValue)
    if (error) {
      setSaveStatus('error')
      setSaveError(error.message)
      return
    }
    setSaveStatus('idle')
    setEditing(false)
  }

  const handleClose = () => {
    setEditing(false)
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
        {!user ? (
          <>
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
          </>
        ) : (
          <>
            <h2 className="dialog__title">내 계정</h2>

            {!editing ? (
              <div className="auth-modal__nickname-row">
                <span className="auth-modal__nickname">{nickname}</span>
                <button type="button" className="dialog__button dialog__button--ghost" onClick={startEdit}>
                  닉네임 변경
                </button>
              </div>
            ) : (
              <div className="auth-modal__edit-row">
                <input
                  className="submit-score__input"
                  value={editValue}
                  maxLength={20}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoFocus
                />
                <button
                  type="button"
                  className="dialog__button dialog__button--primary"
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                >
                  저장
                </button>
              </div>
            )}
            {saveStatus === 'error' && <p className="submit-score__error">{saveError}</p>}

            <div className="dialog__actions">
              <button type="button" className="dialog__button dialog__button--ghost" onClick={signOut}>
                로그아웃
              </button>
              <button type="button" className="dialog__button dialog__button--primary" onClick={handleClose}>
                닫기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
