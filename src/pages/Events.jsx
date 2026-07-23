import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchEvents, getEventStatus } from '../lib/events.js'
import usePageTitle from '../hooks/usePageTitle.js'

export default function Events() {
  usePageTitle('이벤트')

  const [events, setEvents] = useState([])
  const [status, setStatus] = useState('loading') // loading | ready

  useEffect(() => {
    let cancelled = false
    fetchEvents().then((data) => {
      if (cancelled) return
      setEvents(data)
      setStatus('ready')
    })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="hub">
      <section className="hub__hero">
        <p className="hub__sub">참여하면 코인도 받아가는 이벤트예요.</p>
      </section>

      {status === 'loading' && <p className="events-page__empty">불러오는 중...</p>}

      {status === 'ready' && events.length === 0 && (
        <p className="events-page__empty">지금은 진행 중인 이벤트가 없어요. 곧 새로운 이벤트로 찾아올게요!</p>
      )}

      {status === 'ready' && events.length > 0 && (
        <div className="events-grid">
          {events.map((event) => {
            const eventStatus = getEventStatus(event)
            return (
              <Link key={event.id} to={`/events/${event.id}`} className="event-card" style={{ '--tint': event.tint }}>
                <div className="event-card__banner">
                  <span className="event-card__icon" aria-hidden="true">
                    {event.icon ?? '🎁'}
                  </span>
                  <span className={`event-status-badge event-status-badge--${eventStatus.key}`}>
                    {eventStatus.label}
                  </span>
                </div>
                <div className="event-card__body">
                  <h3 className="event-card__title">{event.title}</h3>
                  <p className="event-card__summary">{event.summary}</p>
                  {event.reward_summary && <p className="event-card__reward">🪙 {event.reward_summary}</p>}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
