"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

const previews = [
  {
    src: "/landing-share-page-preview.jpeg",
    alt: "돌봄 공유 페이지 미리보기",
    width: 1080,
    height: 1920,
  },
  {
    src: "/landing-lost-share-preview.jpg",
    alt: "실종 공유 페이지 미리보기",
    width: 1205,
    height: 2048,
  },
  {
    src: "/landing-lost-info-preview-v2.png",
    alt: "실종 위치와 제보 정보 미리보기",
    width: 860,
    height: 1404,
  },
  {
    src: "/landing-qr-preview.png",
    alt: "QR 이름표 미리보기",
    width: 990,
    height: 1266,
  },
];

function getOffset(index: number, activeIndex: number) {
  const raw = index - activeIndex;
  if (raw > previews.length / 2) return raw - previews.length;
  if (raw < -previews.length / 2) return raw + previews.length;
  return raw;
}

export function LandingPreviewCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % previews.length);
    }, 3500);

    return () => window.clearInterval(timer);
  }, []);

  function move(direction: -1 | 1) {
    setActiveIndex((current) => (current + direction + previews.length) % previews.length);
  }

  return (
    <div className="preview-carousel" aria-label="이름표 공유 화면 예시">
      <div className="preview-carousel-stage">
        {previews.map((preview, index) => {
          const offset = getOffset(index, activeIndex);
          const isActive = offset === 0;
          return (
            <button
              className="preview-carousel-item"
              data-active={isActive}
              data-offset={offset}
              key={preview.src}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`${preview.alt} 보기`}
              aria-current={isActive}
            >
              <Image src={preview.src} alt={preview.alt} width={preview.width} height={preview.height} />
            </button>
          );
        })}
      </div>
      <button className="preview-carousel-nav previous" type="button" onClick={() => move(-1)} aria-label="이전 미리보기">‹</button>
      <button className="preview-carousel-nav next" type="button" onClick={() => move(1)} aria-label="다음 미리보기">›</button>
    </div>
  );
}
