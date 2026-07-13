import { Link, useLocation } from 'react-router-dom'
import { IconBell, IconGamepad, IconSettings, IconStore } from './icons.jsx'

const TABS = [
  { key: 'games', label: '게임', to: '/', Icon: IconGamepad, isActive: (p) => p === '/' || p.startsWith('/game/') },
  { key: 'store', label: '상점', to: '/store', Icon: IconStore, isActive: (p) => p.startsWith('/store') },
  {
    key: 'notifications',
    label: '알림',
    to: '/notifications',
    Icon: IconBell,
    isActive: (p) => p.startsWith('/notifications'),
  },
  { key: 'settings', label: '설정', to: '/settings', Icon: IconSettings, isActive: (p) => p.startsWith('/settings') },
]

export default function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {TABS.map(({ key, label, to, Icon, isActive }) => {
        const active = isActive(pathname)
        return (
          <Link key={key} to={to} className={`bottom-nav__item${active ? ' bottom-nav__item--active' : ''}`}>
            <Icon />
            <span className="bottom-nav__label">{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
