import { useState } from 'react'
import { useAuth } from '../../context/AuthContext.jsx'
import { COIN_AWARD_LABELS, watchAdAndClaimBonus } from '../../lib/coins.js'
import { IconCoin } from './icons.jsx'

export default function CoinAwardModal() {
  const { coinAward, closeCoinAward, addBonusCoinAward } = useAuth()
  const [adStatus, setAdStatus] = useState('idle') // idle | watching | claimed | error

  if (!coinAward) return null

  const { awards, total, gameId } = coinAward
  const alreadyGotAdBonus = awards.some((a) => a.award_type === 'ad_bonus')

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
        <div className="coin-modal__icon">
          <IconCoin width="36" height="36" />
        </div>
        <h2 className="dialog__title coin-modal__title">코인 +{total}</h2>
        <ul className="coin-modal__list">
          {awards.map((a, i) => (
            <li key={`${a.award_type}-${i}`} className="coin-modal__item">
              <span>{COIN_AWARD_LABELS[a.award_type] ?? a.award_type}</span>
              <span className="coin-modal__amount">+{a.amount}</span>
            </li>
          ))}
        </ul>

        {gameId && !alreadyGotAdBonus && adStatus !== 'claimed' && (
          <div className="coin-modal__ad-block">
            <button
              type="button"
              className="coin-modal__ad-button"
              onClick={handleWatchAd}
              disabled={adStatus === 'watching'}
            >
              {adStatus === 'watching' ? '광고 재생 중...' : '📺 광고 보고 +2코인 받기'}
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
