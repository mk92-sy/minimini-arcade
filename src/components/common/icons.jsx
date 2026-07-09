export function IconHeart({ filled = false, ...props }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}>
      <path
        d="M12 20.3 4.7 13.3C2.1 10.8 2.4 6.9 5.2 4.9c2.3-1.6 5.1-1 6.8 1 1.7-2 4.5-2.6 6.8-1 2.8 2 3.1 5.9.5 8.4L12 20.3Z"
        fill={filled ? '#EF476F' : 'none'}
        stroke={filled ? '#EF476F' : 'currentColor'}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function IconUsers(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <path d="M15.5 4.2c1.5.4 2.5 1.8 2.5 3.3 0 1.6-1.1 3-2.6 3.4" />
      <path d="M17 14.2c2.3.5 4 2.6 4 5.1" />
    </svg>
  )
}

export function IconGoogle(props) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" {...props}>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.9-3c-1.1.7-2.4 1.1-4 1.1-3.1 0-5.7-2.1-6.6-4.9H1.4v3.1C3.4 21.4 7.4 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.4 14.3c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3V6.6H1.4A12 12 0 0 0 0 12c0 1.9.5 3.8 1.4 5.4l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.7 0 3.3.6 4.5 1.8l3.4-3.4C17.9 1.2 15.2 0 12 0 7.4 0 3.4 2.6 1.4 6.6l4 3.1c.9-2.8 3.5-4.9 6.6-4.9Z"
      />
    </svg>
  )
}

export function IconKakao(props) {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true" {...props}>
      <rect width="32" height="32" rx="9" fill="#FEE500" />
      <path
        fill="#391B1B"
        d="M16 8c-5.5 0-10 3.5-10 7.8 0 2.8 1.9 5.2 4.7 6.6-.2.8-.8 2.9-.9 3.3-.1.5.2.5.4.4.2-.1 2.9-2 3.7-2.5.6.1 1.3.1 2.1.1 5.5 0 10-3.5 10-7.9S21.5 8 16 8Z"
      />
    </svg>
  )
}

export function IconX(props) {
  return (
    <svg viewBox="0 0 32 32" width="20" height="20" aria-hidden="true" {...props}>
      <rect width="32" height="32" rx="9" fill="#000000" />
      <path
        fill="#ffffff"
        d="M8.6 8h3.4l4 5.4L20.6 8H23l-5.9 6.9L23.4 24H20l-4.3-5.8L10.6 24H8.2l6.2-7.2L8.6 8Z"
      />
    </svg>
  )
}

export function IconFacebook(props) {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true" {...props}>
      <circle cx="16" cy="16" r="16" fill="#1877F2" />
      <path
        fill="#ffffff"
        d="M18.5 12h2.3V8.7h-2.3c-2.4 0-4.2 1.8-4.2 4.2V15h-2.1v3.3h2.1V27h3.4v-8.7h2.6l.4-3.3h-3v-1.7c0-.7.4-1.3 1.8-1.3Z"
      />
    </svg>
  )
}

export function IconShare(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M12 3v12" />
      <path d="M8 7l4-4 4 4" />
      <rect x="4" y="13" width="16" height="7" rx="2" />
    </svg>
  )
}

export function IconLink(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M9 15l6-6" />
      <path d="M11 6l1-1a4 4 0 0 1 6 6l-1 1" />
      <path d="M13 18l-1 1a4 4 0 0 1-6-6l1-1" />
    </svg>
  )
}

export function IconCheck(props) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}
