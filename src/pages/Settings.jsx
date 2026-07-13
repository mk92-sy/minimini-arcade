import { useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import { getDisplayByteLength, NICKNAME_MAX_BYTES } from '../lib/nicknameValidation.js'

export default function Settings() {
  const { isConfigured, user, nickname, openAuthModal, changeNickname } = useAuth()
  const [editValue, setEditValue] = useState(nickname ?? '')
  const [status, setStatus] = useState('idle') // idle | saving | saved | error
  const [errorMsg, setErrorMsg] = useState('')

  if (!isConfigured) return null

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
    if (getDisplayByteLength(value) <= NICKNAME_MAX_BYTES) {
      setEditValue(value)
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
            {getDisplayByteLength(editValue)}/{NICKNAME_MAX_BYTES}바이트 (한글 최대 12자)
          </p>
          <p className="auth-modal__warning">
            ⚠️ 부적절한 닉네임(욕설·비방·광고성 문구 등)은 별도 경고 없이 계정이 삭제될 수 있어요.
          </p>
          {status === 'saved' && <p className="settings-page__saved">닉네임이 변경됐어요.</p>}
          {status === 'error' && <p className="submit-score__error">{errorMsg}</p>}
        </section>
      </div>
    </div>
  )
}
