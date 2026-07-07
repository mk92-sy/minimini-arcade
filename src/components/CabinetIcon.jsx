// 캐비닛 화면 안에 들어갈 아이콘들. 전부 currentColor를 써서
// 카드에서 지정한 tint 색이 그대로 stroke 색이 되도록 함.
const common = {
  width: 40,
  height: 40,
  viewBox: '0 0 40 40',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const icons = {
  bolt: (
    <svg {...common}>
      <path d="M22 4 9 22h9l-2 14 15-20h-9l2-12z" />
    </svg>
  ),
  target: (
    <svg {...common}>
      <circle cx="20" cy="20" r="14" />
      <circle cx="20" cy="20" r="7" />
      <circle cx="20" cy="20" r="1.2" fill="currentColor" />
    </svg>
  ),
  grid: (
    <svg {...common}>
      <rect x="6" y="6" width="8" height="8" />
      <rect x="17" y="6" width="8" height="8" />
      <rect x="28" y="6" width="4" height="4" />
      <rect x="6" y="17" width="8" height="8" />
      <rect x="17" y="17" width="8" height="8" fill="currentColor" opacity="0.35" />
      <rect x="6" y="28" width="8" height="4" />
    </svg>
  ),
  merge: (
    <svg {...common}>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <rect x="22" y="6" width="12" height="12" rx="2" />
      <rect x="14" y="22" width="12" height="12" rx="2" fill="currentColor" opacity="0.35" />
    </svg>
  ),
  mole: (
    <svg {...common}>
      <path d="M8 26c0-8 5-14 12-14s12 6 12 14" />
      <line x1="4" y1="26" x2="36" y2="26" />
      <circle cx="16" cy="18" r="1.4" fill="currentColor" />
      <circle cx="24" cy="18" r="1.4" fill="currentColor" />
    </svg>
  ),
  cards: (
    <svg {...common}>
      <rect x="6" y="10" width="14" height="20" rx="2" />
      <rect x="20" y="10" width="14" height="20" rx="2" />
      <path d="M13 17v6M27 17v6" />
    </svg>
  ),
  runner: (
    <svg {...common}>
      <circle cx="24" cy="8" r="3" />
      <path d="M22 12l-6 6 2 10M22 12l7 3-2 7M16 18l-6 4M22 22l-3 8" />
    </svg>
  ),
  keyboard: (
    <svg {...common}>
      <rect x="5" y="11" width="30" height="18" rx="2" />
      <path d="M10 17h.01M16 17h.01M22 17h.01M28 17h.01M13 23h14" />
    </svg>
  ),
}

export default function CabinetIcon({ name }) {
  return icons[name] ?? icons.bolt
}
