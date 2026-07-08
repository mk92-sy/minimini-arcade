import { useEffect, useState } from 'react'
import { fetchLeaderboard } from '../../lib/scores.js'

const CACHE_TTL = 60 * 60 * 1000 // 1시간

function cacheKey(gameId, order) {
  return `mini-arcade:leaderboard:${gameId}:${order}`
}

function readCache(gameId, order) {
  try {
    const raw = window.localStorage.getItem(cacheKey(gameId, order))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.fetchedAt > CACHE_TTL) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(gameId, order, rows) {
  try {
    window.localStorage.setItem(cacheKey(gameId, order), JSON.stringify({ rows, fetchedAt: Date.now() }))
  } catch {
    // 저장 실패해도 화면 표시에는 지장 없음
  }
}

const MEDAL_PALETTE = {
  1: { fill: '#FFD54A', ring: '#C9971F' },
  2: { fill: '#E3E7EE', ring: '#9AA3B2' },
  3: { fill: '#E0A972', ring: '#9C6B34' },
}

function MedalIcon({ rank }) {
  const palette = MEDAL_PALETTE[rank]
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-label={`${rank}위`}>
      <circle cx="12" cy="12" r="10" fill={palette.fill} stroke={palette.ring} strokeWidth="1.5" />
      <text x="12" y="16" textAnchor="middle" fontSize="10" fontWeight="700" fill={palette.ring}>
        {rank}
      </text>
    </svg>
  )
}

/**
 * 공용 랭킹 보드. 최대 10위까지 보여주고, 1~3위는 메달 아이콘으로 표시합니다.
 * 실시간 조회가 아니라 1시간 단위로 캐시해서, 같은 시간 내 재방문/새로고침에는
 * API를 다시 호출하지 않습니다.
 * @param {string} gameId - games.js의 id
 * @param {'asc'|'desc'} order - asc: 점수 낮을수록 상위 (반응속도 등), desc: 점수 높을수록 상위
 * @param {string} unit - 점수 뒤에 붙일 단위 (예: 'ms', '점', '회')
 * @param {number} limit - 노출할 순위 수 (최대 10으로 고정)
 */
export default function Leaderboard({ gameId, order = 'desc', unit = '', limit = 10 }) {
  const cappedLimit = Math.min(limit, 10)
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [rows, setRows] = useState([])
  const [updatedAt, setUpdatedAt] = useState(null)

  useEffect(() => {
    let cancelled = false

    const cached = readCache(gameId, order)
    if (cached) {
      setRows(cached.rows)
      setUpdatedAt(cached.fetchedAt)
      setStatus('ready')
      return
    }

    setStatus('loading')
    fetchLeaderboard(gameId, { order, limit: cappedLimit }).then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        setStatus('error')
        return
      }
      const fetchedAt = Date.now()
      setRows(data)
      setUpdatedAt(fetchedAt)
      writeCache(gameId, order, data)
      setStatus('ready')
    })

    return () => {
      cancelled = true
    }
  }, [gameId, order, cappedLimit])

  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="leaderboard">
      <p className="leaderboard__title">HIGH SCORES</p>
      <p className="leaderboard__notice">
        ⏱ 랭킹은 1시간마다 업데이트돼요{updatedLabel ? ` · 마지막 업데이트 ${updatedLabel}` : ''}
      </p>

      {status === 'loading' && (
        <ul className="leaderboard__list">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="leaderboard__row leaderboard__row--skeleton" />
          ))}
        </ul>
      )}

      {status === 'error' && (
        <p className="leaderboard__empty">랭킹을 불러오지 못했어요. 잠시 후 다시 시도해주세요.</p>
      )}

      {status === 'ready' && rows.length === 0 && (
        <p className="leaderboard__empty">아직 등록된 기록이 없어요. 첫 기록의 주인공이 되어보세요!</p>
      )}

      {status === 'ready' && rows.length > 0 && (
        <ul className="leaderboard__list">
          {rows.map((row, i) => {
            const rank = i + 1
            return (
              <li key={row.id} className="leaderboard__row">
                <span className="leaderboard__rank">{rank <= 3 ? <MedalIcon rank={rank} /> : rank}</span>
                <span className="leaderboard__nickname">{row.nickname}</span>
                <span className="leaderboard__score">
                  {row.score}
                  {unit}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
