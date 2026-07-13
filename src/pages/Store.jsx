import ComingSoon from '../components/common/ComingSoon.jsx'
import { IconStore } from '../components/common/icons.jsx'

export default function Store() {
  return (
    <ComingSoon
      icon={<IconStore width="36" height="36" />}
      title="상점"
      message="코인으로 뱃지·아이템을 구매하는 상점이 곧 열려요. 조금만 기다려주세요!"
    />
  )
}
