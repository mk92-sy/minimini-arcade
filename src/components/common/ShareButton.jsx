import { useState } from "react";
import { isKakaoConfigured, shareToKakao } from "../../lib/kakao.js";
import { IconCheck, IconFacebook, IconKakao, IconLink, IconShare, IconX } from "./icons.jsx";

/**
 * 공용 SNS 공유 버튼 묶음. 아이콘만 사용하고, 카카오톡은 따로 분리해서 강조.
 * - 카카오톡: Kakao SDK로 실제 공유 카드 전송 (VITE_KAKAO_JS_KEY 필요)
 * - 공유하기: Web Share API (모바일 시스템 공유 시트)
 * - X / Facebook: 공식 공유 인텐트 링크
 * - 링크 복사: 클립보드 복사
 */
export default function ShareButton({ title, text, url }) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url ?? (typeof window !== "undefined" ? window.location.href : "");
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;
  const kakaoReady = isKakaoConfigured();

  const handleKakaoShare = async () => {
    try {
      await shareToKakao({ title, text, url: shareUrl });
    } catch (err) {
      console.warn(err);
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({ title, text, url: shareUrl });
    } catch {
      // 사용자가 공유를 취소한 경우 등은 무시
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // 클립보드 접근이 막힌 환경에서는 조용히 무시
    }
  };

  const twitterHref = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
  const facebookHref = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="share">
      <p className="share__label">결과 공유하기</p>
      <div className="share__row">
        <div className="share__buttons">
          {canNativeShare && (
            <button
              type="button"
              className="share__icon-button"
              onClick={handleNativeShare}
              aria-label="공유하기"
              title="공유하기"
            >
              <IconShare />
            </button>
          )}
          <button
            type="button"
            className="share__icon-button"
            onClick={handleKakaoShare}
            disabled={!kakaoReady}
            aria-label="카카오톡 공유"
            title={kakaoReady ? "카카오톡 공유" : "카카오톡 공유 (VITE_KAKAO_JS_KEY 설정 필요)"}
          >
            <IconKakao />
          </button>
          <a
            className="share__icon-button"
            href={twitterHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="X(트위터) 공유"
            title="X(트위터) 공유"
          >
            <IconX />
          </a>
          <a
            className="share__icon-button"
            href={facebookHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook 공유"
            title="Facebook 공유"
          >
            <IconFacebook />
          </a>
          <button
            type="button"
            className="share__icon-button"
            onClick={handleCopy}
            aria-label="링크 복사"
            title="링크 복사"
          >
            {copied ? <IconCheck /> : <IconLink />}
          </button>
        </div>
      </div>
    </div>
  );
}
