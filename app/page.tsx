import { LoggedHome } from "@/components/logged-home";
import { getCurrentUser } from "@/lib/auth/server";
import Image from "next/image";

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
              <span>01</span>
              <h3>맡길 때마다 반복되는 정보 전달</h3>
              <p>호텔, 유치원, 병원, 지인에게 맡길 때마다 성격, 알레르기, 식사, 산책 습관을 다시 설명해야 해요.</p>
            </article>
            <article>
              <span>02</span>
              <h3>이름표와 내장칩 사이의 정보 공백</h3>
              <p>목걸이에는 전화번호 정도만 적을 수 있고, 내장칩은 발견자가 바로 확인하기 어려워요.</p>
            </article>
            <article>
              <span>03</span>
              <h3>실종 순간, 새로 만들 시간이 없음</h3>
              <p>잃어버린 뒤에 사진을 찾고 특징과 연락처를 정리해 실종 글을 만들기엔 너무 늦어요.</p>
            </article>
            <article>
              <span>04</span>
              <h3>제보가 여러 곳에 흩어짐</h3>
              <p>전화, 문자, SNS 댓글로 들어오는 목격 정보가 흩어져 이동 경로를 파악하기 어려워요.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="landing-band solution-band" aria-labelledby="solution-title">
        <div className="landing-inner split-section">
          <div>
            <p className="section-kicker">Solution</p>
            <h2 id="solution-title">돌봄용과 실종용 이름표 링크를 따로 만들어요.</h2>
            <p>공개할 정보만 골라 담고, QR로 저장하거나 목걸이와 스티커에 붙여 공유할 수 있어요.</p>
          </div>
          <div className="solution-list">
            <span>사진 최대 7장</span>
            <span>성격과 주의사항</span>
            <span>동물등록번호</span>
            <span>건강 정보</span>
            <span>보호자 연락처</span>
          </div>
        </div>
      </section>

      <section className="landing-band preview-band" id="preview" aria-labelledby="preview-title">
        <div className="landing-inner preview-layout">
          <div>
            <p className="section-kicker">Preview</p>
            <h2 id="preview-title">공유 페이지와 QR을 함께 확인해요.</h2>
            <p>산책 중 목줄 QR, 펫시터 돌봄 정보 공유, 유치원 친구 등록, 실종 시 바로 연락 유도까지 한 링크로 준비해요.</p>
          </div>
          <div className="preview-stack" aria-label="이름표 공유 화면 예시">
            <article className="share-preview-card">
              <div className="preview-photo">초코</div>
              <b>초코를 찾고 있어요</b>
              <p>낯선 사람을 무서워해요. 천천히 다가와 주세요.</p>
              <span>보호자에게 연락하기</span>
            </article>
            <div className="qr-preview-card">
              <div className="qr-dots" aria-hidden />
              <strong>QR 이름표</strong>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-band trust-band" aria-labelledby="trust-title">
        <div className="landing-inner">
          <p className="section-kicker">Trust</p>
          <h2 id="trust-title">필요한 정보만, 필요한 상황에서만 보여줘요.</h2>
          <div className="trust-grid">
            <p>공개할 정보만 선택할 수 있어요.</p>
            <p>돌봄용/실종용 링크를 따로 만들 수 있어요.</p>
            <p>보호자 연락처는 필요한 상황에서만 보여줄 수 있어요.</p>
            <p>언제든 이름표 링크를 수정하거나 비공개로 바꿀 수 있어요.</p>
          </div>
          <a className="final-cta" href="/login">무료로 우리 아이 이름표 만들기</a>
        </div>
      </section>
    </main>
  );
}

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) return <GuestHome />;

  const userName = user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "보호자";
  return <LoggedHome userId={user.id} userName={userName} />;
}
