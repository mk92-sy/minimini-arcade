import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { getDisplayByteLength, NICKNAME_MAX_BYTES } from '../../lib/nicknameValidation.js'
import ConfirmDialog from './ConfirmDialog.jsx'
import { IconGoogle, IconKakao } from './icons.jsx'

export default function AuthModal() {
  const {
    modalOpen,
    closeAuthModal,
    user,
    nickname,
    authError,
    clearAuthError,
    signInWithGoogle,
    signInWithKakao,
    signOut,
    changeNickname,
    deleteAccount,
  } = useAuth()

  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [saveStatus, setSaveStatus] = useState('idle') // idle | saving | error
  const [saveError, setSaveError] = useState('')

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState('idle') // idle | deleting | error
  const [deleteError, setDeleteError] = useState('')
  const [accountDeleted, setAccountDeleted] = useState(false)

  if (!modalOpen) return null

  const handleClose = () => {
    setEditing(false)
    clearAuthError()
    closeAuthModal()
  }

  if (accountDeleted) {
    return (
      <div className="dialog__overlay" role="presentation" onClick={handleClose}>
        <div className="dialog__panel" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
          <h2 className="dialog__title">탈퇴 완료</h2>
          <p className="dialog__message">
            그동안 이용해주셔서 감사합니다. 계정과 모든 기록이 삭제됐어요.
          </p>
          <div className="dialog__actions">
            <button
              type="button"
              className="dialog__button dialog__button--primary"
              onClick={() => {
                setAccountDeleted(false)
                handleClose()
              }}
            >
              확인
            </button>
          </div>
        </div>
      </div>
    )
  }

  const startEdit = () => {
    setEditValue(nickname ?? '')
    setSaveStatus('idle')
    setEditing(true)
  }

  const handleNicknameInput = (value) => {
    if (getDisplayByteLength(value) <= NICKNAME_MAX_BYTES) {
      setEditValue(value)
    }
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

  const handleDeleteAccount = async () => {
    setDeleteStatus('deleting')
    const { error } = await deleteAccount()
    if (error) {
      setDeleteStatus('error')
      setDeleteError(error.message)
      return
    }
    setDeleteDialogOpen(false)
    setDeleteStatus('idle')
    setAccountDeleted(true)
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
            {authError && <p className="auth-modal__error">{authError}</p>}
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
              <div className="auth-modal__edit-block">
                <div className="auth-modal__edit-row">
                  <input
                    className="submit-score__input"
                    value={editValue}
                    onChange={(e) => handleNicknameInput(e.target.value)}
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
                <p className="auth-modal__byte-counter">
                  {getDisplayByteLength(editValue)}/{NICKNAME_MAX_BYTES}바이트 (한글 최대 12자)
                </p>
                <p className="auth-modal__warning">
                  ⚠️ 부적절한 닉네임(욕설·비방·광고성 문구 등)은 별도 경고 없이 계정이 삭제될 수 있어요.
                </p>
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

            <div className="auth-modal__danger-zone">
              <button
                type="button"
                className="auth-modal__delete-link"
                onClick={() => setDeleteDialogOpen(true)}
              >
                회원 탈퇴
              </button>
              {deleteStatus === 'error' && <p className="submit-score__error">{deleteError}</p>}
            </div>

            <ConfirmDialog
              open={deleteDialogOpen}
              title="회원 탈퇴"
              message={
                '탈퇴하면 랭킹 기록과 좋아요가 모두 삭제되고 되돌릴 수 없어요.\n같은 계정으로는 24시간 후에 다시 가입할 수 있어요.\n정말 탈퇴하시겠어요?'
              }
              confirmLabel={deleteStatus === 'deleting' ? '처리 중...' : '탈퇴하기'}
              cancelLabel="취소"
              onConfirm={handleDeleteAccount}
              onCancel={() => setDeleteDialogOpen(false)}
            />
          </>
        )}
      </div>
    </div>
  )
}
