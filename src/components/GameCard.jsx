import { Link } from 'react-router-dom'
import CabinetIcon from './CabinetIcon.jsx'
import { IconHeart, IconUsers } from './common/icons.jsx'
import { formatChallengerCount } from '../lib/gameStats.js'

export default function GameCard({ game, stats }) {
  const style = { '--tint': game.tint }
  const likeCount = stats?.likeCount ?? 0
  const challengerCount = stats?.challengerCount ?? 0

  return (
    <Link to={game.path} className="cabinet" style={style}>
      <div className="cabinet__marquee">
        <span className="cabinet__number">CABINET {game.number}</span>
        <span className="cabinet__dot" aria-hidden="true" />
      </div>

      <div className="cabinet__screen">
        <div className="cabinet__glow" aria-hidden="true" />
        <div className="cabinet__scanlines" aria-hidden="true" />
        <CabinetIcon name={game.icon} />
      </div>

      <div className="cabinet__body">
        <h3 className="cabinet__title">{game.title}</h3>
        <p className="cabinet__tagline">{game.tagline}</p>

        <div className="cabinet__meta">
          <span className="cabinet__meta-item">
            <IconHeart filled={likeCount > 0} /> {likeCount}
          </span>
          <span className="cabinet__meta-item">
            <IconUsers /> {formatChallengerCount(challengerCount)}
          </span>
        </div>

        <div className="cabinet__status">
          <span className="cabinet__led" aria-hidden="true" />
          READY
        </div>
      </div>
    </Link>
  )
}
