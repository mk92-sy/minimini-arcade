import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { getDisplayByteLength, NICKNAME_MAX_BYTES } from '../lib/nicknameValidation.js'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import usePageTitle from '../hooks/usePageTitle.js'

export default function Settings() {
  usePageTitle('설정')
  const { isConfigured, user, nickname, openAuthModal, changeNickname, deleteAccount } = useAuth()
  const navigate = useNavigate()

  const [editValue, setEditValue] = useState(nickname ?? '')
  const [status, setStatus] = useState('idle') // idle | saving | saved | error
  const [errorMsg, setErrorMsg] = useState('')

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState('idle') // idle | deleting | error
  const [deleteError, setDeleteError] = useState('')
  const [deleted, setDeleted] = useState(false)

  if (!isConfigured) return null

  if (deleted) {
    return (
      <div className="hub hub--single">
        <div className="oos">
          <p className="oos__sign">SETTINGS</p>
          <h1 className="oos__title">탈퇴 완료</h1>
          <p className="oos__sub">그동안 이용해주셔서 감사합니다. 계정과 모든 기록이 삭제됐어요.</p>
          <button type="button" className="oos__back" onClick={() => navigate('/')}>
            홈으로
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="hub hub--single">
        <div className="oos">
          <p className="oos__sign">SETTINGS</p>
          <h1 className="oos__title">로그인이 필요해요</h1>
          <p className="oos__sub">설정을 변경하려면 먼저 로그인해주세요.</p>
          <button type="button" className="oos__back" onClick={openAuthModal}>
            로그인하기
          </button>
        </div>
      </div>
    )
  }

  const handleInput = (value) => {
    const noSpace = value.replace(/\s/g, '')
    if (getDisplayByteLength(noSpace) <= NICKNAME_MAX_BYTES) {
      setEditValue(noSpace)
      setStatus('idle')
    }
  }

  const handleSave = async () => {
    setStatus('saving')
    const { error } = await changeNickname(editValue)
    if (error) {
      setStatus('error')
      setErrorMsg(error.message)
      return
    }
    setStatus('saved')
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
    setDeleted(true)
  }

  return (
    <div className="hub">
      <div className="settings-page">
        <h1 className="settings-page__title">설정</h1>

        <section className="settings-page__section">
          <h2 className="settings-page__section-title">닉네임</h2>
          <div className="auth-modal__edit-row">
            <input
              className="submit-score__input"
              value={editValue}
              onChange={(e) => handleInput(e.target.value)}
            />
            <button
              type="button"
              className="dialog__button dialog__button--primary"
              onClick={handleSave}
              disabled={status === 'saving'}
            >
              저장
            </button>
          </div>
          <p className="auth-modal__byte-counter">
            {getDisplayByteLength(editValue)}/{NICKNAME_MAX_BYTES}바이트 (한글 최대 8자, 띄어쓰기 불가)
          </p>
          <p className="auth-modal__warning">
            ⚠️ 부적절한 닉네임(욕설·비방·광고성 문구 등)은 별도 경고 없이 계정이 삭제될 수 있어요.
          </p>
          {status === 'saved' && <p className="settings-page__saved">닉네임이 변경됐어요.</p>}
          {status === 'error' && <p className="submit-score__error">{errorMsg}</p>}
        </section>

        <section className="settings-page__section settings-page__section--danger">
          <h2 className="settings-page__section-title">회원 탈퇴</h2>
          <p className="settings-page__danger-desc">
            탈퇴하면 랭킹 기록과 좋아요가 모두 삭제되고 되돌릴 수 없어요. 같은 계정으로는 24시간 후에 다시
            가입할 수 있어요.
          </p>
          <button type="button" className="auth-modal__delete-link" onClick={() => setDeleteDialogOpen(true)}>
            회원 탈퇴하기
          </button>
          {deleteStatus === 'error' && <p className="submit-score__error">{deleteError}</p>}
        </section>
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
    </div>
  )
}
