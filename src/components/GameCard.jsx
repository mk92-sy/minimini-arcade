import { Link } from 'react-router-dom'
import CabinetIcon from './CabinetIcon.jsx'
import { IconHeart, IconUsers } from './common/icons.jsx'
import { formatChallengerCount } from '../lib/gameStats.js'
import { useAuth } from '../context/AuthContext.jsx'

export default function GameCard({ game, stats }) {
  const { user } = useAuth()
  const style = { '--tint': game.tint }
  const likeCount = stats?.likeCount ?? 0
  const challengerCount = stats?.challengerCount ?? 0

  let statusText
  let statusVariant

  if (!game.implemented) {
    statusText = '준비중이에요!'
    statusVariant = 'pending'
  } else if (!user) {
    statusText = '지금 바로 플레이'
    statusVariant = 'ready'
  } else if (stats?.submittedToday) {
    statusText = '일일 랭킹 등록 완료'
    statusVariant = 'ready'
  } else {
    statusText = '일일 랭킹 등록 가능'
    statusVariant = 'ready'
  }

  return (
    <Link to={game.path} className="cabinet" style={style}>
      <div className="cabinet__marquee">
        <span className="cabinet__number">GAME {game.number}</span>
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

        <div className={`cabinet__status cabinet__status--${statusVariant}`}>
          <span className="cabinet__led" aria-hidden="true" />
          {statusText}
        </div>
      </div>
    </Link>
  )
}
