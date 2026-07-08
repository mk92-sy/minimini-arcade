import { Link } from 'react-router-dom'

export default function GameShell({ eyebrow, title, tint = '#ffb703', wide = false, children }) {
  return (
    <div className="hub" style={{ '--tint': tint }}>
      <div className="game-shell__nav">
        <Link to="/" className="game-shell__back">
          ← 아케이드로
        </Link>
      </div>

      <header className="game-shell__header">
        <p className="hub__eyebrow" style={{ color: tint }}>
          {eyebrow}
        </p>
        <h1 className="hub__headline">{title}</h1>
      </header>

      <div className={`game-shell__body${wide ? ' game-shell__body--wide' : ''}`}>{children}</div>
    </div>
  )
}
