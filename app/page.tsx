import { LoginForm } from "@/components/login-form";
import { SocialLoginPanel } from "@/components/social-login-panel";
import { getHomeMode } from "@/lib/home-mode";
import { LoggedHome } from "@/components/logged-home";
import { getCurrentUser } from "@/lib/auth/server";
import Link from "next/link";

function NameTagIllustration() {
  return (
    <div className="guest-visual" aria-label="얼리의 이름표 미리보기">
      <div className="name-tag-object" aria-hidden>
        <div className="tag-ring" />
        <div className="tag-tape" />
        <div className="tag-face">🐶</div>
        <div className="tag-title">안녕! 나는 초코야</div>
        <div className="tag-grid">
          <i className="tag-tile yellow">사진</i>
          <i className="tag-tile peach">주의</i>
          <i className="tag-tile green">건강</i>
          <i className="tag-tile blue">연락</i>
        </div>
        <div className="tag-tail" />
      </div>
      <div className="guest-bubble bubble-care">돌봄용 링크</div>
      <div className="guest-bubble bubble-safe">실종용 QR</div>
    </div>
  );
}

function GuestHome() {
  const homeMode = getHomeMode();
  return (
    <main className="guest-page">
      <section className="guest-home">
        <NameTagIllustration />
        <div className="guest-copy">
          <p className="guest-eyebrow">반려견 보호자를 위한 QR 이름표</p>
          <h1>맡길 때도, 잃어버렸을 때도<br />우리 아이 정보가 바로 닿아요.</h1>
          <p className="guest-lead">사진, 성격, 주의사항, 건강 정보, 보호자 연락처를 담은 이름표 링크를 만들고 QR로 공유해요.</p>
          <div className="guest-actions">
            <Link className="guest-primary-cta" href="/pets/new">우리 아이만의 QR 만들기</Link>
            <a className="guest-secondary-cta" href="#preview">미리보기</a>
          </div>
          {homeMode === "tempmode" ? <SocialLoginPanel /> : <LoginForm variant="inline" />}
        </div>
      </section>

      <section className="landing-band problem-band" aria-labelledby="problem-title">
        <div className="landing-inner">
          <p className="section-kicker">Problem</p>
          <h2 id="problem-title">설명이 필요한 순간은 늘 갑자기 와요.</h2>
          <div className="insight-grid">
            <article>
              <span>01</span>
              <h3>잠깐 맡길 때마다 반복 설명</h3>
              <p>유치원, 펫시터, 호텔링에 맡길 때 성격과 주의사항을 매번 다시 말해야 해요.</p>
            </article>
            <article>
              <span>02</span>
              <h3>발견자가 연락처를 몰라요</h3>
              <p>혹시 잃어버리면 누구에게 연락해야 하는지 바로 알기 어려워요.</p>
            </article>
            <article>
              <span>03</span>
              <h3>실종 시 정보가 부족해요</h3>
              <p>사진, 동물등록번호, 건강 정보처럼 발견자에게 필요한 정보가 흩어져 있어요.</p>
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
          <Link className="final-cta" href="/pets/new">무료로 우리 아이 이름표 만들기</Link>
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
