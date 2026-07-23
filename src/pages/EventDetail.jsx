import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchEventById, getEventStatus } from '../lib/events.js'
import AttendanceEventWidget from '../components/events/AttendanceEventWidget.jsx'
import { IconArrowLeft } from '../components/common/icons.jsx'
import usePageTitle from '../hooks/usePageTitle.js'

export default function EventDetail() {
  const { id } = useParams()
  const [event, setEvent] = useState(undefined) // undefined: 로딩중, null: 없음

  usePageTitle(event ? event.title : '이벤트')

  useEffect(() => {
    let cancelled = false
    setEvent(undefined)
    fetchEventById(id).then((data) => {
      if (!cancelled) setEvent(data ?? null)
    })
    return () => {
      cancelled = true
    }
  }, [id])

  if (event === undefined) {
    return (
      <div className="hub hub--single">
        <p className="events-page__empty">불러오는 중...</p>
      </div>
    )
  }

  if (event === null) {
    return (
      <div className="hub hub--single">
        <div className="oos">
          <p className="oos__sign">EVENT</p>
          <h1 className="oos__title">이벤트를 찾을 수 없어요</h1>
          <p className="oos__sub">종료됐거나 존재하지 않는 이벤트예요.</p>
          <Link to="/events" className="oos__back">
            이벤트 목록으로
          </Link>
        </div>
      </div>
    )
  }

  const eventStatus = getEventStatus(event)

  return (
    <div className="hub" style={{ '--tint': event.tint }}>
      <div className="event-detail">
        <Link to="/events" className="event-detail__back">
          <IconArrowLeft /> 이벤트 목록
        </Link>

        <header className="event-detail__hero">
          <span className="event-detail__icon" aria-hidden="true">
            {event.icon ?? '🎁'}
          </span>
          <span className={`event-status-badge event-status-badge--${eventStatus.key}`}>{eventStatus.label}</span>
          <h1 className="event-detail__title">{event.title}</h1>
          {event.reward_summary && <p className="event-detail__reward">🪙 {event.reward_summary}</p>}
        </header>

        <p className="event-detail__description">{event.description}</p>

        {/* 이벤트 타입별 본문. attendance는 전용 위젯, 그 외는 위 설명만 보여주는 기본 템플릿 */}
        {event.type === 'attendance' && <AttendanceEventWidget event={event} />}
      </div>
    </div>
  )
}
