import { useEffect, useState } from 'react'
import { submitScore, fetchMyRank } from '../../lib/scores.js'
import { claimCoinsForScore } from '../../lib/coins.js'
import { hasSubmittedToday, markSubmittedToday } from '../../lib/dailyLimit.js'
import { isRankingLocked } from '../../lib/rankingLock.js'
import { useAuth } from '../../context/AuthContext.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

const DAILY_LIMIT_ERROR = 'DAILY_LIMIT_REACHED'
const RANKING_LOCKED_ERROR = 'RANKING_LOCKED'

/**
 * 점수 등록. 로그인한 회원만 등록할 수 있고, 닉네임은 프로필에서 자동으로 가져와요.
 *
 * - 등록이 "가능한" 상황(로그인 + 오늘 미등록 + 집계 시간 아님)에서만 버튼 클릭 시 확인 다이얼로그를 띄웁니다.
 * - 등록이 "불가능한" 상황(비로그인 / 오늘 이미 등록함 / 23:00~24:00 집계 시간)에서는
 *   다이얼로그 없이 게임 하단에 안내 메시지만 보여줍니다.
 * 실제 하루 제한/집계 시간 잠금은 DB 트리거가 강제하고, 로컬 저장/시간 체크는 UX 편의용입니다.
 *
 * @param {'asc'|'desc'} order - 이 게임에서 낮을수록 좋은지/높을수록 좋은지 (신기록 판정, 순위 계산용)
 */
export default function SubmitScoreForm({ gameId, score, unit = '', order = 'desc', onRequestLogin, onSubmitted }) {
  const { user, nickname, notifyCoinsAwarded } = useAuth()
  const [status, setStatus] = useState('idle') // idle | confirming | submitting | done | limited | locked | error
  const [errorMsg, setErrorMsg] = useState('')
  const [locked, setLocked] = useState(isRankingLocked())

  useEffect(() => {
    if (hasSubmittedToday(gameId, user?.id)) {
      setStatus('done')
    }
  }, [gameId, user?.id])

  // 자정 넘어가는 시점을 놓치지 않도록 주기적으로 재확인
  useEffect(() => {
    const interval = setInterval(() => setLocked(isRankingLocked()), 30 * 1000)
    return () => clearInterval(interval)
  }, [])

  // 불가능한 케이스 0: 23:00~24:00 랭킹 집계 시간 → 안내 메시지만 (다이얼로그 없음)
  if (locked) {
    return (
      <div className="submit-score submit-score--locked">
        <p className="submit-score__prompt">⏳ 랭킹 집계 중입니다. 자정 이후 다시 시도해주세요.</p>
      </div>
    )
  }

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

    // 제출 전 "이전 최고 기록"을 먼저 알아둬야 신기록 여부를 판단할 수 있어요.
    const { data: before } = await fetchMyRank(gameId, user.id, order)

    const { error } = await submitScore(gameId, user.id, nickname, score)

    if (error) {
      const isDailyLimit = error.message?.includes(DAILY_LIMIT_ERROR)
      const isRankingLockedError = error.message?.includes(RANKING_LOCKED_ERROR)

      if (isRankingLockedError) {
        setLocked(true) // 서버가 막았다는 건 실제로 그 시간대라는 뜻 -> 잠금 화면으로 전환
        return
      }

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

    const isNewRecord =
      !before || (order === 'asc' ? score < before.best_score : score > before.best_score)

    const [{ awards }, { data: after }] = await Promise.all([
      claimCoinsForScore(gameId),
      fetchMyRank(gameId, user.id, order),
    ])

    notifyCoinsAwarded(awards, gameId, {
      isNewRecord,
      rank: after?.rank ?? null,
      total: after?.total ?? null,
    })
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
