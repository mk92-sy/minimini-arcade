import { useEffect, useRef, useState } from 'react'
import { fetchLeaderboard, fetchMyRank } from '../../lib/scores.js'
import { useAuth } from '../../context/AuthContext.jsx'

const CACHE_TTL = 60 * 60 * 1000 // 1시간
const CACHE_VERSION = 'v3' // 버전을 올리면 예전에 캐시된 값이 자동 무효화됨

// top10은 "누가 보든 똑같은" 공개 데이터라서 gameId+order로만 키를 잡아요.
// (userId를 섞으면 로그인/로그아웃할 때마다 캐시가 쪼개져서, 로그아웃 후
// 예전 stale 캐시를 다시 보여주는 버그가 생겨요 — 실제로 겪었던 문제)
function leaderboardCacheKey(gameId, order) {
  return `mini-arcade:leaderboard:${CACHE_VERSION}:${gameId}:${order}`
}

// 내 순위는 개인 데이터라서 userId별로 따로 캐시해요.
function myRankCacheKey(gameId, order, userId) {
  return `mini-arcade:myrank:${CACHE_VERSION}:${gameId}:${order}:${userId}`
}

function readCache(key) {
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.fetchedAt > CACHE_TTL) return null
    return parsed
  } catch {
    return null
  }
}

function writeCache(key, payload) {
  try {
    window.localStorage.setItem(key, JSON.stringify(payload))
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
 * 하단에는 로그인한 사용자의 내 순위/총 참가자 수/상위 퍼센트를 보여줍니다.
 * top10(공개 데이터)과 내 순위(개인 데이터)는 서로 다른 캐시 키를 써요 —
 * 그래야 로그인/로그아웃을 오가도 top10이 서로 다른 stale 캐시를 보여주지 않습니다.
 * @param {string} gameId - games.js의 id
 * @param {'asc'|'desc'} order - asc: 점수 낮을수록 상위 (반응속도 등), desc: 점수 높을수록 상위
 * @param {string} unit - 점수 뒤에 붙일 단위 (예: 'ms', '점', '회')
 * @param {number} limit - 노출할 순위 수 (최대 10으로 고정)
 * @param {*} refreshSignal - 이 값이 바뀌면 캐시를 무시하고 강제로 새로 불러옵니다.
 *   (예: 방금 내가 점수를 등록해서 데이터가 실제로 바뀐 게 확실한 경우)
 *   일반적인 재방문/새로고침에서는 그대로 두면 1시간 캐시를 씁니다.
 */
export default function Leaderboard({ gameId, order = 'desc', unit = '', limit = 10, refreshSignal = 0 }) {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const cappedLimit = Math.min(limit, 10)

  const [status, setStatus] = useState('loading') // loading | ready | error
  const [rows, setRows] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [updatedAt, setUpdatedAt] = useState(null)
  const lastRefreshSignal = useRef(refreshSignal)

  useEffect(() => {
    let cancelled = false

    const lbKey = leaderboardCacheKey(gameId, order)
    const rankKey = userId ? myRankCacheKey(gameId, order, userId) : null

    // refreshSignal이 이전과 달라졌다면(= 방금 내가 등록해서 데이터가 바뀐 게 확실함)
    // 캐시를 아예 무시하고 강제로 새로 불러옵니다.
    const isForced = refreshSignal !== lastRefreshSignal.current
    lastRefreshSignal.current = refreshSignal

    const cachedRows = !isForced ? readCache(lbKey) : null
    const cachedRank = !isForced && rankKey ? readCache(rankKey) : null

    const needRowsFetch = !cachedRows
    const needRankFetch = Boolean(userId) && !cachedRank

    if (!needRowsFetch && !needRankFetch) {
      setRows(cachedRows.rows)
      setMyRank(userId && cachedRank ? cachedRank.myRank : null)
      setUpdatedAt(userId && cachedRank ? Math.max(cachedRows.fetchedAt, cachedRank.fetchedAt) : cachedRows.fetchedAt)
      setStatus('ready')
      return
    }

    setStatus('loading')
    Promise.all([
      needRowsFetch ? fetchLeaderboard(gameId, { order, limit: cappedLimit }) : Promise.resolve({ data: cachedRows.rows, error: null }),
      needRankFetch ? fetchMyRank(gameId, userId, order) : Promise.resolve({ data: userId && cachedRank ? cachedRank.myRank : null, error: null }),
    ]).then(([lb, mine]) => {
      if (cancelled) return
      if (lb.error) {
        console.error(
          '[leaderboard] 랭킹을 불러오지 못했어요. supabase/schema.sql이 최신 버전으로 실행됐는지 확인해주세요 (get_leaderboard_top 함수 필요).',
          lb.error,
        )
        setStatus('error')
        return
      }
      if (mine.error) {
        console.warn('[leaderboard] 내 순위를 불러오지 못했어요.', mine.error)
      }

      const now = Date.now()
      setRows(lb.data)
      setMyRank(userId ? mine.data : null)
      setUpdatedAt(now)

      if (needRowsFetch) writeCache(lbKey, { rows: lb.data, fetchedAt: now })
      if (needRankFetch && rankKey) writeCache(rankKey, { myRank: mine.data, fetchedAt: now })

      setStatus('ready')
    })

    return () => {
      cancelled = true
    }
  }, [gameId, order, cappedLimit, userId, refreshSignal])

  const updatedLabel = updatedAt
    ? new Date(updatedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
    : null

  const myPercentile =
    myRank && myRank.total > 0 ? Math.max(1, Math.round((myRank.rank / myRank.total) * 100)) : null

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
              <li key={row.user_id} className="leaderboard__row">
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

      {status === 'ready' && (
        <div className="leaderboard__my-rank">
          <p className="leaderboard__my-rank-title">MY RANK</p>
          {!userId && <p className="leaderboard__my-rank-text">로그인하면 내 순위를 확인할 수 있어요.</p>}
          {userId && !myRank && (
            <p className="leaderboard__my-rank-text">아직 이 게임에 등록한 기록이 없어요.</p>
          )}
          {userId && myRank && (
            <p className="leaderboard__my-rank-text">
              내 순위 <strong>{myRank.rank}위</strong> · 총 <strong>{myRank.total}명</strong> 중 상위{' '}
              <strong>{myPercentile}%</strong>
            </p>
          )}
        </div>
      )}
    </div>
  )
}
