import { useEffect } from 'react'

/**
 * 페이지별로 <title>을 설정합니다. 예: usePageTitle('알림') -> "알림 | minimini-arcade"
 * pageName이 없으면 기본 타이틀("minimini-arcade")만 사용합니다.
 */
export default function usePageTitle(pageName) {
  useEffect(() => {
    document.title = pageName ? `${pageName} | minimini-arcade` : 'minimini-arcade'
  }, [pageName])
}
