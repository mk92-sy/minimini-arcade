import { useCallback, useEffect, useRef, useState } from 'react'
import GameShell from '../components/common/GameShell.jsx'
import Leaderboard from '../components/common/Leaderboard.jsx'
import SubmitScoreForm from '../components/common/SubmitScoreForm.jsx'
import ShareButton from '../components/common/ShareButton.jsx'
import LikeButton from '../components/common/LikeButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { games } from '../data/games.js'

const GAME_ID = 'reaction'
const meta = games.find((g) => g.id === GAME_ID)

const PHASE = {
  IDLE: 'idle',
  WAITING: 'waiting',
  READY: 'ready',
  TOO_SOON: 'too-soon',
  RESULT: 'result',
}

const SCREEN_TEXT = {
  [PHASE.IDLE]: '클릭해서 시작',
  [PHASE.WAITING]: '기다리세요...',
  [PHASE.READY]: '지금 클릭!',
  [PHASE.TOO_SOON]: '너무 빨랐어요!',
}

export default function ReactionGame() {
  const { openAuthModal } = useAuth()
  const [phase, setPhase] = useState(PHASE.IDLE)
  const [reactionMs, setReactionMs] = useState(null)
  const [bestMs, setBestMs] = useState(null)
  const [attempts, setAttempts] = useState(0)
  const [leaderboardRefreshSignal, setLeaderboardRefreshSignal] = useState(0)

  const timeoutRef = useRef(null)
  const readyAtRef = useRef(0)

  const clearPendingTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  useEffect(() => clearPendingTimeout, [])

  const startRound = useCallback(() => {
    setReactionMs(null)
    setPhase(PHASE.WAITING)

    const delay = 1200 + Math.random() * 2800
    timeoutRef.current = setTimeout(() => {
      readyAtRef.current = performance.now()
      setPhase(PHASE.READY)
    }, delay)
  }, [])

  const handleScreenClick = () => {
    if (phase === PHASE.IDLE || phase === PHASE.TOO_SOON || phase === PHASE.RESULT) {
      startRound()
      return
    }

    if (phase === PHASE.WAITING) {
      clearPendingTimeout()
      setPhase(PHASE.TOO_SOON)
      return
    }

    if (phase === PHASE.READY) {
      const ms = Math.round(performance.now() - readyAtRef.current)
      setReactionMs(ms)
      setAttempts((n) => n + 1)
      setBestMs((prev) => (prev === null ? ms : Math.min(prev, ms)))
      setPhase(PHASE.RESULT)
    }
  }

  const hint = {
    [PHASE.IDLE]: '색이 초록으로 바뀌는 순간 클릭하세요',
    [PHASE.TOO_SOON]: '아직 초록색이 아니었어요 · 클릭해서 재시도',
    [PHASE.RESULT]: '클릭해서 재시도',
  }[phase]

  const shareText =
    reactionMs !== null
      ? `나는 반응속도 ${reactionMs}ms! 너도 도전해봐 ⚡`
      : '미니 아케이드 반응속도 테스트, 너도 도전해봐 ⚡'

  return (
    <GameShell eyebrow={`CABINET ${meta.number}`} title={meta.title} tint={meta.tint} wide>
      <div className="game-layout">
        <div className="game-layout__main reaction">
          <button
            type="button"
            className={`reaction__screen reaction__screen--${phase}`}
            onClick={handleScreenClick}
          >
            <span className="reaction__label">
              {phase === PHASE.RESULT ? `${reactionMs} ms` : SCREEN_TEXT[phase]}
            </span>
            {hint && <span className="reaction__hint">{hint}</span>}
          </button>

          <div className="reaction__stats">
            <div className="reaction__stat">
              <span className="reaction__stat-label">이번 기록</span>
              <span className="reaction__stat-value">{reactionMs !== null ? `${reactionMs}ms` : '-'}</span>
            </div>
            <div className="reaction__stat">
              <span className="reaction__stat-label">최고 기록</span>
              <span className="reaction__stat-value">{bestMs !== null ? `${bestMs}ms` : '-'}</span>
            </div>
            <div className="reaction__stat">
              <span className="reaction__stat-label">시도 횟수</span>
              <span className="reaction__stat-value">{attempts}</span>
            </div>
          </div>

          {phase === PHASE.RESULT && (
            <SubmitScoreForm
              gameId={GAME_ID}
              score={reactionMs}
              unit="ms"
              onRequestLogin={openAuthModal}
              onSubmitted={() => setLeaderboardRefreshSignal((n) => n + 1)}
            />
          )}

          <div className="game-actions">
            <LikeButton gameId={GAME_ID} onRequestLogin={openAuthModal} />
            <ShareButton title="반응속도 테스트 — Mini Arcade" text={shareText} />
          </div>
        </div>

        <div className="game-layout__side">
          <Leaderboard
            gameId={GAME_ID}
            order="asc"
            unit="ms"
            limit={10}
            refreshSignal={leaderboardRefreshSignal}
          />
        </div>
      </div>
    </GameShell>
  )
}
