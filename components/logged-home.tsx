"use client";

import Image from "next/image";
import Link from "next/link";
import { KeyboardEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { RiUserAddLine } from "react-icons/ri";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { invokeFunction } from "@/lib/supabase/functions";
import { getDogsByOwner } from "@/lib/pets/service";
import type { DogProfile } from "@/lib/dogs";
import type { DogPublicLinkType } from "@/lib/pets/types";

async function getPublicLinkToken(dogId: string, type: DogPublicLinkType) {
  const data = await invokeFunction<{ token: string }>("dogs", { action: "public-link", dogId, type });
  return data.token;
}

async function getFriendDogs() {
  const data = await invokeFunction<{ friends: DogProfile[] }>("friends", { action: "list" });
  return data.friends;
}

async function getFriendProfileToken(dogId: string) {
  const data = await invokeFunction<{ token: string }>("friends", { action: "profile-link", dogId });
  return data.token;
}

function PetActionContent({ label, icon }: { label: string; icon: string }) {
  return <><span className="pet-action-icon" aria-hidden><img src={icon} alt="" /></span><span>{label}</span></>;
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
  return createPortal(
    <div className="copy-alert" role="status" aria-live="polite">{message}</div>,
    document.body,
  );
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
  const tokenCacheRef = useRef<Partial<Record<DogPublicLinkType, Promise<string>>>>({});
  const [pendingAction, setPendingAction] = useState("");

  function getCachedPublicLinkToken(type: DogPublicLinkType) {
    tokenCacheRef.current[type] ??= getPublicLinkToken(pet.id, type);
    return tokenCacheRef.current[type];
  }

  function prefetchSharePage(token: string, qr = false) {
    router.prefetch(`/share/${token}${qr ? "?view=qr" : ""}`);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      (["PROFILE", "CARE", "LOST"] as DogPublicLinkType[]).forEach((type) => {
        void getCachedPublicLinkToken(type).then((token) => {
          prefetchSharePage(token);
          if (type !== "PROFILE") prefetchSharePage(token, true);
        }).catch(() => undefined);
      });
    }, 600);

    return () => window.clearTimeout(timer);
  }, []);

  async function openProfilePage() {
    if (pendingAction) return;
    setPendingAction("profile");
    try {
      const token = await getCachedPublicLinkToken("PROFILE");
      router.push(`/share/${token}`);
    } catch {
      setPendingAction("");
      onNotify("공유 페이지를 준비하지 못했어요.");
    }
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      void openProfilePage();
    }
  }

  async function copyShareLink(mode: "care" | "lost") {
    const type = mode === "care" ? "CARE" : "LOST";
    setPendingAction(`${mode}-link`);
    try {
      const token = await getCachedPublicLinkToken(type);
      prefetchSharePage(token);
      prefetchSharePage(token, true);
      const url = new URL(`/share/${token}`, window.location.origin);
      await navigator.clipboard.writeText(url.toString());
      onNotify(mode === "care" ? "돌봄 링크를 복사했어요." : "실종 링크를 복사했어요.");
    } catch {
      onNotify("링크를 준비하지 못했어요.");
    } finally {
      setPendingAction("");
    }
  }

  async function openCareQr() {
    if (pendingAction) return;
    setPendingAction("care-qr");
    try {
      const token = await getCachedPublicLinkToken("CARE");
      router.push(`/share/${token}?view=qr`);
    } catch {
      setPendingAction("");
      onNotify("QR을 준비하지 못했어요.");
    }
  }

  async function openLostQr() {
    if (pendingAction) return;
    setPendingAction("lost-qr");
    try {
      const token = await getCachedPublicLinkToken("LOST");
      router.push(`/share/${token}?view=qr`);
    } catch {
      setPendingAction("");
      onNotify("QR을 준비하지 못했어요.");
    }
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
          <div className="pet-card-title-row">
            <h3>{pet.name}</h3>
          </div>
          <p className="pet-registration-number">
            동물등록번호 {pet.animalRegistrationNo || "미등록"}
          </p>
        </div>
        <div className="pet-card-actions" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => copyShareLink("lost")} disabled={Boolean(pendingAction)}><PetActionContent icon="/pet-actions/lost-link.png" label={pendingAction === "lost-link" ? "준비 중" : "실종 링크"} /></button>
          <button type="button" className="qr-action lost-qr" onClick={() => void openLostQr()} disabled={Boolean(pendingAction)}><PetActionContent icon="/pet-actions/lost-qr.png" label={pendingAction === "lost-qr" ? "이동 중" : "실종 QR"} /></button>
          <button type="button" onClick={() => void copyInviteCode()}><PetActionContent icon="/pet-actions/invite-code.png" label="초대코드 복사" /></button>
          <button type="button" onClick={() => copyShareLink("care")} disabled={Boolean(pendingAction)}><PetActionContent icon="/pet-actions/care-link.png" label={pendingAction === "care-link" ? "준비 중" : "돌봄 링크"} /></button>
          <button type="button" className="qr-action care-qr" onClick={() => void openCareQr()} disabled={Boolean(pendingAction)}><PetActionContent icon="/pet-actions/care-qr.png" label={pendingAction === "care-qr" ? "이동 중" : "돌봄 QR"} /></button>
          <button type="button" onClick={() => void copyRegistrationNumber()} disabled={!pet.animalRegistrationNo}><PetActionContent icon="/pet-actions/registration-number.png" label={pet.animalRegistrationNo ? "등록번호 복사" : "등록번호 없음"} /></button>
        </div>
      </div>
    </article>
  );
}

function FriendSection({ empty = false, friends = [], onNotify }: { empty?: boolean; friends?: DogProfile[]; onNotify?: (message: string) => void }) {
  const router = useRouter();
  const [openingFriendId, setOpeningFriendId] = useState("");

  async function openFriend(friend: DogProfile) {
    if (openingFriendId) return;
    setOpeningFriendId(friend.id);
    try {
      const token = await getFriendProfileToken(friend.id);
      router.push(`/share/${token}`);
    } catch {
      setOpeningFriendId("");
      onNotify?.("친구 이름표를 준비하지 못했어요.");
    }
  }

  return (
    <section className="home-section friend-section" id="friends">
      <div className="section-heading"><h2>친구들</h2><Link className="add-friend-cta" href="/friends/new"><RiUserAddLine aria-hidden="true" /><span>친구 등록</span></Link></div>
      {empty || friends.length === 0 ? (
        <div className="friend-empty"><strong>아직 등록한 친구가 없어요!</strong><Link href="/friends/new">＋ 친구 등록하기</Link></div>
      ) : (
        <div className="friend-grid">
          {friends.map((friend) => (
            <article key={friend.id} role="link" tabIndex={0} aria-label={`${friend.name} 이름표 보기`} onClick={() => void openFriend(friend)} onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                void openFriend(friend);
              }
            }} data-loading={openingFriendId === friend.id}>
              <div>
                {friend.photos[0]?.url ? (
                  <Image src={friend.photos[0].url} alt={`${friend.name} 사진`} fill sizes="(max-width: 760px) 45vw, 220px" quality={62} />
                ) : (
                  <div className="friend-photo-empty" aria-hidden>{friend.name.slice(0, 1)}</div>
                )}
              </div>
              <h3>{friend.name}</h3>
              <p>{openingFriendId === friend.id ? "이동 중" : friend.breed}</p>
            </article>
          ))}
        </div>
      )}
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
          <article className="home-pet-card skeleton-home-card">
            <div className="skeleton-card skeleton-home-photo" />
            <div className="skeleton-home-content">
              <div className="skeleton-line skeleton-home-name" />
              <div className="skeleton-line skeleton-home-number" />
              <div className="skeleton-home-actions">{[0, 1, 2, 3, 4, 5].map((item) => <div className="skeleton-pill" key={item} />)}</div>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}

export function LoggedHome({ userId, userName }: { userId: string; userName: string }) {
  const [pets, setPets] = useState<DogProfile[] | null>(null);
  const [friends, setFriends] = useState<DogProfile[]>([]);
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
      const friendData = await getFriendDogs().catch((error) => {
        console.error(error);
        return [];
      });
      if (!active) return;
      setFriends(friendData);
    }
    loadPets();
    return () => { active = false; };
  }, [userId]);

  if (pets === null) return <HomeSkeleton />;
  if (loadError) return <div className="dashboard-loading">{loadError}</div>;

  return (
    <div className="logged-home">
      <CopyAlert message={alertMessage} />
      <section className="home-greeting"><p>우리 아이들의 프로필을 한눈에 확인해보세요.</p></section>
      {pets.length === 0 ? <EmptyPets /> : <>
        <section className="home-section my-pets-section" id="my-pets">
          <div className="section-heading"><h2>내 새꾸 <span aria-hidden>🐾</span></h2><Link className="add-pet-cta" href="/pets/new">＋ 새꾸 추가</Link></div>
          <div className="pet-card-scroll">{pets.map((pet, index) => <PetCard key={pet.id} pet={pet} index={index} onNotify={showCopyAlert} />)}</div>
        </section>
        <FriendSection friends={friends} onNotify={showCopyAlert} />
      </>}
    </div>
  );
}
