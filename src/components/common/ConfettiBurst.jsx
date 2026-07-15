import Lottie from 'lottie-react'
import confettiAnimation from '../../assets/confettiAnimation.json'

/**
 * 모달 안에서 터지는 폭죽 애니메이션. 절대 위치로 부모(모달 패널) 위에 덮어 씌워지고,
 * 클릭을 가로채지 않도록 pointer-events는 꺼둡니다. 한 번 재생하고 멈춥니다.
 */
export default function ConfettiBurst() {
  return (
    <div className="confetti-burst" aria-hidden="true">
      <Lottie animationData={confettiAnimation} loop={false} autoplay />
    </div>
  )
}
