"use client";

import Image from "next/image";
import Link from "next/link";
import { KeyboardEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getDogsByOwner } from "@/lib/pets/service";
import type { DogProfile } from "@/lib/dogs";
import type { DogPublicLinkType } from "@/lib/pets/types";

const actionIcons = {
  careLink: "/pet-actions/care-link.png",
  inviteCode: "/pet-actions/invite-code.png",
  lostLink: "/pet-actions/lost-link.png",
  careQr: "/pet-actions/care-qr.png",
  lostQr: "/pet-actions/lost-qr.png",
};

async function getPublicLinkToken(dogId: string, type: DogPublicLinkType) {
  const response = await fetch(`/api/dogs/${dogId}/public-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });
  if (!response.ok) throw new Error("Public link generation failed");
  const data = await response.json() as { token: string };
  return data.token;
}

function PetActionContent({ icon, label }: { icon: string; label: string }) {
  return (
    <>
      <span className="pet-action-icon" aria-hidden>
        <Image src={icon} alt="" width={34} height={34} />
      </span>
      <span>{label}</span>
    </>
  );
}

function EmptyPets() {
  return (
    <>
      <section className="home-section my-pets-section" id="my-pets">
        <h2>내 새꾸 <span aria-hidden>🐾</span></h2>
        <div className="pet-empty-card">
          <div className="empty-pet-visual" aria-hidden>🐶</div>
          <strong>아직 등록한 새꾸가 없어요</strong>
          <p>우리 아이의 프로필을 만들어볼까요?</p>
          <Link className="home-primary-cta" href="/pets/new">＋ 내 새꾸 등록하기</Link>
        </div>
      </section>
      <FriendSection empty />
    </>
  );
}

function CopyAlert({ message }: { message: string }) {
  if (!message) return null;
  return <div className="copy-alert" role="status" aria-live="polite">{message}</div>;
}

function PetCard({
  pet,
  index,
  onNotify,
}: {
  pet: DogProfile;
  index: number;
  onNotify: (message: string) => void;
}) {
  const router = useRouter();

  async function openProfilePage() {
    const token = await getPublicLinkToken(pet.id, "PROFILE");
    router.push(`/share/${token}`);
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void openProfilePage();
    }
  }

  async function copyShareLink(mode: "care" | "lost") {
    const token = await getPublicLinkToken(pet.id, mode === "care" ? "CARE" : "LOST");
    const url = new URL(`/share/${token}`, window.location.origin);
    await navigator.clipboard.writeText(url.toString());
    onNotify(mode === "care" ? "돌봄 링크를 복사했어요." : "실종 링크를 복사했어요.");
  }

  async function openCareQr() {
    const token = await getPublicLinkToken(pet.id, "CARE");
    router.push(`/share/${token}?view=qr`);
  }

  async function openLostQr() {
    const token = await getPublicLinkToken(pet.id, "LOST");
    router.push(`/share/${token}?view=qr`);
  }

  async function copyInviteCode() {
    await navigator.clipboard.writeText(pet.inviteCode ?? pet.id);
    onNotify("초대코드를 복사했어요.");
  }

  async function copyRegistrationNumber() {
    if (!pet.animalRegistrationNo) return;
    await navigator.clipboard.writeText(pet.animalRegistrationNo);
    onNotify("동물등록번호를 복사했어요.");
  }

  return (
    <article className="home-pet-card" role="link" tabIndex={0} aria-label={`${pet.name} 공개 프로필 보기`} onClick={() => void openProfilePage()} onKeyDown={handleCardKeyDown}>
      <div className="home-pet-photo">
        {pet.photos[0]?.url ? (
          <Image src={pet.photos[0].url} alt={`${pet.name} 프로필 사진`} fill sizes="(max-width: 760px) 82vw, 360px" quality={68} />
        ) : (
          <div className="home-pet-photo-empty" aria-hidden>{pet.name.slice(0, 1)}</div>
        )}
      </div>
      <div className="home-pet-content">
        <div className="pet-card-copy">
          <h3>{pet.name}</h3>
          <p>
            <span>{pet.animalRegistrationNo ? `동물등록번호 ${pet.animalRegistrationNo}` : "동물등록번호 미등록"}</span>
            {pet.animalRegistrationNo && <button type="button" onClick={(event) => { event.stopPropagation(); void copyRegistrationNumber(); }}>복사</button>}
          </p>
        </div>
        <div className="pet-card-actions" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => copyShareLink("care")}><PetActionContent icon={actionIcons.careLink} label="돌봄 링크" /></button>
          <button type="button" onClick={() => copyShareLink("lost")}><PetActionContent icon={actionIcons.lostLink} label="실종 링크" /></button>
          <button type="button" className="qr-action care-qr" onClick={() => void openCareQr()}><PetActionContent icon={actionIcons.careQr} label="관리 QR" /></button>
          <button type="button" className="qr-action lost-qr" onClick={() => void openLostQr()}><PetActionContent icon={actionIcons.lostQr} label="실종 QR" /></button>
          <button type="button" onClick={copyInviteCode}><PetActionContent icon={actionIcons.inviteCode} label="초대코드" /></button>
        </div>
      </div>
    </article>
  );
}

function FriendSection({ empty = false }: { empty?: boolean }) {
  return (
    <section className="home-section friend-section" id="friends">
      <div className="section-heading"><h2>친구들</h2></div>
      <div className="friend-empty"><strong>{empty ? "아직 등록한 친구가 없어요!" : "친구 목록을 준비하고 있어요."}</strong><Link href="/friends/new">＋ 친구 등록하기</Link></div>
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div className="logged-home home-skeleton" aria-busy="true" aria-label="이름표를 불러오고 있어요">
      <section className="home-greeting">
        <div className="skeleton-line skeleton-title" />
        <div className="skeleton-line skeleton-copy" />
      </section>
      <section className="home-section my-pets-section">
        <div className="section-heading">
          <div className="skeleton-line skeleton-heading" />
          <div className="skeleton-pill" />
        </div>
        <div className="pet-card-scroll">
          <article className="home-pet-card skeleton-card" />
        </div>
      </section>
    </div>
  );
}

export function LoggedHome({ userId, userName }: { userId: string; userName: string }) {
  const [pets, setPets] = useState<DogProfile[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  function showCopyAlert(message: string) {
    setAlertMessage(message);
    window.setTimeout(() => setAlertMessage(""), 1800);
  }

  useEffect(() => {
    let active = true;
    async function loadPets() {
      const supabase = createBrowserSupabaseClient();
      const data = await getDogsByOwner(supabase, userId).catch((error) => {
        console.error(error);
        setLoadError("아이 정보를 불러오지 못했어요. DB 스키마와 권한을 확인해 주세요.");
        return [];
      });
      if (!active) return;
      setPets(data);
    }
    loadPets();
    return () => { active = false; };
  }, [userId]);

  if (pets === null) return <HomeSkeleton />;
  if (loadError) return <div className="dashboard-loading">{loadError}</div>;

  return (
    <div className="logged-home">
      <CopyAlert message={alertMessage} />
      <section className="home-greeting"><h1>{userName}님, 오늘도 반가워요 <span aria-hidden>👋</span></h1><p>우리 아이들의 프로필을 확인해보세요.</p></section>
      {pets.length === 0 ? <EmptyPets /> : <>
        <section className="home-section my-pets-section" id="my-pets">
          <div className="section-heading"><h2>내 새꾸 <span aria-hidden>🐾</span></h2><Link className="add-pet-cta" href="/pets/new">＋ 새꾸 추가</Link></div>
          <div className="pet-card-scroll">{pets.map((pet, index) => <PetCard key={pet.id} pet={pet} index={index} onNotify={showCopyAlert} />)}</div>
        </section>
        <FriendSection />
      </>}
    </div>
  );
}
