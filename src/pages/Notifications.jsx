import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext.jsx'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  deleteAllNotifications,
  deleteNotification,
} from '../lib/notifications.js'
import { formatRelativeTime } from '../lib/relativeTime.js'
import { games } from '../data/games.js'
import ConfirmDialog from '../components/common/ConfirmDialog.jsx'
import { IconClose } from '../components/common/icons.jsx'
import usePageTitle from '../hooks/usePageTitle.js'

function gameTitle(gameId) {
  return games.find((g) => g.id === gameId)?.title ?? '게임'
}

function formatMonthDay(dateStr) {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}월 ${d.getDate()}일`
}

function buildMessage(n) {
  switch (n.type) {
    case 'score_submitted':
      return `${gameTitle(n.game_id)} 랭킹을 등록하였습니다.`
    case 'daily_play_reward':
      return `${gameTitle(n.game_id)} 일일 보상이 지급되었습니다. (+${n.amount})`
    case 'daily_rank_reward':
      return `${formatMonthDay(n.reward_date)} ${gameTitle(n.game_id)} ${n.rank}위를 달성하여 축하 보상이 지급되었습니다. (+${n.amount})`
    case 'admin_broadcast':
      return n.message || '운영자로부터 새 공지가 도착했어요.'
    default:
      return '새 알림이 있어요.'
  }
}

export default function Notifications() {
  usePageTitle('알림')
  const { isConfigured, user, openAuthModal, refreshUnreadCount } = useAuth()

  const [items, setItems] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    setStatus('loading')
    fetchNotifications(user.id).then(({ data, error }) => {
      if (cancelled) return
      if (error) {
        setStatus('error')
        return
      }
      setItems(data)
      setStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [user?.id])

  if (!isConfigured) return null

  if (!user) {
    return (
      <div className="hub hub--single">
        <div className="oos">
          <p className="oos__sign">NOTIFICATIONS</p>
          <h1 className="oos__title">로그인이 필요해요</h1>
          <p className="oos__sub">알림을 확인하려면 먼저 로그인해주세요.</p>
          <button type="button" className="oos__back" onClick={openAuthModal}>
            로그인하기
          </button>
        </div>
      </div>
    )
  }

  const unreadCount = items.filter((n) => !n.read_at).length

  const handleItemClick = async (n) => {
    if (n.read_at) return
    const { error } = await markNotificationRead(n.id)
    if (error) return
    const now = new Date().toISOString()
    setItems((prev) => prev.map((item) => (item.id === n.id ? { ...item, read_at: now } : item)))
    refreshUnreadCount()
  }

  const handleDeleteOne = async (id) => {
    const { error } = await deleteNotification(id)
    if (error) return
    setItems((prev) => prev.filter((item) => item.id !== id))
    refreshUnreadCount()
  }

  const handleMarkAllRead = async () => {
    const { error } = await markAllNotificationsRead(user.id)
    if (error) return
    const now = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })))
    refreshUnreadCount()
  }

  const handleDeleteAll = async () => {
    await deleteAllNotifications(user.id)
    setItems([])
    setDeleteDialogOpen(false)
    refreshUnreadCount()
  }

  return (
    <div className="hub">
      <div className="notif-page">
        <div className="notif-page__header">
          <h1 className="notif-page__title">알림{unreadCount > 0 ? ` (${unreadCount})` : ''}</h1>
          {items.length > 0 && (
            <div className="notif-page__actions">
              <button
                type="button"
                className="notif-page__action-btn"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
              >
                모두 읽음
              </button>
              <button
                type="button"
                className="notif-page__action-btn notif-page__action-btn--danger"
                onClick={() => setDeleteDialogOpen(true)}
              >
                모두 삭제
              </button>
            </div>
          )}
        </div>

        {status === 'loading' && <p className="notif-page__empty">불러오는 중...</p>}
        {status === 'error' && <p className="notif-page__empty">알림을 불러오지 못했어요.</p>}
        {status === 'ready' && items.length === 0 && (
          <p className="notif-page__empty">아직 알림이 없어요. 게임을 플레이하면 여기에 소식이 쌓여요.</p>
        )}

        {status === 'ready' && items.length > 0 && (
          <ul className="notif-page__list">
            {items.map((n) => (
              <li
                key={n.id}
                className={`notif-page__item${!n.read_at ? ' notif-page__item--unread' : ''}`}
                onClick={() => handleItemClick(n)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleItemClick(n)
                }}
              >
                <span className="notif-page__dot" aria-hidden="true" />
                <div className="notif-page__body">
                  <p className="notif-page__message">{buildMessage(n)}</p>
                  <p className="notif-page__time">{formatRelativeTime(n.created_at)}</p>
                </div>
                <button
                  type="button"
                  className="notif-page__delete-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDeleteOne(n.id)
                  }}
                  aria-label="알림 삭제"
                  title="알림 삭제"
                >
                  <IconClose />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={deleteDialogOpen}
        title="알림 모두 삭제"
        message="모든 알림을 삭제할까요? 되돌릴 수 없어요."
        confirmLabel="삭제하기"
        cancelLabel="취소"
        onConfirm={handleDeleteAll}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </div>
  )
}
