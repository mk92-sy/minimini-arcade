import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import GameShell from '../components/common/GameShell.jsx'
import Leaderboard from '../components/common/Leaderboard.jsx'
import SubmitScoreForm from '../components/common/SubmitScoreForm.jsx'
import ShareButton from '../components/common/ShareButton.jsx'
import LikeButton from '../components/common/LikeButton.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { fetchInventory, useConsumable } from '../lib/store.js'
import { games } from '../data/games.js'
import usePageTitle from '../hooks/usePageTitle.js'

const UNDO_TOKEN_ITEM_ID = 'undo_token'

const GAME_ID = '2048'
const meta = games.find((g) => g.id === GAME_ID)

const SIZE = 4
const SWIPE_THRESHOLD = 24

// 타일을 절대 위치(퍼센트)로 배치해서 left/top 트랜지션으로 슬라이드 애니메이션을 만듭니다.
// GAP_PCT는 보드 폭 기준 % 값이라 반응형으로 리사이즈돼도 셀 정렬이 항상 맞습니다.
const GAP_PCT = 2.5
const CELL_PCT = (100 - (SIZE + 1) * GAP_PCT) / SIZE

function cellStyle(row, col) {
  return {
    left: `${GAP_PCT + col * (CELL_PCT + GAP_PCT)}%`,
    top: `${GAP_PCT + row * (CELL_PCT + GAP_PCT)}%`,
    width: `${CELL_PCT}%`,
    height: `${CELL_PCT}%`,
  }
}

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

// ── 타일은 { id, value, row, col } 형태로 관리합니다. id가 이동/병합 내내 유지되기 때문에
// React가 같은 DOM 엘리먼트를 재사용하고, CSS가 left/top 변화를 자연스럽게 트랜지션으로 보여줍니다.

function randomEmptyPosition(tiles) {
  const occupied = new Set(tiles.map((t) => `${t.row}-${t.col}`))
  const empties = []
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      if (!occupied.has(`${r}-${c}`)) empties.push([r, c])
    }
  }
  if (empties.length === 0) return null
  return empties[Math.floor(Math.random() * empties.length)]
}

function spawnTile(tiles, getNextId) {
  const pos = randomEmptyPosition(tiles)
  if (!pos) return tiles
  const [row, col] = pos
  const value = Math.random() < 0.9 ? 2 : 4
  return [...tiles, { id: getNextId(), value, row, col, isNew: true, justMerged: false }]
}

function slideLine(lineTiles) {
  const result = []
  let scoreGained = 0
  let i = 0
  while (i < lineTiles.length) {
    const current = lineTiles[i]
    const next = lineTiles[i + 1]
    if (next && next.value === current.value) {
      const value = current.value * 2
      result.push({ id: current.id, value, justMerged: true })
      scoreGained += value
      i += 2
    } else {
      result.push({ id: current.id, value: current.value, justMerged: false })
      i += 1
    }
  }
  return { tiles: result, scoreGained }
}

function move(tiles, direction) {
  let moved = false
  let scoreGained = 0
  const newTiles = []

  for (let lineIndex = 0; lineIndex < SIZE; lineIndex += 1) {
    let lineTiles
    if (direction === 'left' || direction === 'right') {
      lineTiles = tiles
        .filter((t) => t.row === lineIndex)
        .sort((a, b) => (direction === 'left' ? a.col - b.col : b.col - a.col))
    } else {
      lineTiles = tiles
        .filter((t) => t.col === lineIndex)
        .sort((a, b) => (direction === 'up' ? a.row - b.row : b.row - a.row))
    }

    const { tiles: slid, scoreGained: gained } = slideLine(lineTiles)
    scoreGained += gained

    slid.forEach((t, posIndex) => {
      let row
      let col
      if (direction === 'left') {
        row = lineIndex
        col = posIndex
      } else if (direction === 'right') {
        row = lineIndex
        col = SIZE - 1 - posIndex
      } else if (direction === 'up') {
        col = lineIndex
        row = posIndex
      } else {
        col = lineIndex
        row = SIZE - 1 - posIndex
      }

      const original = tiles.find((o) => o.id === t.id)
      if (original.row !== row || original.col !== col || t.justMerged) moved = true

      newTiles.push({ id: t.id, value: t.value, row, col, isNew: false, justMerged: t.justMerged })
    })
  }

  return { tiles: newTiles, moved, scoreGained }
}

const MOVE_DIRECTIONS = ['left', 'right', 'up', 'down']
const KEY_TO_DIRECTION = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'up',
  ArrowDown: 'down',
}

function canMove(tiles) {
  if (tiles.length < SIZE * SIZE) return true
  const grid = {}
  tiles.forEach((t) => {
    grid[`${t.row}-${t.col}`] = t.value
  })
  for (let r = 0; r < SIZE; r += 1) {
    for (let c = 0; c < SIZE; c += 1) {
      const v = grid[`${r}-${c}`]
      if (c < SIZE - 1 && v === grid[`${r}-${c + 1}`]) return true
      if (r < SIZE - 1 && v === grid[`${r + 1}-${c}`]) return true
    }
  }
  return false
}

function highestTile(tiles) {
  return tiles.reduce((max, t) => Math.max(max, t.value), 0)
}

export default function Game2048() {
  usePageTitle(meta.title)
  const { user, openAuthModal } = useAuth()

  const tileIdRef = useRef(1)
  const getNextId = () => (tileIdRef.current += 1)

  const buildStartingTiles = () => {
    tileIdRef.current = 1
    let tiles = []
    tiles = spawnTile(tiles, getNextId)
    tiles = spawnTile(tiles, getNextId)
    return tiles
  }

  const [tiles, setTiles] = useState(buildStartingTiles)
  const [score, setScore] = useState(0)
  const [gameOver, setGameOver] = useState(false)
  const [leaderboardRefreshSignal, setLeaderboardRefreshSignal] = useState(0)

  // "되돌리기 1회" 아이템(undo_token) 연동. 직전 한 수만 되돌릴 수 있게 마지막
  // 이동 직전 상태 하나만 들고 있어요(스택이 아님) — 아이템 설명("마지막 이동을
  // 한 번 취소")과 맞춰서 딱 한 단계만 되돌립니다.
  const [undoTokenQty, setUndoTokenQty] = useState(0)
  const [prevMoveState, setPrevMoveState] = useState(null) // { tiles, score } | null
  const [undoStatus, setUndoStatus] = useState('idle') // idle | busy

  useEffect(() => {
    if (!user) {
      setUndoTokenQty(0)
      return undefined
    }
    let cancelled = false
    fetchInventory(user.id).then((inventory) => {
      if (!cancelled) setUndoTokenQty(inventory[UNDO_TOKEN_ITEM_ID] ?? 0)
    })
    return () => {
      cancelled = true
    }
  }, [user])

  const touchStartRef = useRef(null)

  const handleMove = useCallback(
    (direction) => {
      if (gameOver || !MOVE_DIRECTIONS.includes(direction)) return
      const { tiles: movedTiles, moved, scoreGained } = move(tiles, direction)
      if (!moved) return

      // 되돌리기용으로 "이동을 적용하기 직전" 상태를 저장 (한 단계만 기억)
      setPrevMoveState({ tiles, score })

      const withNewTile = spawnTile(movedTiles, getNextId)
      setTiles(withNewTile)
      setScore((prev) => prev + scoreGained)

      if (!canMove(withNewTile)) {
        setGameOver(true)
      }
    },
    [tiles, score, gameOver],
  )

  const handleUndo = async () => {
    if (undoStatus === 'busy' || !prevMoveState || undoTokenQty <= 0) return
    setUndoStatus('busy')

    const { data, error } = await useConsumable(UNDO_TOKEN_ITEM_ID)

    setUndoStatus('idle')
    if (error) return

    setUndoTokenQty(data.remaining_quantity)
    setTiles(prevMoveState.tiles)
    setScore(prevMoveState.score)
    setGameOver(false)
    setPrevMoveState(null) // 한 단계만 되돌릴 수 있어서, 되돌린 뒤엔 다시 새 이동을 해야 다음 되돌리기가 가능
  }

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
    setTiles(buildStartingTiles())
    setScore(0)
    setGameOver(false)
    setPrevMoveState(null)
  }

  const best = useMemo(() => highestTile(tiles), [tiles])

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
            <div className="game2048__bg-grid" aria-hidden="true">
              {Array.from({ length: SIZE * SIZE }).map((_, i) => {
                const row = Math.floor(i / SIZE)
                const col = i % SIZE
                return <div key={i} className="game2048__bg-cell" style={cellStyle(row, col)} />
              })}
            </div>

            <div className="game2048__tiles">
              {tiles.map((t) => (
                <div
                  key={t.id}
                  className={`game2048__tile${t.isNew ? ' game2048__tile--new' : ''}${
                    t.justMerged ? ' game2048__tile--merged' : ''
                  }`}
                  style={{
                    ...cellStyle(t.row, t.col),
                    backgroundColor: TILE_COLORS[t.value] ?? TILE_COLOR_FALLBACK,
                    color: t.value <= DARK_TEXT_MAX ? '#5c5240' : '#faf8f5',
                  }}
                >
                  {t.value}
                </div>
              ))}
            </div>

            {!gameOver && undoTokenQty > 0 && prevMoveState && (
              <button
                type="button"
                className="game2048__undo-button"
                onClick={handleUndo}
                disabled={undoStatus === 'busy'}
                title="되돌리기 아이템으로 마지막 이동을 취소해요"
              >
                ↩️ 되돌리기 {undoTokenQty}
              </button>
            )}

            {gameOver && (
              <div className="game2048__overlay">
                <p className="game2048__overlay-text">게임 오버</p>
                {undoTokenQty > 0 && prevMoveState && (
                  <button
                    type="button"
                    className="game2048__undo-button game2048__undo-button--overlay"
                    onClick={handleUndo}
                    disabled={undoStatus === 'busy'}
                  >
                    ↩️ 되돌리기 사용하고 계속하기 ({undoTokenQty}개)
                  </button>
                )}
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
