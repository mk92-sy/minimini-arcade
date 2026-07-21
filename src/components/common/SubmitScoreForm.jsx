import { useEffect, useState } from 'react'
import { submitScore, fetchMyRank } from '../../lib/scores.js'
import { claimCoinsForScore } from '../../lib/coins.js'
import { fetchInventory, useConsumable } from '../../lib/store.js'
import { hasSubmittedToday, markSubmittedToday } from '../../lib/dailyLimit.js'
import { isRankingLocked } from '../../lib/rankingLock.js'
import { useAuth } from '../../context/AuthContext.jsx'
import ConfirmDialog from './ConfirmDialog.jsx'

const DAILY_LIMIT_ERROR = 'DAILY_LIMIT_REACHED'
const RANKING_LOCKED_ERROR = 'RANKING_LOCKED'
const RETRY_LIMIT_ERROR = 'RETRY_LIMIT_REACHED'
const RETRY_TICKET_ITEM_ID = 'retry_ticket'

/**
 * 점수 등록. 로그인한 회원만 등록할 수 있고, 닉네임은 프로필에서 자동으로 가져와요.
 *
 * - 등록이 "가능한" 상황(로그인 + 오늘 미등록 + 집계 시간 아님)에서만 버튼 클릭 시 확인 다이얼로그를 띄웁니다.
 * - 등록이 "불가능한" 상황(비로그인 / 오늘 이미 등록함 / 23:00~24:00 집계 시간)에서는
 *   다이얼로그 없이 게임 하단에 안내 메시지만 보여줍니다.
 * - 오늘 이미 등록했더라도 "오늘 재도전권"(store_items.retry_ticket)을 보유하고 있으면,
 *   이 회차 기록을 재도전권으로 추가 등록할지 물어보는 모달을 띄워줍니다(게임당 하루 최대 2회 —
 *   초과분은 서버가 거부합니다).
 * - 이 컴포넌트(=이번 판)에서 한 번이라도 등록(일반이든 재도전권이든)에 성공하면,
 *   그 즉시 등록 관련 UI를 전부 숨깁니다. "1판당 등록은 딱 1번"이라, 재도전권이
 *   남아있어도 같은 판 결과에 대해 또 등록 버튼을 띄우지 않습니다 — 다시 플레이해서
 *   새 판을 끝내야 다음 등록(있다면 재도전권 포함)을 시도할 수 있어요.
 * 실제 하루 제한/집계 시간 잠금은 DB 트리거가 강제하고, 로컬 저장/시간 체크는 UX 편의용입니다.
 *
 * @param {'asc'|'desc'} order - 이 게임에서 낮을수록 좋은지/높을수록 좋은지 (신기록 판정, 순위 계산용)
 */
export default function SubmitScoreForm({ gameId, score, unit = '', order = 'desc', onRequestLogin, onSubmitted }) {
  const { user, nickname, notifyCoinsAwarded } = useAuth()
  // idle | confirming | submitting | registered | done | limited | locked | error
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [locked, setLocked] = useState(isRankingLocked())

  const [retryTicketQty, setRetryTicketQty] = useState(0)
  const [retryConfirmOpen, setRetryConfirmOpen] = useState(false)
  const [retryStatus, setRetryStatus] = useState('idle') // idle | busy
  const [retryError, setRetryError] = useState('')

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

  // 재도전권 보유 수량 확인 (오늘 이미 등록한 상태에서만 의미가 있지만, 부담 없는
  // 단건 조회라 로그인 시 미리 받아둠 - "이미 등록했어요" 화면이 뜨자마자 바로 보이게)
  useEffect(() => {
    if (!user) {
      setRetryTicketQty(0)
      return undefined
    }
    let cancelled = false
    fetchInventory(user.id).then((inventory) => {
      if (!cancelled) setRetryTicketQty(inventory[RETRY_TICKET_ITEM_ID] ?? 0)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  // 실제 등록 + 성공 시 후처리(신기록 판정, 코인 지급 알림)를 한 곳에 모아서
  // 일반 등록 흐름과 재도전권 흐름이 그대로 재사용합니다.
  const submitAndHandleResult = async () => {
    const { data: before } = await fetchMyRank(gameId, user.id, order)
    const { error } = await submitScore(gameId, user.id, nickname, score)

    if (error) return { ok: false, error }

    markSubmittedToday(gameId, user.id)
    onSubmitted?.()

    const isNewRecord = !before || (order === 'asc' ? score < before.best_score : score > before.best_score)

    // 재도전권으로 등록했더라도 이 게임/오늘의 "몇 번째 등록인지"에 맞게 서버가
    // 기본 보상(1코인)을 그대로 지급합니다(claim_coins_for_score 참고).
    const [{ awards }, { data: after }] = await Promise.all([
      claimCoinsForScore(gameId),
      fetchMyRank(gameId, user.id, order),
    ])

    notifyCoinsAwarded(awards, gameId, {
      isNewRecord,
      rank: after?.rank ?? null,
      total: after?.total ?? null,
    })

    return { ok: true }
  }

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

  // 이번 판에서 이미 등록을 마쳤음(일반이든 재도전권이든) → UI를 완전히 숨기고
  // 짧은 완료 문구만 남깁니다. "다시하기"는 이 컴포넌트 밖(게임 화면)에 항상 있어요.
  if (status === 'registered') {
    return (
      <div className="submit-score submit-score--registered">
        <p className="submit-score__done-text">✅ 이번 기록이 랭킹에 등록됐어요!</p>
      </div>
    )
  }

  const handleUseRetryTicket = async () => {
    if (retryStatus === 'busy') return
    setRetryStatus('busy')
    setRetryError('')

    const { data, error: useError } = await useConsumable(RETRY_TICKET_ITEM_ID, gameId)
    if (useError) {
      setRetryStatus('idle')
      setRetryError(
        useError.message?.includes(RETRY_LIMIT_ERROR)
          ? '오늘 사용 가능한 재도전권을 이미 다 쓰셨어요. (게임당 하루 최대 2회 등록)'
          : '재도전권 사용에 실패했어요. 잠시 후 다시 시도해주세요.',
      )
      return
    }
    setRetryTicketQty(data.remaining_quantity)

    const result = await submitAndHandleResult()
    setRetryStatus('idle')
    setRetryConfirmOpen(false)

    if (!result.ok) {
      // 아이템은 이미 소모됐고 재도전권으로 한도는 늘어났으니, 등록 자체만 실패한
      // 상황이에요. 재시도할 수 있게 화면을 등록 전 상태로 되돌립니다.
      setStatus('idle')
      setErrorMsg('랭킹 등록에 실패했어요. 잠시 후 다시 시도해주세요.')
      return
    }

    setStatus('registered')
  }

  // 불가능한 케이스 2: 오늘 이미 등록함 → 안내 메시지 + (재도전권 있으면) 추가 등록 제안
  if (status === 'done' || status === 'limited') {
    return (
      <>
        <div className="submit-score submit-score--done">
          <p className="submit-score__done-text">
            {status === 'limited' ? errorMsg : '오늘은 이미 랭킹에 등록하셨어요. 내일 다시 도전해주세요!'}
          </p>
          <button className="submit-score__button" type="button" disabled>
            랭킹 등록 완료
          </button>

          {retryTicketQty > 0 && (
            <button
              type="button"
              className="submit-score__retry-button"
              onClick={() => setRetryConfirmOpen(true)}
            >
              🎟️ 재도전권으로 한 번 더 등록하기 (보유 {retryTicketQty}개)
            </button>
          )}
          {retryError && <p className="submit-score__error">{retryError}</p>}
        </div>

        <ConfirmDialog
          open={retryConfirmOpen}
          title="재도전권 사용"
          message={`재도전권을 사용해서 이번 기록(${score}${unit})을 랭킹에 추가로 등록할까요?\n게임당 하루 최대 2회까지만 등록할 수 있어요.`}
          confirmLabel={retryStatus === 'busy' ? '등록 중...' : '사용하고 등록'}
          cancelLabel="취소"
          onConfirm={handleUseRetryTicket}
          onCancel={() => setRetryConfirmOpen(false)}
        />
      </>
    )
  }

  const handleConfirm = async () => {
    setStatus('submitting')
    const result = await submitAndHandleResult()

    if (!result.ok) {
      const { error } = result
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

    setStatus('registered')
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
