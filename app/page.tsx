import { LoggedHome } from "@/components/logged-home";
import { LandingPreviewCarousel } from "@/components/landing-preview-carousel";
import { getCurrentUser } from "@/lib/auth/server";
import Image from "next/image";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mynameis.life";

function LandingStructuredData() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "mynameis",
    url: siteUrl,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Web",
    description: "반려견의 돌봄 정보와 실종 정보를 QR 이름표 링크 하나로 준비하고 공유하는 서비스입니다.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "KRW",
    },
  };

  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />;
}

function NameTagIllustration() {
  return (
    <div className="guest-visual" aria-label="얼리의 이름표 미리보기">
      <div className="mobile-preview-frame">
        <Image
          src="/landing-earlys-profile.jpeg"
          alt="얼리의 모바일 이름표 예시 화면"
          width={1206}
          height={2052}
          priority
        />
      </div>
    </div>
  );
}

function GuestHome() {
  return (
    <main className="guest-page">
      <LandingStructuredData />
      <section className="guest-home">
        <NameTagIllustration />
        <div className="guest-copy">
          <Image className="guest-hero-logo" src="/mynameis-logo.png" alt="mynameis" width={92} height={31} priority />
          <h1>맡길 때도,<br />잃어버렸을 때도<br />바로 정보가 닿아요.</h1>
          <p className="guest-lead">반려견 정보를 담은 이름표 링크를 만들고 QR로 공유해요.</p>
          <div className="guest-actions">
            <a className="guest-primary-cta" href="/login">우리 아이만의 QR 만들기</a>
          </div>
        </div>
      </section>

      <section className="landing-band problem-band" aria-labelledby="problem-title">
        <div className="landing-inner">
          <h2 className="problem-title" id="problem-title">반려동물 정보가 필요한 모든 순간에</h2>
          <Image className="problem-moment-icon" src="/problem-moment-icon.png" alt="" width={240} height={240} />
          <div className="insight-grid">
            <article>
              <Image className="problem-card-icon" src="/problem-icon-handoff.png" alt="" width={120} height={120} />
              <h3>맡길 때마다 반복되는 정보 전달</h3>
              <p>호텔, 유치원, 병원, 지인에게 맡길 때마다<br />성격, 알레르기, 식사, 산책 습관을 다시 설명해야 해요.</p>
            </article>
            <article>
              <Image className="problem-card-icon" src="/problem-icon-tag.png" alt="" width={120} height={120} />
              <h3>이름표와 내장칩 사이의 정보 공백</h3>
              <p>목걸이에는 전화번호 정도만 적을 수 있고,<br />내장칩은 발견자가 바로 확인하기 어려워요.</p>
            </article>
            <article>
              <Image className="problem-card-icon" src="/problem-icon-lost.png" alt="" width={120} height={120} />
              <h3>실종 순간, 새로 만들 시간이 없음</h3>
              <p>잃어버린 뒤에 사진을 찾고 특징과 연락처를 정리해 실종 글을 만들기엔 너무 늦어요.</p>
            </article>
            <article>
              <Image className="problem-card-icon" src="/problem-icon-map.png" alt="" width={120} height={120} />
              <h3>제보가 여러 곳에 흩어짐</h3>
              <p>전화, 문자, SNS 댓글로 들어오는 목격 정보가 흩어져<br />이동 경로를 파악하기 어려워요.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-band solution-band" aria-labelledby="solution-title">
        <div className="landing-inner split-section">
          <div className="solution-keyring-visual">
            <Image className="solution-keyring-image" src="/landing-keyring-qr.png" alt="QR 키링 예시" width={520} height={520} />
            <Image className="solution-sticker-image" src="/landing-sticker-qr.png" alt="QR 스티커 예시" width={1280} height={1280} />
          </div>
          <div>
            <h2 id="solution-title">돌봄용 링크와 QR 그리고<br />실종용 링크와 QR을<br />쉽게 만들고 공유해요</h2>
            <p>QR로 저장해서 공유하거나 스티커로 제작하거나 키링으로 제작할 수 있어요.</p>
          </div>
        </div>
      </section>

      <section className="landing-band preview-band" id="preview" aria-labelledby="preview-title">
        <div className="landing-inner preview-layout">
          <div>
            <h2 id="preview-title">상황에 맞는 공유 페이지를 준비해요.</h2>
            <p>기본 프로필부터 돌봄 정보, 실종 정보까지 필요한 내용만 골라 QR과 링크로 공유할 수 있어요.</p>
          </div>
          <LandingPreviewCarousel />
        </div>
      </section>

      <section className="landing-band trust-band">
        <div className="landing-inner">
          <a className="final-cta" href="/login">무료로 우리 아이 이름표 만들기</a>
        </div>
      </section>

      <footer className="guest-footer">
        <div className="landing-inner">
          <Image src="/mynameis-logo.png" alt="mynameis" width={82} height={28} />
          <nav aria-label="하단 링크">
            <a href="/terms">이용약관</a>
            <a href="/privacy">개인정보처리방침</a>
            <a href="mailto:sientobiz@gmail.com">문의하기</a>
          </nav>
          <p>© mynameis. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) return <GuestHome />;

  const userName = user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "보호자";
  return <LoggedHome userId={user.id} userName={userName} />;
}
