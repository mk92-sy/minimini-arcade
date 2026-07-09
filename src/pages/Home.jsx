import { useEffect, useState } from 'react'
import { games } from '../data/games.js'
import GameCard from '../components/GameCard.jsx'
import { fetchGameStats } from '../lib/gameStats.js'

export default function Home() {
  const [stats, setStats] = useState({})

  useEffect(() => {
    let cancelled = false
    fetchGameStats().then((map) => {
      if (!cancelled) setStats(map)
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="hub">
      <header className="hub__header">
        <div className="hub__logo">
          <span className="hub__bulbs" aria-hidden="true">
            {Array.from({ length: 7 }).map((_, i) => (
              <span key={i} style={{ '--i': i }} />
            ))}
          </span>
          <span className="hub__logo-text">MINI ARCADE</span>
        </div>
      </header>

      <section className="hub__hero">
        <p className="hub__eyebrow">8 CABINETS · 0 LOADING SCREENS</p>
        <h1 className="hub__headline">
          캐비닛을 고르고,<br />바로 플레이하세요.
        </h1>
        <p className="hub__sub">
          동전은 필요 없습니다. 클릭 한 번이면 게임이 시작돼요.
        </p>
      </section>

      <section className="hub__grid" aria-label="게임 목록">
        {games.map((game) => (
          <GameCard key={game.id} game={game} stats={stats[game.id]} />
        ))}
      </section>

      <footer className="hub__footer">
        <span>React + Vite</span>
        <span className="hub__footer-dim">// 캐비닛은 계속 추가될 예정</span>
      </footer>
    </div>
  )
}
