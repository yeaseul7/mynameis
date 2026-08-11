import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import QRCode from "qrcode";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const isSample = slug === "sample";
  return {
    title: isSample ? "얼리의 이름표" : `${slug}의 이름표`,
    description: "반려동물의 돌봄 및 보호자 연락 정보를 확인하세요.",
    alternates: { canonical: `/share/${slug}` },
    openGraph: { title: isSample ? "얼리의 이름표 | mynameis" : `${slug}의 이름표 | mynameis`, description: "우리 아이의 돌봄 정보를 확인하세요.", url: `/share/${slug}` },
  };
}

export default async function SharedProfile({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ mode?: string; view?: string }> }) {
  const { slug } = await params;
  const { mode = "care", view } = await searchParams;

  if (view === "qr") {
    const requestHeaders = await headers();
    const host = requestHeaders.get("host") ?? "localhost:3004";
    const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const shareUrl = `${protocol}://${host}/share/${slug}?mode=${mode === "lost" ? "lost" : "care"}`;
    const qrImage = await QRCode.toDataURL(shareUrl, { width: 360, margin: 2, errorCorrectionLevel: "H", color: { dark: "#3F392F", light: "#FFFFFF" } });
    const isLost = mode === "lost";

    return (
      <div className="shared-page qr-page">
        <section className="qr-card">
          <span>{isLost ? "실종 이름표" : "관리 이름표"}</span>
          <h1>{isLost ? "실종 QR" : "관리 QR"}</h1>
          <p>휴대폰 카메라로 스캔하면 공유 페이지가 열립니다.</p>
          {/* QR 생성 결과는 data URL이므로 Next Image 최적화 대상에서 제외합니다. */}
          <img src={qrImage} alt={`${isLost ? "실종" : "관리"} 공유 QR 코드`} width="360" height="360" />
          <Link href={`/share/${slug}?mode=${isLost ? "lost" : "care"}`}>공유 페이지 확인</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="shared-page">
      <section className="shared-profile">
        <div className="share-brand"><Image className="wordmark-logo" src="/mynameis-logo.png" alt="mynameis" width={96} height={33} /></div>
        <div className="large-avatar">🐶</div>
        <div className="public-badge">🌎 친구들에게 보여주는 이름표</div>
        <h1>{slug === "sample" ? "안녕! 나는 얼리야" : `안녕! 나는 ${slug}야`}</h1>
        <p>포메라니안 · 3살 · 여아<br />사람을 좋아하지만 갑자기 안으면 놀랄 수 있어요.</p>
        <div className="care-note">
          <strong>📌 꼭 확인해 주세요</strong>
          <p><span>🥜</span> 닭고기 알레르기가 있어요</p>
          <p><span>💊</span> 저녁 7시에 영양제를 먹어요</p>
        </div>
        <div className="shared-links">
          <a className="guardian" href="tel:01000000000">보호자에게 연락하기 <span>→</span></a>
          <a href="mailto:hello@example.com">문자로 발견 장소 보내기 <span>→</span></a>
        </div>
        <p className="privacy-note">공개가 허용된 정보만 표시하고 있어요.</p>
        <Link className="made-with" href="/">made with <b>mynameis</b> 🐣</Link>
      </section>
    </div>
  );
}
