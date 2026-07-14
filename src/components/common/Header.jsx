import { Link, useLocation } from 'react-router-dom'
import { games } from '../../data/games.js'
import AuthButton from './AuthButton.jsx'
import { IconArrowLeft } from './icons.jsx'

export default function Header() {
  const { pathname } = useLocation()
  const gameMatch = pathname.match(/^\/game\/([^/]+)/)
  const game = gameMatch ? games.find((g) => g.id === gameMatch[1]) : null

  return (
    <header className="app-header">
      <div className="app-header__left">
        {game ? (
          <>
            <Link to="/" className="app-header__back" aria-label="아케이드로 돌아가기">
              <IconArrowLeft />
            </Link>
            <span className="app-header__game-title" style={{ color: game.tint }}>
              {game.title}
            </span>
          </>
        ) : (
          <Link to="/" className="app-header__logo">
            <span className="app-header__logo-text">MINIMINI ARCADE</span>
          </Link>
        )}
      </div>

      <AuthButton />
    </header>
  )
}
