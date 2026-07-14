import { useEffect, useState } from 'react'
import { games } from '../data/games.js'
import GameCard from '../components/GameCard.jsx'
import { fetchGameStats } from '../lib/gameStats.js'
import usePageTitle from '../hooks/usePageTitle.js'

export default function Home() {
  usePageTitle('게임')
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
      <section className="hub__hero">
        <p className="hub__sub">동전 없이 바로 즐기는 미니게임 아케이드예요.</p>
      </section>

      <section className="hub__grid" aria-label="게임 목록">
        {games.map((game) => (
          <GameCard key={game.id} game={game} stats={stats[game.id]} />
        ))}
      </section>

      <footer className="hub__footer">
        <span>© 2026 mk92-sy. All rights reserved.</span>
      </footer>
    </div>
  )
}
