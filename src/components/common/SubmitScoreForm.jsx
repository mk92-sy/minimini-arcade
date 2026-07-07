import { useState } from 'react'
import { submitScore } from '../../lib/scores.js'

/**
 * 점수 등록 폼. 제출 성공 시 onSubmitted()를 호출해서
 * 부모가 Leaderboard의 refreshKey를 올리도록 함.
 */
export default function SubmitScoreForm({ gameId, score, unit = '', onSubmitted }) {
  const [nickname, setNickname] = useState('')
  const [status, setStatus] = useState('idle') // idle | submitting | error
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = nickname.trim()

    if (!trimmed) {
      setStatus('error')
      setErrorMsg('닉네임을 입력해주세요.')
      return
    }

    setStatus('submitting')
    const { error } = await submitScore(gameId, trimmed, score)

    if (error) {
      setStatus('error')
      setErrorMsg('랭킹 등록에 실패했어요. Supabase 연결을 확인해주세요.')
      return
    }

    setStatus('idle')
    onSubmitted?.()
  }

  return (
    <form className="submit-score" onSubmit={handleSubmit}>
      <p className="submit-score__prompt">
        <strong>
          {score}
          {unit}
        </strong>{' '}
        기록을 랭킹에 등록할까요?
      </p>
      <div className="submit-score__row">
        <input
          className="submit-score__input"
          type="text"
          maxLength={20}
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <button className="submit-score__button" type="submit" disabled={status === 'submitting'}>
          {status === 'submitting' ? '등록 중...' : '랭킹 등록'}
        </button>
      </div>
      {status === 'error' && <p className="submit-score__error">{errorMsg}</p>}
    </form>
  )
}
