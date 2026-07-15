import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GameShell from '../components/common/GameShell.jsx'
import Leaderboard from '../components/common/Leaderboard.jsx'
import SubmitScoreForm from '../components/common/SubmitScoreForm.jsx'
import ShareButton from '../components/common/ShareButton.jsx'
import LikeButton from '../components/common/LikeButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { games } from '../data/games.js'
import usePageTitle from '../hooks/usePageTitle.js'

const GAME_ID = 'memory'
const meta = games.find((g) => g.id === GAME_ID)

// 8쌍(16장). 이모지라 별도 이미지 에셋 없이 바로 렌더링 가능.
const SYMBOLS = ['🍎', '🍌', '🍇', '🍉', '🍒', '🍋', '🥝', '🍑']
const MISMATCH_DELAY_MS = 700

const PHASE = {
  IDLE: 'idle',
  PLAYING: 'playing',
  GAMEOVER: 'gameover',
}

function shuffledDeck() {
  const deck = SYMBOLS.flatMap((symbol, symbolIndex) => [
    { symbol, pairId: symbolIndex },
    { symbol, pairId: symbolIndex },
  ])

  for (let i = deck.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }

  return deck.map((card, i) => ({ ...card, id: i, flipped: false, matched: false }))
}

export default function MemoryGame() {
  usePageTitle(meta.title)
  const { openAuthModal } = useAuth()

  const [phase, setPhase] = useState(PHASE.IDLE)
  const [cards, setCards] = useState([])
  const [moves, setMoves] = useState(0)
  const [wrongPair, setWrongPair] = useState(null) // [idA, idB] - 오답 흔들림 연출용
  const [leaderboardRefreshSignal, setLeaderboardRefreshSignal] = useState(0)

  const flippedRef = useRef([]) // 현재 뒤집혀서 판정 대기 중인 카드 id들
  const busyRef = useRef(false) // 두 장 판정 중엔 추가 클릭 무시
  const mismatchTimeoutRef = useRef(null)

  useEffect(() => () => clearTimeout(mismatchTimeoutRef.current), [])

  const startGame = useCallback(() => {
    clearTimeout(mismatchTimeoutRef.current)
    flippedRef.current = []
    busyRef.current = false
    setCards(shuffledDeck())
    setMoves(0)
    setWrongPair(null)
    setPhase(PHASE.PLAYING)
  }, [])

  const handleCardClick = (id) => {
    if (phase !== PHASE.PLAYING || busyRef.current) return

    const clicked = cards.find((c) => c.id === id)
    if (!clicked || clicked.flipped || clicked.matched) return
    if (flippedRef.current.includes(id)) return

    const nextFlipped = [...flippedRef.current, id]
    flippedRef.current = nextFlipped
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, flipped: true } : c)))

    if (nextFlipped.length < 2) return

    busyRef.current = true
    const [firstId, secondId] = nextFlipped
    setMoves((m) => m + 1)

    const first = cards.find((c) => c.id === firstId)
    const isMatch = first?.pairId === clicked.pairId

    if (isMatch) {
      setCards((prev) =>
        prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, matched: true } : c)),
      )
      flippedRef.current = []
      busyRef.current = false

      setCards((prev) => {
        const allMatched = prev.every((c) => c.matched || c.id === firstId || c.id === secondId)
        if (allMatched) setPhase(PHASE.GAMEOVER)
        return prev
      })
    } else {
      setWrongPair([firstId, secondId])
      mismatchTimeoutRef.current = setTimeout(() => {
        setCards((prev) =>
          prev.map((c) => (c.id === firstId || c.id === secondId ? { ...c, flipped: false } : c)),
        )
        setWrongPair(null)
        flippedRef.current = []
        busyRef.current = false
      }, MISMATCH_DELAY_MS)
    }
  }

  const shareText = useMemo(
    () =>
      phase === PHASE.GAMEOVER
        ? `메모리 카드 매칭 ${moves}번 만에 성공! 너도 도전해봐 🧠`
        : '미니 아케이드 메모리 카드 매칭, 짝을 맞춰봐 🧠',
    [phase, moves],
  )

  return (
    <GameShell tint={meta.tint} wide>
      <div className="game-layout">
        <div className="game-layout__main memory">
          {phase === PHASE.IDLE && (
            <div className="memory__screen memory__screen--idle">
              <p className="memory__idle-title">카드를 뒤집어 같은 그림 짝을 맞혀보세요</p>
              <p className="memory__idle-sub">최소 시도 횟수로 8쌍을 모두 맞히면 클리어예요</p>
              <button type="button" className="memory__start-button" onClick={startGame}>
                시작하기
              </button>
            </div>
          )}

          {phase !== PHASE.IDLE && (
            <>
              <div className="memory__hud">
                <span className="memory__hud-label">시도 횟수</span>
                <span className="memory__hud-value">{moves}</span>
              </div>

              <div className="memory__grid">
                {cards.map((card) => {
                  const isOpen = card.flipped || card.matched
                  const isWrong = wrongPair?.includes(card.id)
                  return (
                    <button
                      key={card.id}
                      type="button"
                      className={`memory__card${isOpen ? ' memory__card--open' : ''}${
                        card.matched ? ' memory__card--matched' : ''
                      }${isWrong ? ' memory__card--wrong' : ''}`}
                      onClick={() => handleCardClick(card.id)}
                      disabled={phase !== PHASE.PLAYING || isOpen}
                      aria-label={isOpen ? card.symbol : '카드'}
                    >
                      <span className="memory__card-inner">
                        <span className="memory__card-face memory__card-face--back" aria-hidden="true" />
                        <span className="memory__card-face memory__card-face--front">{card.symbol}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {phase === PHASE.GAMEOVER && (
            <div className="memory__result">
              <p className="memory__result-label">{moves}번 만에 클리어!</p>
              <button type="button" className="memory__start-button" onClick={startGame}>
                다시 도전하기
              </button>
            </div>
          )}

          {phase === PHASE.GAMEOVER && (
            <SubmitScoreForm
              gameId={GAME_ID}
              score={moves}
              unit="회"
              order="asc"
              onRequestLogin={openAuthModal}
              onSubmitted={() => setLeaderboardRefreshSignal((n) => n + 1)}
            />
          )}

          <div className="game-actions">
            <LikeButton gameId={GAME_ID} onRequestLogin={openAuthModal} />
            <ShareButton title="메모리 카드 매칭 — Mini Arcade" text={shareText} />
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
