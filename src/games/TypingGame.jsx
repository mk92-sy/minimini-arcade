import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GameShell from '../components/common/GameShell.jsx'
import Leaderboard from '../components/common/Leaderboard.jsx'
import SubmitScoreForm from '../components/common/SubmitScoreForm.jsx'
import ShareButton from '../components/common/ShareButton.jsx'
import LikeButton from '../components/common/LikeButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { games } from '../data/games.js'
import usePageTitle from '../hooks/usePageTitle.js'

const GAME_ID = 'typing'
const meta = games.find((g) => g.id === GAME_ID)

const GAME_DURATION_MS = 30000
const WRONG_FLASH_MS = 260

const WORD_POOL = [
  '사과', '바나나', '컴퓨터', '자동차', '커피', '하늘', '바다', '나무',
  '고양이', '강아지', '피아노', '기타', '축구', '농구', '여행', '음악',
  '영화', '책상', '의자', '창문', '거울', '시계', '우산', '자전거',
  '기차', '비행기', '눈사람', '불꽃놀이', '무지개', '별빛', '달빛', '노을',
  '수박', '딸기', '초콜릿', '아이스크림', '피자', '라면', '김치', '떡볶이',
]

const PHASE = {
  IDLE: 'idle',
  PLAYING: 'playing',
  GAMEOVER: 'gameover',
}

function pickNextWord(excludeWord) {
  if (WORD_POOL.length <= 1) return WORD_POOL[0]
  let word = excludeWord
  while (word === excludeWord) {
    word = WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)]
  }
  return word
}

export default function TypingGame() {
  usePageTitle(meta.title)
  const { openAuthModal } = useAuth()

  const [phase, setPhase] = useState(PHASE.IDLE)
  const [currentWord, setCurrentWord] = useState('')
  const [input, setInput] = useState('')
  const [score, setScore] = useState(0)
  const [wordKey, setWordKey] = useState(0) // 단어 등장 애니메이션 재생용
  const [wrongFlash, setWrongFlash] = useState(false)
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION_MS)
  const [leaderboardRefreshSignal, setLeaderboardRefreshSignal] = useState(0)

  const timeLeftRef = useRef(GAME_DURATION_MS)
  const countdownRef = useRef(null)
  const wrongTimeoutRef = useRef(null)
  const inputRef = useRef(null)

  const clearTimers = () => {
    clearInterval(countdownRef.current)
    clearTimeout(wrongTimeoutRef.current)
  }

  useEffect(() => clearTimers, [])

  const endGame = useCallback(() => {
    clearTimers()
    setPhase(PHASE.GAMEOVER)
  }, [])

  const startGame = useCallback(() => {
    clearTimers()
    timeLeftRef.current = GAME_DURATION_MS
    setTimeLeft(GAME_DURATION_MS)
    setScore(0)
    setInput('')
    setWrongFlash(false)
    setCurrentWord(pickNextWord(null))
    setWordKey((k) => k + 1)
    setPhase(PHASE.PLAYING)

    countdownRef.current = setInterval(() => {
      timeLeftRef.current = Math.max(timeLeftRef.current - 100, 0)
      setTimeLeft(timeLeftRef.current)
      if (timeLeftRef.current <= 0) {
        endGame()
      }
    }, 100)

    // 다음 렌더 이후 인풋에 포커스
    setTimeout(() => inputRef.current?.focus(), 0)
  }, [endGame])

  const handleChange = (e) => {
    if (phase !== PHASE.PLAYING) return
    const value = e.target.value
    setInput(value)

    if (value === currentWord) {
      setScore((s) => s + 1)
      setInput('')
      setCurrentWord((prev) => pickNextWord(prev))
      setWordKey((k) => k + 1)
      return
    }

    // 정답 길이에 도달했는데 틀렸으면 살짝 흔들어서 피드백
    if (value.length >= currentWord.length && value !== currentWord) {
      setWrongFlash(true)
      clearTimeout(wrongTimeoutRef.current)
      wrongTimeoutRef.current = setTimeout(() => setWrongFlash(false), WRONG_FLASH_MS)
    }
  }

  const timeLeftSeconds = Math.ceil(timeLeft / 1000)
  const timerPercent = Math.max((timeLeft / GAME_DURATION_MS) * 100, 0)

  const shareText = useMemo(
    () =>
      phase === PHASE.GAMEOVER
        ? `타이핑 스피드 ${score}단어 성공! 너도 도전해봐 ⌨️`
        : '미니 아케이드 타이핑 스피드, 제한시간 안에 최대한 많이 입력해봐 ⌨️',
    [phase, score],
  )

  return (
    <GameShell tint={meta.tint} wide>
      <div className="game-layout">
        <div className="game-layout__main typing">
          {phase === PHASE.IDLE && (
            <div className="typing__screen typing__screen--idle">
              <p className="typing__idle-title">30초 동안 최대한 많은 단어를 입력해보세요</p>
              <p className="typing__idle-sub">화면에 뜬 단어와 똑같이 입력하면 자동으로 다음 단어로 넘어가요</p>
              <button type="button" className="typing__start-button" onClick={startGame}>
                시작하기
              </button>
            </div>
          )}

          {phase !== PHASE.IDLE && (
            <div className="typing__screen">
              <div className="typing__hud">
                <div className="typing__hud-stat">
                  <span className="typing__hud-label">단어 수</span>
                  <span className="typing__hud-value">{score}</span>
                </div>
                <div className="typing__timerbar-track">
                  <div className="typing__timerbar-fill" style={{ width: `${timerPercent}%` }} />
                </div>
                <span className="typing__hud-time">{timeLeftSeconds}s</span>
              </div>

              {phase === PHASE.PLAYING && (
                <>
                  <p key={wordKey} className="typing__word">
                    {currentWord}
                  </p>
                  <input
                    ref={inputRef}
                    type="text"
                    className={`typing__input${wrongFlash ? ' typing__input--wrong' : ''}`}
                    value={input}
                    onChange={handleChange}
                    placeholder="여기에 입력하세요"
                    autoComplete="off"
                    autoFocus
                  />
                </>
              )}

              {phase === PHASE.GAMEOVER && (
                <div className="typing__result">
                  <p className="typing__result-label">{score}단어 성공!</p>
                  <button type="button" className="typing__start-button" onClick={startGame}>
                    다시 도전하기
                  </button>
                </div>
              )}
            </div>
          )}

          {phase === PHASE.GAMEOVER && (
            <SubmitScoreForm
              gameId={GAME_ID}
              score={score}
              unit="단어"
              order="desc"
              onRequestLogin={openAuthModal}
              onSubmitted={() => setLeaderboardRefreshSignal((n) => n + 1)}
            />
          )}

          <div className="game-actions">
            <LikeButton gameId={GAME_ID} onRequestLogin={openAuthModal} />
            <ShareButton title="타이핑 스피드 — Mini Arcade" text={shareText} />
          </div>
        </div>

        <div className="game-layout__side">
          <Leaderboard
            gameId={GAME_ID}
            order="desc"
            unit="단어"
            limit={10}
            refreshSignal={leaderboardRefreshSignal}
          />
        </div>
      </div>
    </GameShell>
  )
}
