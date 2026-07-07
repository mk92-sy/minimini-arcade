import { useEffect, useState } from 'react'
import { fetchLeaderboard } from '../../lib/scores.js'

/**
 * 공용 랭킹 보드.
 * @param {string} gameId - games.js의 id
 * @param {'asc'|'desc'} order - asc: 점수 낮을수록 상위 (반응속도 등), desc: 점수 높을수록 상위
 * @param {string} unit - 점수 뒤에 붙일 단위 (예: 'ms', '점', '회')
 * @param {number} limit - 노출할 순위 수
 * @param {number} refreshKey - 이 값이 바뀌면 다시 불러옴 (점수 등록 직후 갱신용)
 */
export default function Leaderboard({ gameId, order = 'desc', unit = '', limit = 10, refreshKey = 0 }) {
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [rows, setRows] = useState([])

  useEffect(() => {
    let cancelled = false
    setStatus('loading')

    fetchLeaderboard(gameId, { order, limit }).then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        setStatus('error')
        return
      }
      setRows(data)
      setStatus('ready')
    })

    return () => {
      cancelled = true
    }
  }, [gameId, order, limit, refreshKey])

  return (
    <div className="leaderboard">
      <p className="leaderboard__title">HIGH SCORES</p>

      {status === 'loading' && (
        <ul className="leaderboard__list">
          {Array.from({ length: 5 }).map((_, i) => (
            <li key={i} className="leaderboard__row leaderboard__row--skeleton" />
          ))}
        </ul>
      )}

      {status === 'error' && (
        <p className="leaderboard__empty">
          랭킹을 불러오지 못했어요. Supabase 연결(.env)을 확인해주세요.
        </p>
      )}

      {status === 'ready' && rows.length === 0 && (
        <p className="leaderboard__empty">아직 등록된 기록이 없어요. 첫 기록의 주인공이 되어보세요!</p>
      )}

      {status === 'ready' && rows.length > 0 && (
        <ul className="leaderboard__list">
          {rows.map((row, i) => (
            <li key={row.id} className="leaderboard__row">
              <span className="leaderboard__rank">{i + 1}</span>
              <span className="leaderboard__nickname">{row.nickname}</span>
              <span className="leaderboard__score">
                {row.score}
                {unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
