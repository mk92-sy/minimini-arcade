import { useCallback, useMemo, useState } from 'react'
import GameShell from '../components/common/GameShell.jsx'
import Leaderboard from '../components/common/Leaderboard.jsx'
import SubmitScoreForm from '../components/common/SubmitScoreForm.jsx'
import ShareButton from '../components/common/ShareButton.jsx'
import LikeButton from '../components/common/LikeButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { games } from '../data/games.js'
import usePageTitle from '../hooks/usePageTitle.js'

const GAME_ID = 'spot'
const meta = games.find((g) => g.id === GAME_ID)

const MAX_GRID_SIZE = 6
const MIN_LIGHTNESS_DIFF = 4
const MIN_DURATION_MS = 1300

/**
 * round(1부터 시작)를 기준으로 그리드 크기 / 정답 타일 위치 / 색상 / 제한시간을 계산합니다.
 * round가 올라갈수록 그리드가 커지고, 정답 타일과 배경의 명도 차이가 줄어들고, 제한시간도 짧아져요.
 */
function buildRound(round) {
  const size = Math.min(3 + Math.floor((round - 1) / 2), MAX_GRID_SIZE)
  const total = size * size
  const oddIndex = Math.floor(Math.random() * total)

  const hue = Math.floor(Math.random() * 360)
  const saturation = 60 + Math.floor(Math.random() * 15)
  const baseLightness = 42 + Math.floor(Math.random() * 10)
  const diff = Math.max(18 - round, MIN_LIGHTNESS_DIFF)

  const baseColor = `hsl(${hue}, ${saturation}%, ${baseLightness}%)`
  const oddColor = `hsl(${hue}, ${saturation}%, ${baseLightness + diff}%)`
  const duration = Math.max(3200 - round * 130, MIN_DURATION_MS)

  return { size, total, oddIndex, baseColor, oddColor, duration }
}

const PHASE = {
  IDLE: 'idle',
  PLAYING: 'playing',
  GAMEOVER: 'gameover',
}

export default function SpotGame() {
  usePageTitle(meta.title)
  const { openAuthModal } = useAuth()

  const [phase, setPhase] = useState(PHASE.IDLE)
  const [round, setRound] = useState(1)
  const [roundData, setRoundData] = useState(null)
  const [finalScore, setFinalScore] = useState(0)
  const [flashWrong, setFlashWrong] = useState(false)
  const [leaderboardRefreshSignal, setLeaderboardRefreshSignal] = useState(0)

  const startGame = useCallback(() => {
    setRound(1)
    setRoundData(buildRound(1))
    setFinalScore(0)
    setFlashWrong(false)
    setPhase(PHASE.PLAYING)
  }, [])

  const endGame = useCallback((clearedRounds) => {
    setFinalScore(clearedRounds)
    setPhase(PHASE.GAMEOVER)
  }, [])

  const handleTileClick = (index) => {
    if (phase !== PHASE.PLAYING || !roundData) return

    if (index === roundData.oddIndex) {
      const nextRound = round + 1
      setRound(nextRound)
      setRoundData(buildRound(nextRound))
    } else {
      setFlashWrong(true)
      endGame(round - 1)
    }
  }

  const handleTimeout = () => {
    if (phase !== PHASE.PLAYING) return
    endGame(round - 1)
  }

  const shareText = useMemo(
    () =>
      phase === PHASE.GAMEOVER
        ? `색깔 구별 게임 ${finalScore}라운드 클리어! 너도 도전해봐 🎨`
        : '미니 아케이드 색깔 구별 게임, 다른 색 타일을 찾아봐 🎨',
    [phase, finalScore],
  )

  return (
    <GameShell tint={meta.tint} wide>
      <div className="game-layout">
        <div className="game-layout__main spot">
          {phase === PHASE.IDLE && (
            <div className="spot__screen spot__screen--idle">
              <p className="spot__idle-title">다른 색 타일 하나를 찾아보세요</p>
              <p className="spot__idle-sub">라운드가 오를수록 타일이 많아지고 색 차이는 작아져요</p>
              <button type="button" className="spot__start-button" onClick={startGame}>
                시작하기
              </button>
            </div>
          )}

          {phase === PHASE.PLAYING && roundData && (
            <div className="spot__screen">
              <div className="spot__hud">
                <span className="spot__round-badge">ROUND {round}</span>
                <div className="spot__timerbar-track">
                  <div
                    key={round}
                    className="spot__timerbar-fill"
                    style={{ animationDuration: `${roundData.duration}ms` }}
                    onAnimationEnd={handleTimeout}
                  />
                </div>
              </div>

              <div
                className="spot__grid"
                style={{ gridTemplateColumns: `repeat(${roundData.size}, 1fr)` }}
              >
                {Array.from({ length: roundData.total }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    className="spot__tile"
                    style={{ backgroundColor: i === roundData.oddIndex ? roundData.oddColor : roundData.baseColor }}
                    onClick={() => handleTileClick(i)}
                    aria-label={`타일 ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {phase === PHASE.GAMEOVER && (
            <div className={`spot__screen spot__screen--gameover${flashWrong ? ' spot__screen--flash' : ''}`}>
              <p className="spot__result-label">{finalScore}라운드 클리어!</p>
              <button type="button" className="spot__start-button" onClick={startGame}>
                다시 도전하기
              </button>
            </div>
          )}

          {phase === PHASE.GAMEOVER && (
            <SubmitScoreForm
              gameId={GAME_ID}
              score={finalScore}
              unit="라운드"
              order="desc"
              onRequestLogin={openAuthModal}
              onSubmitted={() => setLeaderboardRefreshSignal((n) => n + 1)}
            />
          )}

          <div className="game-actions">
            <LikeButton gameId={GAME_ID} onRequestLogin={openAuthModal} />
            <ShareButton title="색깔 구별 게임 — Mini Arcade" text={shareText} />
          </div>
        </div>

        <div className="game-layout__side">
          <Leaderboard
            gameId={GAME_ID}
            order="desc"
            unit="라운드"
            limit={10}
            refreshSignal={leaderboardRefreshSignal}
          />
        </div>
      </div>
    </GameShell>
  )
}
