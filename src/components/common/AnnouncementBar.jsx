import { useState } from "react";
import useAnnouncements from "../../hooks/useAnnouncements.js";

export default function AnnouncementBar() {
  const items = useAnnouncements();
  const [index, setIndex] = useState(0);
  const [playCount, setPlayCount] = useState(0);

  if (items.length === 0) return null;

  // 공지가 1개뿐이면 애니메이션 없이 계속 고정 노출
  const isSingle = items.length === 1;
  const current = items[index % items.length];

  const handleAnimationEnd = () => {
    // 다음 공지로 넘어가면서 playCount도 같이 올려서, key가 항상 바뀌어
    // 애니메이션이 매번 처음부터 재생되도록 함.
    setIndex((i) => (i + 1) % items.length);
    setPlayCount((p) => p + 1);
  };

  return (
    <div className="announce-bar" role="status" aria-live="polite">
      <span className="announce-bar__tag">공지</span>
      <div className="announce-bar__viewport">
        {isSingle ? (
          <p className="announce-bar__item announce-bar__item--static">{current.message}</p>
        ) : (
          <p key={`${index}-${playCount}`} className="announce-bar__item" onAnimationEnd={handleAnimationEnd}>
            {current.message}
          </p>
        )}
      </div>
    </div>
  );
}
