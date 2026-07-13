import { useEffect, useState } from 'react'
import { submitScore } from '../../lib/scores.js'
import { claimCoinsForScore } from '../../lib/coins.js'
import { hasSubmittedToday, markSubmittedToday } from '../../lib/dailyLimit.js'
import { useAuth } from '../../context/AuthContext.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

const DAILY_LIMIT_ERROR = 'DAILY_LIMIT_REACHED'

/**
 * 점수 등록. 로그인한 회원만 등록할 수 있고, 닉네임은 프로필에서 자동으로 가져와요.
 *
 * - 등록이 "가능한" 상황(로그인 + 오늘 미등록)에서만 버튼 클릭 시 확인 다이얼로그를 띄웁니다.
 * - 등록이 "불가능한" 상황(비로그인 / 오늘 이미 등록함)에서는 다이얼로그 없이
 *   게임 하단에 안내 메시지만 보여줍니다.
 * 실제 하루 제한은 DB 트리거(user_id 기준)가 강제하고, 로컬 저장은 UX 편의용입니다.
 */
export default function SubmitScoreForm({ gameId, score, unit = '', onRequestLogin, onSubmitted }) {
  const { user, nickname, notifyCoinsAwarded } = useAuth()
  const [status, setStatus] = useState('idle') // idle | confirming | submitting | done | limited | error
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (hasSubmittedToday(gameId, user?.id)) {
      setStatus('done')
    }
  }, [gameId, user?.id])

  // 불가능한 케이스 1: 비로그인 → 안내 메시지만 (다이얼로그 없음)
  if (!user) {
    return (
      <div className="submit-score submit-score--locked">
        <p className="submit-score__prompt">랭킹 등록은 로그인 후 이용할 수 있어요.</p>
        <button type="button" className="submit-score__button" onClick={onRequestLogin}>
          로그인하기
        </button>
      </div>
    )
  }

  // 불가능한 케이스 2: 오늘 이미 등록함 → 안내 메시지만 (다이얼로그 없음)
  if (status === 'done' || status === 'limited') {
    return (
      <div className="submit-score submit-score--done">
        <p className="submit-score__done-text">
          {status === 'limited' ? errorMsg : '랭킹에 등록됐어요! 내일 다시 도전해보세요.'}
        </p>
        <button className="submit-score__button" type="button" disabled>
          랭킹 등록 완료
        </button>
      </div>
    )
  }

  const handleConfirm = async () => {
    setStatus('submitting')
    const { error } = await submitScore(gameId, user.id, nickname, score)

    if (error) {
      const isDailyLimit = error.message?.includes(DAILY_LIMIT_ERROR)
      markSubmittedToday(gameId, user.id) // 서버가 이미 막았으니 로컬도 오늘은 그만 시도하도록 동기화
      setStatus(isDailyLimit ? 'limited' : 'error')
      setErrorMsg(
        isDailyLimit
          ? '오늘은 이미 랭킹에 등록하셨어요. 내일 다시 도전해주세요!'
          : '랭킹 등록에 실패했어요. 잠시 후 다시 시도해주세요.',
      )
      return
    }

    markSubmittedToday(gameId, user.id)
    setStatus('done')
    onSubmitted?.()

    const { awards } = await claimCoinsForScore(gameId)
    notifyCoinsAwarded(awards, gameId)
  }

  // 가능한 케이스: 버튼 클릭 시에만 다이얼로그로 확인
  return (
    <>
      <div className="submit-score">
        <button
          type="button"
          className="submit-score__button"
          onClick={() => setStatus('confirming')}
          disabled={status === 'submitting'}
        >
          {status === 'submitting' ? '등록 중...' : '랭킹 등록'}
        </button>
        {status === 'error' && <p className="submit-score__error">{errorMsg}</p>}
      </div>

      <ConfirmDialog
        open={status === 'confirming'}
        title="랭킹 등록"
        message={`${score}${unit} 기록을 "${nickname}" 닉네임으로 랭킹에 등록하시겠습니까?\n하루에 한 번만 등록할 수 있어요.`}
        confirmLabel="등록하기"
        cancelLabel="취소"
        onConfirm={handleConfirm}
        onCancel={() => setStatus('idle')}
      />
    </>
  )
}
