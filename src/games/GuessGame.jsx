import { useCallback, useMemo, useRef, useState } from 'react'
import GameShell from '../components/common/GameShell.jsx'
import Leaderboard from '../components/common/Leaderboard.jsx'
import SubmitScoreForm from '../components/common/SubmitScoreForm.jsx'
import ShareButton from '../components/common/ShareButton.jsx'
import LikeButton from '../components/common/LikeButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { games } from '../data/games.js'
import usePageTitle from '../hooks/usePageTitle.js'

const GAME_ID = 'guess'
const meta = games.find((g) => g.id === GAME_ID)

const MIN = 1
const MAX = 100

function randomTarget() {
  return Math.floor(Math.random() * (MAX - MIN + 1)) + MIN
}

export default function GuessGame() {
  usePageTitle(meta.title)
  const { openAuthModal } = useAuth()

  const targetRef = useRef(randomTarget())
  const [history, setHistory] = useState([]) // [{ value, hint: 'up'|'down' }]
  const [input, setInput] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [leaderboardRefreshSignal, setLeaderboardRefreshSignal] = useState(0)

  const finalAttempts = done ? attempts : null

  const resetGame = useCallback(() => {
    targetRef.current = randomTarget()
    setHistory([])
    setInput('')
    setAttempts(0)
    setDone(false)
    setError('')
  }, [])

  const handleSubmitGuess = (e) => {
    e.preventDefault()
    if (done) return

    const value = Number(input)
    if (!Number.isInteger(value) || value < MIN || value > MAX) {
      setError(`${MIN}부터 ${MAX} 사이의 숫자를 입력해주세요.`)
      return
    }
    setError('')

    const nextAttempts = attempts + 1
    setAttempts(nextAttempts)

    if (value === targetRef.current) {
      setHistory((prev) => [{ value, hint: 'correct' }, ...prev])
      setDone(true)
    } else {
      const hint = value < targetRef.current ? 'up' : 'down'
      setHistory((prev) => [{ value, hint }, ...prev])
    }
    setInput('')
  }

  const hintLabel = {
    up: '더 큰 수예요 ↑',
    down: '더 작은 수예요 ↓',
    correct: '정답! 🎉',
  }

  const shareText = useMemo(
    () =>
      done
        ? `숫자 맞추기 ${finalAttempts}번 만에 성공! 너도 도전해봐 🔢`
        : '미니 아케이드 숫자 맞추기, 1~100 사이 숫자를 맞혀봐 🔢',
    [done, finalAttempts],
  )

  return (
    <GameShell tint={meta.tint} wide>
      <div className="game-layout">
        <div className="game-layout__main guess">
          <div className="guess__screen">
            {!done ? (
              <>
                <p className="guess__prompt">{MIN}부터 {MAX} 사이의 숫자를 맞혀보세요</p>
                <form className="guess__input-row" onSubmit={handleSubmitGuess}>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={MIN}
                    max={MAX}
                    className="guess__input"
                    placeholder="숫자 입력"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="guess__submit-button">
                    확인
                  </button>
                </form>
                {error && <p className="guess__error">{error}</p>}
              </>
            ) : (
              <>
                <p className="guess__result-label">{finalAttempts}번 만에 맞혔어요!</p>
                <button type="button" className="guess__retry-button" onClick={resetGame}>
                  다시 도전하기
                </button>
              </>
            )}
          </div>

          <div className="guess__stats">
            <div className="guess__stat">
              <span className="guess__stat-label">시도 횟수</span>
              <span className="guess__stat-value">{attempts}</span>
            </div>
            <div className="guess__stat">
              <span className="guess__stat-label">남은 범위</span>
              <span className="guess__stat-value">
                {(() => {
                  const ups = history.filter((h) => h.hint === 'up').map((h) => h.value)
                  const downs = history.filter((h) => h.hint === 'down').map((h) => h.value)
                  const lo = ups.length ? Math.max(...ups) + 1 : MIN
                  const hi = downs.length ? Math.min(...downs) - 1 : MAX
                  return done ? '-' : `${lo}~${hi}`
                })()}
              </span>
            </div>
          </div>

          {history.length > 0 && (
            <ul className="guess__history">
              {history.map((h, i) => (
                <li key={i} className={`guess__history-item guess__history-item--${h.hint}`}>
                  <span className="guess__history-value">{h.value}</span>
                  <span className="guess__history-hint">{hintLabel[h.hint]}</span>
                </li>
              ))}
            </ul>
          )}

          {done && (
            <SubmitScoreForm
              gameId={GAME_ID}
              score={finalAttempts}
              unit="회"
              order="asc"
              onRequestLogin={openAuthModal}
              onSubmitted={() => setLeaderboardRefreshSignal((n) => n + 1)}
            />
          )}

          <div className="game-actions">
            <LikeButton gameId={GAME_ID} onRequestLogin={openAuthModal} />
            <ShareButton title="숫자 맞추기 — Mini Arcade" text={shareText} />
          </div>
        </div>

        <div className="game-layout__side">
          <Leaderboard
            gameId={GAME_ID}
            order="asc"
            unit="회"
            limit={10}
            refreshSignal={leaderboardRefreshSignal}
          />
        </div>
      </div>
    </GameShell>
  )
}
