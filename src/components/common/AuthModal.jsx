import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'
import { IconGoogle, IconKakao } from './icons.jsx'

export default function AuthModal() {
  const { modalOpen, closeAuthModal, user, nickname, authError, clearAuthError, signInWithGoogle, signInWithKakao, signOut, deleteAccount } =
    useAuth()
  const navigate = useNavigate()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState('idle') // idle | deleting | error
  const [deleteError, setDeleteError] = useState('')
  const [accountDeleted, setAccountDeleted] = useState(false)

  if (!modalOpen) return null

  const handleClose = () => {
    clearAuthError()
    closeAuthModal()
  }

  const goToSettings = () => {
    closeAuthModal()
    navigate('/settings')
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

            <div className="auth-modal__nickname-row">
              <span className="auth-modal__nickname">{nickname}</span>
              <button type="button" className="dialog__button dialog__button--ghost" onClick={goToSettings}>
                설정에서 변경
              </button>
            </div>

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
