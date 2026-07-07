// Vercel 서버리스 함수 (Node 런타임). 정적 Vite 빌드와 함께 /api 경로로 자동 배포됨.
// DEVTOOLS_ALLOWED_IPS는 VITE_ 접두사가 없어서 클라이언트 번들에 노출되지 않음 (서버 전용 env).
export default function handler(req, res) {
  const allowedIps = (process.env.DEVTOOLS_ALLOWED_IPS || '')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean)

  const forwardedFor = req.headers['x-forwarded-for']
  const rawIp = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  const clientIp = (rawIp || req.socket?.remoteAddress || '').split(',')[0].trim()

  const allowed = allowedIps.length > 0 && allowedIps.includes(clientIp)

  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ allowed })
}
