import { useParams } from 'react-router-dom'
import { games } from '../data/games.js'
import usePageTitle from '../hooks/usePageTitle.js'

export default function GamePlaceholder() {
  const { id } = useParams()
  const game = games.find((g) => g.id === id)
  usePageTitle(game ? game.title : '게임')

  return (
    <div className="hub hub--single">
      <div className="oos" style={{ '--tint': game?.tint ?? '#ffb703' }}>
        <p className="oos__sign">OUT OF ORDER</p>
        <h1 className="oos__title">{game ? game.title : '알 수 없는 게임'}</h1>
        <p className="oos__sub">이 게임은 아직 만드는 중이에요. 곧 돌아옵니다.</p>
      </div>
    </div>
  )
}
