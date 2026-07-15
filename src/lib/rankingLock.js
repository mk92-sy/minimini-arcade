/**
 * 한국시간(KST) 23:00~24:00(자정 전) 사이인지 확인합니다.
 * 이 시간대엔 그날의 랭킹을 집계 중이라 등록이 막혀있어요 (서버 트리거가 최종 강제,
 * 여기서는 버튼을 미리 숨기기 위한 클라이언트 사이드 체크일 뿐).
 * KST는 서머타임이 없는 고정 UTC+9라서 UTC 시각만으로 판단할 수 있어요.
 */
export function isRankingLocked(date = new Date()) {
  return date.getUTCHours() === 14 // UTC 14:xx = KST 23:xx
}
