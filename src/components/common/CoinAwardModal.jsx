import { useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { COIN_AWARD_LABELS, watchAdAndClaimBonus } from '../../lib/coins.js'
import { IconCoin } from './icons.jsx'
import ConfettiBurst from './ConfettiBurst.jsx'

const CONGRATS_COMMENTS = [
  '역대급 기록이에요! 오늘 컨디션 최고인가 봐요 🔥',
  '방금 자신을 넘어섰어요. 대단해요!',
  '와, 신기록 경신! 이 기세 계속 가봐요.',
  '지금이 당신의 최고 순간이에요 ✨',
]

export default function CoinAwardModal() {
  const { coinAward, closeCoinAward, addBonusCoinAward } = useAuth()
  const [adStatus, setAdStatus] = useState('idle') // idle | watching | claimed | error

  // 코멘트는 모달이 새로 열릴 때만 한 번 뽑히도록(재렌더링마다 안 바뀌게) useMemo로 고정
  const congratsComment = useMemo(
    () => CONGRATS_COMMENTS[Math.floor(Math.random() * CONGRATS_COMMENTS.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [coinAward?.gameId, coinAward?.isNewRecord],
  )

  if (!coinAward) return null

  const { awards, total, gameId, isNewRecord, rank, rankTotal } = coinAward
  const alreadyGotAdBonus = awards.some((a) => a.award_type === 'ad_bonus')
  const percentile = rank && rankTotal ? Math.max(1, Math.round((rank / rankTotal) * 100)) : null

  const handleWatchAd = async () => {
    if (!gameId) return
    setAdStatus('watching')
    const { award, error } = await watchAdAndClaimBonus(gameId)
    if (error || !award) {
      setAdStatus('error')
      return
    }
    addBonusCoinAward(award)
    setAdStatus('claimed')
  }

  const handleClose = () => {
    setAdStatus('idle')
    closeCoinAward()
  }

  return (
    <div className="dialog__overlay" role="presentation" onClick={handleClose}>
      <div
        className="dialog__panel coin-modal"
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {isNewRecord && <ConfettiBurst />}

        {isNewRecord && (
          <>
            <p className="coin-modal__new-record">🎉 NEW RECORD!</p>
            <p className="coin-modal__congrats">{congratsComment}</p>
          </>
        )}

        <div className="coin-modal__icon">
          <IconCoin width="36" height="36" />
        </div>
        <h2 className="dialog__title coin-modal__title">코인 +{total}</h2>

        {awards.length > 0 && (
          <ul className="coin-modal__list">
            {awards.map((a, i) => (
              <li key={`${a.award_type}-${i}`} className="coin-modal__item">
                <span>{COIN_AWARD_LABELS[a.award_type] ?? a.award_type}</span>
                <span className="coin-modal__amount">+{a.amount}</span>
              </li>
            ))}
          </ul>
        )}

        {rank && rankTotal && (
          <p className="coin-modal__rank-preview">
            현재 예상 순위 <strong>{rank}위</strong> · 전체 <strong>{rankTotal}명</strong> 중 상위{' '}
            <strong>{percentile}%</strong>
          </p>
        )}

        {gameId && !alreadyGotAdBonus && adStatus !== 'claimed' && (
          <div className="coin-modal__ad-block">
            <button
              type="button"
              className="coin-modal__ad-button"
              onClick={handleWatchAd}
              disabled
              title="광고 SDK 연동 준비 중이에요"
            >
              📺 광고 보고 +2코인 받기 (준비 중)
            </button>
            {adStatus === 'error' && (
              <p className="coin-modal__ad-error">광고 보너스를 받지 못했어요. 잠시 후 다시 시도해주세요.</p>
            )}
          </div>
        )}

        <div className="dialog__actions">
          <button type="button" className="dialog__button dialog__button--primary" onClick={handleClose}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}
