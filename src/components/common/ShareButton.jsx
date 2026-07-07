import { useState } from 'react'

/**
 * 공용 SNS 공유 버튼 묶음.
 * 모바일에서는 Web Share API(공유하기)로 시스템 공유 시트를 띄우고,
 * 데스크톱 등 지원 안 되는 환경에서는 X / Facebook 링크 + 링크 복사로 대체.
 */
export default function ShareButton({ title, text, url }) {
  const [copied, setCopied] = useState(false)
  const shareUrl = url ?? (typeof window !== 'undefined' ? window.location.href : '')
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text, url: shareUrl })
    } catch {
      // 사용자가 공유를 취소한 경우 등은 무시
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // 클립보드 접근이 막힌 환경에서는 조용히 무시
    }
  }

  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`

  return (
    <div className="share">
      <p className="share__label">결과 공유하기</p>
      <div className="share__buttons">
        {canNativeShare && (
          <button type="button" className="share__button share__button--primary" onClick={handleNativeShare}>
            공유하기
          </button>
        )}
        <a className="share__button" href={twitterHref} target="_blank" rel="noopener noreferrer">
          X(Twitter)
        </a>
        <a className="share__button" href={facebookHref} target="_blank" rel="noopener noreferrer">
          Facebook
        </a>
        <button type="button" className="share__button" onClick={handleCopy}>
          {copied ? '복사됨!' : '링크 복사'}
        </button>
      </div>
    </div>
  )
}
