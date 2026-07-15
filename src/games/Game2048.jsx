import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GameShell from '../components/common/GameShell.jsx'
import Leaderboard from '../components/common/Leaderboard.jsx'
import SubmitScoreForm from '../components/common/SubmitScoreForm.jsx'
import ShareButton from '../components/common/ShareButton.jsx'
import LikeButton from '../components/common/LikeButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { games } from '../data/games.js'
import usePageTitle from '../hooks/usePageTitle.js'

const GAME_ID = '2048'
const meta = games.find((g) => g.id === GAME_ID)

const SIZE = 4
const SWIPE_THRESHOLD = 24

const TILE_COLORS = {
  2: '#eee4da',
  4: '#ede0c8',
  8: '#f2b179',
  16: '#f59563',
  32: '#f67c5f',
  64: '#f65e3b',
  128: '#edcf72',
  256: '#edcc61',
  512: '#edc850',
  1024: '#edc53f',
  2048: '#edc22e',
}
const TILE_COLOR_FALLBACK = '#3c3a5e'
const DARK_TEXT_MAX = 4

function emptyBoard() {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

function emptyCells(board) {
  const cells = []
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] === 0) cells.push([r, c])
    }
  }
  return cells
}

function addRandomTile(board) {
  const cells = emptyCells(board)
  if (cells.length === 0) return board
  const [r, c] = cells[Math.floor(Math.random() * cells.length)]
  const next = board.map((row) => [...row])
  next[r][c] = Math.random() < 0.9 ? 2 : 4
  return next
}

function slideRow(row) {
  const filtered = row.filter((v) => v !== 0)
  const merged = []
  let scoreGained = 0
  let i = 0
  while (i < filtered.length) {
    if (i + 1 < filtered.length && filtered[i] === filtered[i + 1]) {
      const value = filtered[i] * 2
      merged.push(value)
      scoreGained += value
      i += 2
    } else {
      merged.push(filtered[i])
      i += 1
    }
  }
  while (merged.length < row.length) merged.push(0)
  return { row: merged, scoreGained }
}

function moveLeft(board) {
  let moved = false
  let scoreGained = 0
  const nextBoard = board.map((row) => {
    const { row: newRow, scoreGained: gained } = slideRow(row)
    scoreGained += gained
    if (!moved && newRow.some((v, i) => v !== row[i])) moved = true
    return newRow
  })
  return { board: nextBoard, moved, scoreGained }
}

function reverseRows(board) {
  return board.map((row) => [...row].reverse())
}

function transpose(board) {
  return board[0].map((_, c) => board.map((row) => row[c]))
}

function moveRight(board) {
  const result = moveLeft(reverseRows(board))
  return { ...result, board: reverseRows(result.board) }
}

function moveUp(board) {
  const result = moveLeft(transpose(board))
  return { ...result, board: transpose(result.board) }
}

function moveDown(board) {
  const result = moveLeft(reverseRows(transpose(board)))
  return { ...result, board: transpose(reverseRows(result.board)) }
}

const MOVE_FNS = { left: moveLeft, right: moveRight, up: moveUp, down: moveDown }
const KEY_TO_DIRECTION = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

function canMove(board) {
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (board[r][c] === 0) return true
      if (c < SIZE - 1 && board[r][c] === board[r][c + 1]) return true
      if (r < SIZE - 1 && board[r][c] === board[r + 1][c]) return true
    }
  }
  return false
}

function highestTile(board) {
  return board.reduce((max, row) => Math.max(max, ...row), 0)
}

function startingBoard() {
  return addRandomTile(addRandomTile(emptyBoard()))
}

export default function Game2048() {
  usePageTitle(meta.title)
  const { openAuthModal } = useAuth()

  const [board, setBoard] = useState(startingBoard)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [leaderboardRefreshSignal, setLeaderboardRefreshSignal] = useState(0)

  const touchStartRef = useRef(null)

  const handleMove = useCallback(
    (direction) => {
      if (gameOver) return
      const moveFn = MOVE_FNS[direction]
      const { board: movedBoard, moved, scoreGained } = moveFn(board)
      if (!moved) return

      const withNewTile = addRandomTile(movedBoard)
      setBoard(withNewTile)
      setScore((prev) => prev + scoreGained)

      if (!canMove(withNewTile)) {
        setGameOver(true)
      }
    },
    [board, gameOver],
  )

  useEffect(() => {
    const handleKeyDown = (e) => {
      const direction = KEY_TO_DIRECTION[e.key]
      if (!direction) return
      e.preventDefault()
      handleMove(direction)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleMove])

  const handleTouchStart = (e) => {
    const t = e.touches[0]
    touchStartRef.current = { x: t.clientX, y: t.clientY }
  }

  const handleTouchEnd = (e) => {
    const start = touchStartRef.current
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    touchStartRef.current = null

    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return

    if (Math.abs(dx) > Math.abs(dy)) {
      handleMove(dx > 0 ? 'right' : 'left')
    } else {
      handleMove(dy > 0 ? 'down' : 'up')
    }
  }

  const restart = () => {
    setBoard(startingBoard())
    setScore(0)
    setGameOver(false)
  }

  const best = useMemo(() => highestTile(board), [board])

  const shareText = gameOver
    ? `2048 게임 ${score}점, 최고 타일 ${best}! 너도 도전해봐 🧩`
    : '미니 아케이드 2048 퍼즐, 같은 숫자를 합쳐 2048까지 만들어봐 🧩'

  return (
    <GameShell tint={meta.tint} wide>
      <div className="game-layout">
        <div className="game-layout__main game2048">
          <div className="game2048__stats">
            <div className="game2048__stat">
              <span className="game2048__stat-label">점수</span>
              <span className="game2048__stat-value">{score}</span>
            </div>
            <div className="game2048__stat">
              <span className="game2048__stat-label">최고 타일</span>
              <span className="game2048__stat-value">{best}</span>
            </div>
          </div>

          <div
            className="game2048__board"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            {board.map((row, r) =>
              row.map((value, c) => (
                <div
                  key={`${r}-${c}`}
                  className="game2048__cell"
                  style={
                    value
                      ? {
                          backgroundColor: TILE_COLORS[value] ?? TILE_COLOR_FALLBACK,
                          color: value <= DARK_TEXT_MAX ? '#5c5240' : '#faf8f5',
                        }
                      : undefined
                  }
                >
                  {value !== 0 && value}
                </div>
              )),
            )}

            {gameOver && (
              <div className="game2048__overlay">
                <p className="game2048__overlay-text">게임 오버</p>
                <button type="button" className="game2048__restart-button" onClick={restart}>
                  다시 시작
                </button>
              </div>
            )}
          </div>

          <div className="game2048__controls" aria-hidden="true">
            <button type="button" className="game2048__pad-button game2048__pad-button--up" onClick={() => handleMove('up')}>
              ▲
            </button>
            <button type="button" className="game2048__pad-button game2048__pad-button--left" onClick={() => handleMove('left')}>
              ◀
            </button>
            <button type="button" className="game2048__pad-button game2048__pad-button--down" onClick={() => handleMove('down')}>
              ▼
            </button>
            <button type="button" className="game2048__pad-button game2048__pad-button--right" onClick={() => handleMove('right')}>
              ▶
            </button>
          </div>
          <p className="game2048__hint">방향키 또는 스와이프로 타일을 밀어보세요</p>

          {!gameOver && (
            <button type="button" className="game2048__restart-link" onClick={restart}>
              새 게임 시작
            </button>
          )}

          {gameOver && (
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
            <ShareButton title="2048 퍼즐 — Mini Arcade" text={shareText} />
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
