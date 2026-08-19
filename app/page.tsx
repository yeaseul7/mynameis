import Image from "next/image";
import Link from "next/link";
import { LandingScrollMotion } from "@/components/landing-scroll-motion";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mynameis.life";

function LandingStructuredData() {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "WebApplication", name: "mynameis", url: siteUrl, applicationCategory: "LifestyleApplication", operatingSystem: "Web", description: "반려견의 돌봄 정보와 실종 정보를 하나의 QR 이름표로 준비하고 공유하는 서비스입니다.", offers: { "@type": "Offer", price: "0", priceCurrency: "KRW" } }) }} />;
}

export function GuestHome() {
  return (
    <main className="minimal-landing">
      <LandingStructuredData />
      <LandingScrollMotion />

      <section className="minimal-hero">
        <div className="minimal-hero-copy">
          <p className="minimal-kicker">반려견을 위한 디지털 이름표</p>
          <h1>우리 아이의 정보를<br />하나의 이름표에.</h1>
          <p>돌봄 정보부터 실종 연락까지.<br />링크와 QR로 바로 공유하세요.</p>
          <Link className="minimal-cta" href="/login">무료로 이름표 만들기 <span aria-hidden="true">›</span></Link>
          <small>3분이면 완성 · 설치 없이 바로 공유 · 무료 시작</small>
        </div>
        <div className="minimal-hero-product">
          <div className="minimal-product-glow" aria-hidden="true" />
          <div className="minimal-phone">
            <Image src="/landing-earlys-profile-600.jpg" alt="반려견 얼리의 디지털 이름표 화면" width={600} height={1021} priority fetchPriority="high" />
          </div>
        </div>
      </section>

      <section className="minimal-showcase">
        <div className="minimal-heading scroll-reveal">
          <p>필요한 순간, 바로.</p>
          <h2>맡길 때도.<br />혹시 잃어버렸을 때도.</h2>
          <span>필요한 정보가 정확한 사람에게 바로 닿습니다.</span>
        </div>
        <div className="minimal-screen-stage">
          <div className="minimal-screen lost-screen"><Image src="/landing-lost-share-preview-600.jpg" alt="반려견 실종 정보 공유 화면" width={600} height={1021} /></div>
          <div className="minimal-screen main-screen"><Image src="/landing-share-page-preview-600.jpg" alt="반려견 돌봄 정보 공유 화면" width={600} height={1137} /></div>
          <div className="minimal-screen report-screen"><Image src="/landing-lost-info-preview-600.jpg" alt="반려견 목격 위치 제보 화면" width={600} height={980} /></div>
        </div>
      </section>

      <section className="minimal-uses">
        <article className="minimal-use-card care-use scroll-reveal reveal-left">
          <div><p>돌봄 정보</p><h2>말로 설명하던 모든 것을<br />한눈에.</h2><span>식사, 알레르기, 산책 습관과 병원 정보를 필요한 만큼만 공유하세요.</span></div>
          <Image src="/landing-share-page-preview-600.jpg" alt="돌봄 정보 페이지 예시" width={600} height={1137} />
        </article>
        <article className="minimal-use-card lost-use scroll-reveal reveal-right">
          <div><p>실종 정보</p><h2>발견한 사람이<br />바로 연락할 수 있게.</h2><span>사진과 특징, 보호자 연락처를 미리 준비하고 위치 제보를 한곳에서 확인하세요.</span></div>
          <Image src="/landing-lost-share-preview-600.jpg" alt="실종 정보 페이지 예시" width={600} height={1021} />
        </article>
      </section>

      <section className="minimal-qr">
        <div className="minimal-qr-copy scroll-reveal reveal-left">
          <p>링크로 보내고. QR로 곁에.</p>
          <h2>내용이 바뀌어도<br />이름표는 그대로.</h2>
          <span>휴대폰으로 공유하거나 QR을 저장해 키링과 스티커로 활용하세요.</span>
        </div>
        <div className="minimal-qr-products scroll-reveal reveal-right">
          <Image className="minimal-keyring" src="/landing-keyring-qr.png" alt="QR 키링 예시" width={520} height={520} />
          <Image className="minimal-sticker" src="/landing-sticker-qr.png" alt="QR 스티커 예시" width={1280} height={1280} />
        </div>
      </section>

      <section className="minimal-final scroll-reveal">
        <p>우리 아이를 위한 작은 준비.</p>
        <h2>다정한 이름표를<br />지금 만들어보세요.</h2>
        <Link className="minimal-cta" href="/login">무료로 시작하기 <span aria-hidden="true">›</span></Link>
      </section>

      <footer className="guest-footer"><div className="landing-inner"><Link href="/" aria-label="mynameis 홈"><Image src="/mynameis-logo-240.png" alt="mynameis" width={82} height={28} /></Link><nav aria-label="하단 링크"><a href="/terms">이용약관</a><a href="/privacy">개인정보처리방침</a><a href="mailto:sientobiz@gmail.com">문의하기</a></nav><p>© mynameis</p></div></footer>
    </main>
  );
}

export default GuestHome;
