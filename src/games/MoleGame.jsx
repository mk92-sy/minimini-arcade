import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GameShell from '../components/common/GameShell.jsx'
import Leaderboard from '../components/common/Leaderboard.jsx'
import SubmitScoreForm from '../components/common/SubmitScoreForm.jsx'
import ShareButton from '../components/common/ShareButton.jsx'
import LikeButton from '../components/common/LikeButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { games } from '../data/games.js'
import usePageTitle from '../hooks/usePageTitle.js'

const GAME_ID = 'mole'
const meta = games.find((g) => g.id === GAME_ID)

const HOLE_COUNT = 9
const GAME_DURATION_MS = 30000
const MIN_SPAWN_GAP_MS = 200
const MAX_SPAWN_GAP_MS = 550
const QUICK_RESPAWN_GAP_MS = 150
const MAX_SHOW_DURATION_MS = 1150
const MIN_SHOW_DURATION_MS = 550

const PHASE = {
  IDLE: 'idle',
  PLAYING: 'playing',
  GAMEOVER: 'gameover',
}

export default function MoleGame() {
  usePageTitle(meta.title)
  const { openAuthModal } = useAuth()

  const [phase, setPhase] = useState(PHASE.IDLE)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_MS)
  const [activeMole, setActiveMole] = useState(null) // { index, id }
  const [hitFx, setHitFx] = useState(null) // { index, id }
  const [leaderboardRefreshSignal, setLeaderboardRefreshSignal] = useState(0)

  const gameOverRef = useRef(true)
  const timeLeftRef = useRef(GAME_DURATION_MS)
  const spawnTimeoutRef = useRef(null)
  const hideTimeoutRef = useRef(null)
  const countdownRef = useRef(null)
  const moleIdRef = useRef(0)
  const lastHoleRef = useRef(null)

  const clearAllTimers = () => {
    clearTimeout(spawnTimeoutRef.current)
    clearTimeout(hideTimeoutRef.current)
    clearInterval(countdownRef.current)
  }

  const scheduleNextMole = useCallback((customGapMs) => {
    if (gameOverRef.current) return
    const gap = customGapMs ?? MIN_SPAWN_GAP_MS + Math.random() * (MAX_SPAWN_GAP_MS - MIN_SPAWN_GAP_MS)

    spawnTimeoutRef.current = setTimeout(() => {
      if (gameOverRef.current) return

      let index
      do {
        index = Math.floor(Math.random() * HOLE_COUNT)
      } while (index === lastHoleRef.current && HOLE_COUNT > 1)
      lastHoleRef.current = index

      const elapsedRatio = 1 - timeLeftRef.current / GAME_DURATION_MS
      const showDuration = Math.max(
        MAX_SHOW_DURATION_MS - elapsedRatio * (MAX_SHOW_DURATION_MS - MIN_SHOW_DURATION_MS),
        MIN_SHOW_DURATION_MS,
      )
      const id = (moleIdRef.current += 1)
      setActiveMole({ index, id })

      hideTimeoutRef.current = setTimeout(() => {
        setActiveMole((current) => (current && current.id === id ? null : current))
        scheduleNextMole()
      }, showDuration)
    }, gap)
  }, [])

  const endGame = useCallback(() => {
    gameOverRef.current = true
    clearAllTimers()
    setActiveMole(null)
    setPhase(PHASE.GAMEOVER)
  }, [])

  const startGame = useCallback(() => {
    clearAllTimers()
    gameOverRef.current = false
    timeLeftRef.current = GAME_DURATION_MS
    lastHoleRef.current = null
    setScore(0)
    setTimeLeft(GAME_DURATION_MS)
    setActiveMole(null)
    setHitFx(null)
    setPhase(PHASE.PLAYING)

    scheduleNextMole(300)

    countdownRef.current = setInterval(() => {
      timeLeftRef.current = Math.max(timeLeftRef.current - 100, 0)
      setTimeLeft(timeLeftRef.current)
      if (timeLeftRef.current <= 0) {
        endGame()
      }
    }, 100)
  }, [endGame, scheduleNextMole])

  useEffect(() => clearAllTimers, [])

  const handleHoleClick = (index) => {
    if (phase !== PHASE.PLAYING) return
    if (!activeMole || activeMole.index !== index) return

    clearTimeout(hideTimeoutRef.current)
    setScore((s) => s + 1)
    setHitFx({ index, id: activeMole.id })
    setActiveMole(null)
    scheduleNextMole(QUICK_RESPAWN_GAP_MS)
  }

  const timeLeftSeconds = Math.ceil(timeLeft / 1000)
  const timerPercent = Math.max((timeLeft / GAME_DURATION_MS) * 100, 0)

  const shareText = useMemo(
    () =>
      phase === PHASE.GAMEOVER
        ? `두더지 잡기 ${score}마리 잡았어! 너도 도전해봐 🔨`
        : '미니 아케이드 두더지 잡기, 튀어나오는 순간을 노려봐 🔨',
    [phase, score],
  )

  return (
    <GameShell tint={meta.tint} wide>
      <div className="game-layout">
        <div className="game-layout__main mole-game">
          {phase === PHASE.IDLE && (
            <div className="mole-game__screen mole-game__screen--idle">
              <p className="mole-game__idle-title">30초 동안 최대한 많은 두더지를 잡아보세요</p>
              <p className="mole-game__idle-sub">시간이 지날수록 두더지가 더 빨리 사라져요</p>
              <button type="button" className="mole-game__start-button" onClick={startGame}>
                시작하기
              </button>
            </div>
          )}

          {phase !== PHASE.IDLE && (
            <>
              <div className="mole-game__hud">
                <div className="mole-game__hud-stat">
                  <span className="mole-game__hud-label">잡은 두더지</span>
                  <span className="mole-game__hud-value">{score}</span>
                </div>
                <div className="mole-game__timerbar-track">
                  <div className="mole-game__timerbar-fill" style={{ width: `${timerPercent}%` }} />
                </div>
                <span className="mole-game__hud-time">{timeLeftSeconds}s</span>
              </div>

              <div className="mole-game__grid">
                {Array.from({ length: HOLE_COUNT }).map((_, i) => {
                  const isUp = activeMole?.index === i
                  const showHit = hitFx?.index === i
                  return (
                    <button
                      key={i}
                      type="button"
                      className="mole-game__hole"
                      onClick={() => handleHoleClick(i)}
                      aria-label={`구멍 ${i + 1}`}
                      disabled={phase !== PHASE.PLAYING}
                    >
                      <span className="mole-game__mound" aria-hidden="true" />
                      <span
                        className={`mole-game__critter${isUp ? ' mole-game__critter--up' : ''}`}
                        aria-hidden="true"
                      >
                        <span className="mole-game__ear mole-game__ear--left" />
                        <span className="mole-game__ear mole-game__ear--right" />
                        <span className="mole-game__face">
                          <span className="mole-game__eye mole-game__eye--left" />
                          <span className="mole-game__eye mole-game__eye--right" />
                          <span className="mole-game__nose" />
                        </span>
                      </span>
                      {showHit && (
                        <span
                          key={hitFx.id}
                          className="mole-game__hit-fx"
                          aria-hidden="true"
                          onAnimationEnd={() => setHitFx(null)}
                        >
                          +1
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {phase === PHASE.GAMEOVER && (
            <div className="mole-game__result">
              <p className="mole-game__result-label">{score}마리 잡았어요!</p>
              <button type="button" className="mole-game__start-button" onClick={startGame}>
                다시 도전하기
              </button>
            </div>
          )}

          {phase === PHASE.GAMEOVER && (
            <SubmitScoreForm
              gameId={GAME_ID}
              score={score}
              unit="마리"
              order="desc"
              onRequestLogin={openAuthModal}
              onSubmitted={() => setLeaderboardRefreshSignal((n) => n + 1)}
            />
          )}

          <div className="game-actions">
            <LikeButton gameId={GAME_ID} onRequestLogin={openAuthModal} />
            <ShareButton title="두더지 잡기 — Mini Arcade" text={shareText} />
          </div>
        </div>

        <div className="game-layout__side">
          <Leaderboard
            gameId={GAME_ID}
            order="desc"
            unit="마리"
            limit={10}
            refreshSignal={leaderboardRefreshSignal}
          />
        </div>
      </div>
    </GameShell>
  )
}
