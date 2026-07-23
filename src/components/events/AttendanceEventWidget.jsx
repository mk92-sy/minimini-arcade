import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { claimEventAttendance, fetchMyAttendanceMonth } from '../../lib/events.js'
import { IconCoin } from '../common/icons.jsx'

const WEEKDAY_LABELS = ['일', '월', '화', '수', '목', '금', '토']

// DB 트리거/RPC와 동일하게 KST(Asia/Seoul, UTC+9) 기준 "오늘"을 계산합니다.
function kstNow() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000)
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

function ymd(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

const ERROR_MESSAGES = {
  ALREADY_CHECKED_IN: '오늘은 이미 출석했어요!',
  EVENT_INACTIVE: '지금은 종료된 이벤트예요.',
  NOT_ATTENDANCE_EVENT: '출석체크 이벤트가 아니에요.',
}

export default function AttendanceEventWidget({ event }) {
  const { user, coins, openAuthModal, updateLocalProfile } = useAuth()

  const kst = kstNow()
  const year = kst.getUTCFullYear()
  const month = kst.getUTCMonth() + 1
  const todayStr = ymd(year, month, kst.getUTCDate())

  const [attendance, setAttendance] = useState({}) // { 'YYYY-MM-DD': { reward_amount, is_bonus } }
  const [loading, setLoading] = useState(Boolean(user))
  const [claiming, setClaiming] = useState(false)
  const [claimResult, setClaimResult] = useState(null)
  const [claimError, setClaimError] = useState('')

  useEffect(() => {
    if (!user) {
      setAttendance({})
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    fetchMyAttendanceMonth(event.id, year, month).then((rows) => {
      if (cancelled) return
      const map = {}
      for (const row of rows) map[row.attend_date] = row
      setAttendance(map)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [user?.id, event.id, year, month])

  const checkedInToday = Boolean(attendance[todayStr])
  const attendedCount = Object.keys(attendance).length

  const calendarCells = useMemo(() => {
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay()
    const cells = Array.from({ length: firstWeekday }, () => null)

    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateStr = ymd(year, month, day)
      const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay()
      cells.push({
        day,
        dateStr,
        isWeekend: weekday === 0 || weekday === 6,
        isToday: dateStr === todayStr,
        isFuture: dateStr > todayStr,
        record: attendance[dateStr] ?? null,
      })
    }
    return cells
  }, [attendance, year, month, todayStr])

  const handleCheckIn = async () => {
    if (!user) {
      openAuthModal()
      return
    }
    if (checkedInToday || claiming) return

    setClaiming(true)
    setClaimError('')
    setClaimResult(null)

    const { data, error } = await claimEventAttendance(event.id)
    setClaiming(false)

    if (error) {
      const code = Object.keys(ERROR_MESSAGES).find((key) => error.message?.includes(key))
      setClaimError(code ? ERROR_MESSAGES[code] : '출석 체크에 실패했어요. 잠시 후 다시 시도해주세요.')
      return
    }

    setAttendance((prev) => ({
      ...prev,
      [todayStr]: { reward_amount: data.reward_amount, is_bonus: data.is_bonus },
    }))
    setClaimResult(data)
    updateLocalProfile({ coins: data.new_coins })
  }

  return (
    <div className="attendance-widget">
      <div className="attendance-widget__summary">
        <div className="attendance-widget__summary-item">
          <span className="attendance-widget__summary-label">이번 달 출석</span>
          <span className="attendance-widget__summary-value">{attendedCount}일</span>
        </div>
        <div className="attendance-widget__summary-item">
          <span className="attendance-widget__summary-label">보유 코인</span>
          <span className="attendance-widget__summary-value">
            <IconCoin width="16" height="16" /> {user ? coins.toLocaleString('ko-KR') : '-'}
          </span>
        </div>
      </div>

      <div className="attendance-widget__calendar">
        <div className="attendance-widget__weekdays" aria-hidden="true">
          {WEEKDAY_LABELS.map((label, i) => (
            <span
              key={label}
              className={`attendance-widget__weekday${i === 0 || i === 6 ? ' attendance-widget__weekday--weekend' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="attendance-widget__grid">
          {calendarCells.map((cell, i) =>
            cell === null ? (
              <span key={`blank-${i}`} className="attendance-widget__cell attendance-widget__cell--blank" />
            ) : (
              <span
                key={cell.dateStr}
                className={[
                  'attendance-widget__cell',
                  cell.record && 'attendance-widget__cell--attended',
                  cell.isToday && 'attendance-widget__cell--today',
                  cell.isWeekend && 'attendance-widget__cell--weekend',
                  cell.isFuture && 'attendance-widget__cell--future',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <span className="attendance-widget__cell-day">{cell.day}</span>
                {cell.record && (
                  <span className="attendance-widget__cell-mark" aria-hidden="true">
                    {cell.record.is_bonus ? '✨' : '✓'}
                  </span>
                )}
              </span>
            ),
          )}
        </div>
      </div>

      {!user ? (
        <div className="attendance-widget__cta">
          <p className="attendance-widget__cta-text">로그인하면 출석 체크를 할 수 있어요.</p>
          <button type="button" className="attendance-widget__checkin-button" onClick={openAuthModal}>
            로그인하기
          </button>
        </div>
      ) : (
        <div className="attendance-widget__cta">
          <button
            type="button"
            className={`attendance-widget__checkin-button${
              checkedInToday ? ' attendance-widget__checkin-button--done' : ''
            }`}
            onClick={handleCheckIn}
            disabled={checkedInToday || claiming || loading}
          >
            {checkedInToday ? '오늘 출석 완료 ✓' : claiming ? '출석 체크 중...' : '오늘 출석하기'}
          </button>
          {claimResult && (
            <p className="attendance-widget__result">
              +{claimResult.reward_amount}코인 받았어요{claimResult.is_bonus ? ' (주말 2배 🎉)' : ''}!
            </p>
          )}
          {claimError && <p className="attendance-widget__error">{claimError}</p>}
        </div>
      )}
    </div>
  )
}
