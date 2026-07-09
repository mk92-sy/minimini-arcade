import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { fetchLikeStatus, likeGame, unlikeGame } from '../../lib/likes.js'
import { IconHeart } from './icons.jsx'

export default function LikeButton({ gameId, onRequestLogin }) {
  const { user } = useAuth()
  const [liked, setLiked] = useState(false)
  const [count, setCount] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchLikeStatus(gameId, user?.id ?? null).then(({ liked: isLiked, count: total }) => {
      if (!cancelled) {
        setLiked(isLiked)
        setCount(total)
      }
    })
    return () => {
      cancelled = true
    }
  }, [gameId, user?.id])

  const toggle = async () => {
    if (!user) {
      onRequestLogin?.()
      return
    }
    if (busy) return

    setBusy(true)
    const next = !liked
    // 낙관적 업데이트 먼저 반영하고, 실패하면 롤백
    setLiked(next)
    setCount((c) => (c === null ? c : c + (next ? 1 : -1)))

    const { error } = next ? await likeGame(gameId, user.id) : await unlikeGame(gameId, user.id)

    if (error) {
      setLiked(!next)
      setCount((c) => (c === null ? c : c + (next ? -1 : 1)))
    }
    setBusy(false)
  }

  return (
    <button
      type="button"
      className={`like-button${liked ? ' like-button--active' : ''}`}
      onClick={toggle}
      aria-pressed={liked}
      aria-label="좋아요"
      title="좋아요"
    >
      <IconHeart filled={liked} />
      <span className="like-button__count">{count === null ? '-' : count}</span>
    </button>
  )
}
