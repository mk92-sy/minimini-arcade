import { useEffect, useState } from 'react'
import { fetchActiveAnnouncements } from '../lib/announcements.js'

/**
 * 활성 공지사항 목록을 한 번 불러와서 반환합니다.
 * (AnnouncementBar가 이 목록을 하나씩 순서대로 돌려가며 보여줌)
 */
export default function useAnnouncements() {
  const [items, setItems] = useState([])

  useEffect(() => {
    let cancelled = false

    fetchActiveAnnouncements().then(({ data, error }) => {
      if (cancelled || error) return
      setItems(data)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return items
}
