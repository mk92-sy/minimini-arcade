import { useParams, Link } from 'react-router-dom'
import { games } from '../data/games.js'

export default function GamePlaceholder() {
  const { id } = useParams()
  const game = games.find((g) => g.id === id)

  return (
    <div className="hub hub--single">
      <div className="oos" style={{ '--tint': game?.tint ?? '#ffb703' }}>
        <p className="oos__sign">OUT OF ORDER</p>
        <h1 className="oos__title">{game ? game.title : '알 수 없는 캐비닛'}</h1>
        <p className="oos__sub">이 캐비닛은 아직 조립 중이에요. 곧 돌아옵니다.</p>
        <Link to="/" className="oos__back">
          ← 아케이드로 돌아가기
        </Link>
      </div>
    </div>
  )
}
