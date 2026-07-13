export default function GameShell({ tint = '#ffb703', wide = false, children }) {
  return (
    <div className="hub" style={{ '--tint': tint }}>
      <div className={`game-shell__body${wide ? ' game-shell__body--wide' : ''}`}>{children}</div>
    </div>
  )
}
