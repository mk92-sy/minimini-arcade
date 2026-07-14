import ComingSoon from '../components/common/ComingSoon.jsx'
import { IconBell } from '../components/common/icons.jsx'
import usePageTitle from '../hooks/usePageTitle.js'

export default function Notifications() {
  usePageTitle('알림')
  return (
    <div className="hub hub--single">
      <ComingSoon
        icon={<IconBell width="36" height="36" />}
        title="알림"
        message="랭킹 갱신, 코인 지급 같은 소식을 모아보는 알림 기능은 업데이트 예정이에요."
      />
    </div>
  )
}
