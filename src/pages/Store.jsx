import { useAuth } from '../context/AuthContext.jsx'
import ComingSoon from '../components/common/ComingSoon.jsx'
import { IconCoin, IconStore } from '../components/common/icons.jsx'
import usePageTitle from '../hooks/usePageTitle.js'

export default function Store() {
  usePageTitle('상점')
  const { isConfigured, user, coins, openAuthModal } = useAuth()

  return (
    <div className="hub hub--single">
      <div className="store-page">
        <div className="store-page__balance">
          <IconCoin width="28" height="28" />
          <div className="store-page__balance-text">
            <p className="store-page__balance-label">보유 코인</p>
            <p className="store-page__balance-value">
              {isConfigured && user ? coins.toLocaleString('ko-KR') : '-'}
            </p>
          </div>
          {isConfigured && !user && (
            <button type="button" className="store-page__login-button" onClick={openAuthModal}>
              로그인하고 확인하기
            </button>
          )}
        </div>

        <ComingSoon
          icon={<IconStore width="36" height="36" />}
          title="상점"
          message="코인으로 뱃지·아이템을 구매하는 상점이 곧 열려요. 조금만 기다려주세요!"
        />
      </div>
    </div>
  )
}
