import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GameShell from '../components/common/GameShell.jsx'
import Leaderboard from '../components/common/Leaderboard.jsx'
import SubmitScoreForm from '../components/common/SubmitScoreForm.jsx'
import ShareButton from '../components/common/ShareButton.jsx'
import LikeButton from '../components/common/LikeButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { games } from '../data/games.js'
import usePageTitle from '../hooks/usePageTitle.js'

const GAME_ID = 'runner'
const meta = games.find((g) => g.id === GAME_ID)

// 논리적 좌표계(px). CSS에서 width:100%, aspect-ratio로 반응형 스케일링됨.
const WORLD_WIDTH = 640
const GROUND_Y = 0
const PLAYER_X = 60
const PLAYER_SIZE = 36
const GRAVITY = 0.85
const JUMP_VELOCITY = -13.5
const COLLIDE_JUMP_THRESHOLD = 34 // 이 높이 이상 뛰면 장애물을 넘길 수 있음
const OBSTACLE_WIDTH = 26
const OBSTACLE_HEIGHT = 40
const BASE_SPEED = 5.4
const MAX_SPEED = 11
const SPEED_RAMP_PER_FRAME = 0.0012
const MIN_SPAWN_GAP = 46 // frame 단위
const MAX_SPAWN_GAP = 92

const PHASE = {
  IDLE: 'idle',
  PLAYING: 'playing',
  GAMEOVER: 'gameover',
}

function randomSpawnGap(speed) {
  // 속도가 빨라질수록 스폰 간격도 살짝 좁혀서 난이도를 유지
  const shrink = Math.min((speed - BASE_SPEED) * 3, 24)
  const min = Math.max(MIN_SPAWN_GAP - shrink, 30)
  const max = Math.max(MAX_SPAWN_GAP - shrink, min + 20)
  return min + Math.random() * (max - min)
}

export default function RunnerGame() {
  usePageTitle(meta.title)
  const { openAuthModal } = useAuth()

  const [phase, setPhase] = useState(PHASE.IDLE)
  const [playerY, setPlayerY] = useState(GROUND_Y)
  const [obstacles, setObstacles] = useState([])
  const [score, setScore] = useState(0)
  const [bestScore, setBestScore] = useState(0)
  const [leaderboardRefreshSignal, setLeaderboardRefreshSignal] = useState(0)

  const rafRef = useRef(null)
  const velocityRef = useRef(0)
  const yRef = useRef(0)
  const speedRef = useRef(BASE_SPEED)
  const spawnTimerRef = useRef(randomSpawnGap(BASE_SPEED))
  const obstaclesRef = useRef([])
  const scoreRef = useRef(0)
  const obstacleIdRef = useRef(0)
  const runningRef = useRef(false)

  const stopLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
  }

  useEffect(() => stopLoop, [])

  const endGame = useCallback(() => {
    runningRef.current = false
    stopLoop()
    setBestScore((prev) => Math.max(prev, Math.floor(scoreRef.current)))
    setScore(Math.floor(scoreRef.current))
    setPhase(PHASE.GAMEOVER)
  }, [])

  const tick = useCallback(() => {
    if (!runningRef.current) return

    // 물리: 점프 중력 적용
    velocityRef.current += GRAVITY
    yRef.current = Math.max(yRef.current - velocityRef.current, GROUND_Y)
    if (yRef.current <= GROUND_Y) {
      yRef.current = GROUND_Y
      velocityRef.current = 0
    }

    // 난이도: 속도 서서히 증가
    speedRef.current = Math.min(speedRef.current + SPEED_RAMP_PER_FRAME, MAX_SPEED)

    // 장애물 이동 + 스폰
    spawnTimerRef.current -= 1
    let nextObstacles = obstaclesRef.current
      .map((o) => ({ ...o, x: o.x - speedRef.current }))
      .filter((o) => o.x + OBSTACLE_WIDTH > -10)

    if (spawnTimerRef.current <= 0) {
      obstacleIdRef.current += 1
      nextObstacles = [...nextObstacles, { id: obstacleIdRef.current, x: WORLD_WIDTH + 10 }]
      spawnTimerRef.current = randomSpawnGap(speedRef.current)
    }
    obstaclesRef.current = nextObstacles

    // 충돌 판정
    const playerLeft = PLAYER_X
    const playerRight = PLAYER_X + PLAYER_SIZE
    const collided = nextObstacles.some((o) => {
      const overlapX = o.x < playerRight && o.x + OBSTACLE_WIDTH > playerLeft
      if (!overlapX) return false
      return yRef.current < COLLIDE_JUMP_THRESHOLD
    })

    scoreRef.current += speedRef.current * 0.08

    if (collided) {
      setPlayerY(yRef.current)
      setObstacles(nextObstacles)
      endGame()
      return
    }

    setPlayerY(yRef.current)
    setObstacles(nextObstacles)
    setScore(Math.floor(scoreRef.current))

    rafRef.current = requestAnimationFrame(tick)
  }, [endGame])

  const startGame = useCallback(() => {
    stopLoop()
    velocityRef.current = 0
    yRef.current = GROUND_Y
    speedRef.current = BASE_SPEED
    spawnTimerRef.current = randomSpawnGap(BASE_SPEED)
    obstaclesRef.current = []
    scoreRef.current = 0
    runningRef.current = true

    setPlayerY(GROUND_Y)
    setObstacles([])
    setScore(0)
    setPhase(PHASE.PLAYING)

    rafRef.current = requestAnimationFrame(tick)
  }, [tick])

  const jump = useCallback(() => {
    if (phase !== PHASE.PLAYING) return
    if (yRef.current > GROUND_Y) return // 이미 공중에 있으면 무시 (더블 점프 방지)
    velocityRef.current = JUMP_VELOCITY
  }, [phase])

  const handleScreenAction = () => {
    if (phase === PHASE.IDLE || phase === PHASE.GAMEOVER) {
      startGame()
      return
    }
    jump()
  }

  useEffect(() => {
    const handleKeyDown = (e) => {
      const isSpace = e.code === 'Space' || e.key === ' ' || e.key === 'Spacebar'
      const isUp = e.code === 'ArrowUp' || e.key === 'ArrowUp'
      if (!isSpace && !isUp) return
      e.preventDefault()
      if (e.repeat) return // 키를 누르고 있어도 한 번만 반응
      if (phase === PHASE.IDLE || phase === PHASE.GAMEOVER) {
        startGame()
      } else {
        jump()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [phase, startGame, jump])

  const shareText = useMemo(
    () =>
      phase === PHASE.GAMEOVER
        ? `엔들리스 러너 ${score}점 기록! 너도 도전해봐 🏃`
        : '미니 아케이드 엔들리스 러너, 스페이스바로 장애물을 넘어봐 🏃',
    [phase, score],
  )

  return (
    <GameShell tint={meta.tint} wide>
      <div className="game-layout">
        <div className="game-layout__main runner">
          <div className="runner__hud">
            <div className="runner__hud-stat">
              <span className="runner__hud-label">점수</span>
              <span className="runner__hud-value">{score}</span>
            </div>
            <div className="runner__hud-stat">
              <span className="runner__hud-label">최고 기록</span>
              <span className="runner__hud-value">{bestScore}</span>
            </div>
          </div>

          <div
            className="runner__screen"
            onClick={handleScreenAction}
            role="button"
            tabIndex={0}
            aria-label="점프 또는 시작"
          >
            <div className="runner__sky" aria-hidden="true" />
            <div className="runner__ground" aria-hidden="true" />

            {phase !== PHASE.IDLE &&
              obstacles.map((o) => (
                <div
                  key={o.id}
                  className="runner__obstacle"
                  style={{ left: `${(o.x / WORLD_WIDTH) * 100}%` }}
                  aria-hidden="true"
                />
              ))}

            <div
              className={`runner__player${phase === PHASE.PLAYING && playerY === GROUND_Y ? ' runner__player--running' : ''}`}
              style={{
                left: `${(PLAYER_X / WORLD_WIDTH) * 100}%`,
                transform: `translateY(${-playerY}px)`,
              }}
              aria-hidden="true"
            >
              <span className="runner__player-eye" />
              <span className="runner__player-leg runner__player-leg--front" />
              <span className="runner__player-leg runner__player-leg--back" />
            </div>

            {phase === PHASE.IDLE && (
              <div className="runner__overlay">
                <p className="runner__overlay-text">클릭 또는 스페이스바로 시작</p>
                <p className="runner__overlay-sub">스페이스바 / 클릭으로 점프해서 장애물을 넘어보세요</p>
              </div>
            )}

            {phase === PHASE.GAMEOVER && (
              <div className="runner__overlay">
                <p className="runner__overlay-text">게임 오버 · {score}점</p>
                <p className="runner__overlay-sub">클릭 또는 스페이스바로 재도전</p>
              </div>
            )}
          </div>

          <p className="runner__hint">스페이스바 / 화살표 위 / 클릭으로 점프</p>

          {phase === PHASE.GAMEOVER && (
            <SubmitScoreForm
              gameId={GAME_ID}
              score={score}
              unit="점"
              order="desc"
              onRequestLogin={openAuthModal}
              onSubmitted={() => setLeaderboardRefreshSignal((n) => n + 1)}
            />
          )}

          <div className="game-actions">
            <LikeButton gameId={GAME_ID} onRequestLogin={openAuthModal} />
            <ShareButton title="엔들리스 러너 — Mini Arcade" text={shareText} />
          </div>
        </div>

        <div className="game-layout__side">
          <Leaderboard
            gameId={GAME_ID}
            order="desc"
            unit="점"
            limit={10}
            refreshSignal={leaderboardRefreshSignal}
          />
        </div>
      </div>
    </GameShell>
  )
}
