import ComingSoon from '../components/common/ComingSoon.jsx'
import { IconBell } from '../components/common/icons.jsx'

export default function Notifications() {
  return (
    <ComingSoon
      icon={<IconBell width="36" height="36" />}
      title="알림"
      message="랭킹 갱신, 코인 지급 같은 소식을 모아보는 알림 기능은 업데이트 예정이에요."
    />
  )
}
