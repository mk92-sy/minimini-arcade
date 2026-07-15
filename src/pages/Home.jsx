import { useEffect, useState } from 'react'
import { games } from '../data/games.js'
import GameCard from '../components/GameCard.jsx'
import { fetchGameStats, fetchTodaySubmittedGameIds } from '../lib/gameStats.js'
import { useAuth } from '../context/AuthContext.jsx'
import usePageTitle from '../hooks/usePageTitle.js'

export default function Home() {
  usePageTitle('게임')
  const { user } = useAuth()
  const [stats, setStats] = useState({})

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchGameStats(), fetchTodaySubmittedGameIds(user?.id ?? null)]).then(
      ([statMap, submittedIds]) => {
        if (cancelled) return
        const merged = {}
        for (const game of games) {
          merged[game.id] = {
            ...statMap[game.id],
            submittedToday: submittedIds.has(game.id),
          }
        }
        setStats(merged)
      },
    )
    return () => {
      cancelled = true
    }
  }, [user?.id])

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
