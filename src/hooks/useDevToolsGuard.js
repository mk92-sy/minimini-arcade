import { useEffect } from 'react'

// 완전한 차단은 불가능합니다 (모바일 원격 디버깅, 프록시 툴 등으로 우회 가능).
// 캐주얼한 조작을 막는 가벼운 저지선 정도로만 취급해주세요.
const BLOCKED_COMBOS = [
  { key: 'F12' },
  { key: 'i', ctrl: true, shift: true }, // Win/Linux: Ctrl+Shift+I
  { key: 'j', ctrl: true, shift: true }, // Ctrl+Shift+J (콘솔)
  { key: 'c', ctrl: true, shift: true }, // Ctrl+Shift+C (요소 검사)
  { key: 'u', ctrl: true }, // 소스 보기
  { key: 'i', meta: true, alt: true }, // macOS: Cmd+Option+I
  { key: 'j', meta: true, alt: true },
  { key: 'c', meta: true, alt: true },
]

function matchesBlockedCombo(e) {
  const key = e.key?.toLowerCase()
  return BLOCKED_COMBOS.some((combo) => {
    if (combo.key.toLowerCase() !== key) return false
    if (combo.ctrl && !e.ctrlKey) return false
    if (combo.shift && !e.shiftKey) return false
    if (combo.meta && !e.metaKey) return false
    if (combo.alt && !e.altKey) return false
    return true
  })
}

/**
 * enabled가 true일 때만 우클릭 메뉴 / 개발자도구 단축키를 막습니다.
 */
export default function useDevToolsGuard(enabled) {
  useEffect(() => {
    if (!enabled) return

    const handleContextMenu = (e) => e.preventDefault()
    const handleKeyDown = (e) => {
      if (matchesBlockedCombo(e)) {
        e.preventDefault()
      }
    }

    document.addEventListener('contextmenu', handleContextMenu)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled])
}
