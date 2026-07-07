import { useEffect, useState } from 'react'

/**
 * 서버(Vercel 서버리스 함수)에 "내 IP가 허용 목록에 있는지" 물어보고,
 * 허용된 IP가 아니면 개발자도구 가드를 켭니다.
 * - 로컬 개발(vite dev)에서는 항상 허용 (guard 비활성).
 * - API 호출이 실패하면 안전하게 "차단"으로 처리합니다.
 */
export default function useDevToolsAccess() {
  const [guardEnabled, setGuardEnabled] = useState(false)

  useEffect(() => {
    if (import.meta.env.DEV) return

    let cancelled = false

    fetch('/api/devtools-guard')
      .then((res) => (res.ok ? res.json() : { allowed: false }))
      .then(({ allowed }) => {
        if (!cancelled) setGuardEnabled(!allowed)
      })
      .catch(() => {
        if (!cancelled) setGuardEnabled(true)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return guardEnabled
}
