"use client";

import Image from "next/image";
import Link from "next/link";
import { KeyboardEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { DogProfile } from "@/lib/dogs";

const friends = [
  { name: "몽이", breed: "말티즈", age: "4살", image: "/pets/mongi.png" },
  { name: "보리", breed: "비숑", age: "2살", image: "/pets/bori.png" },
  { name: "초코", breed: "푸들", age: "5살", image: "/pets/choco.png" },
];

function getAgeLabel(birthDate: string | null) {
  if (!birthDate) return "나이 미등록";
  const birth = new Date(`${birthDate}T00:00:00`);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age -= 1;
  return age <= 0 ? "1살 미만" : `${age}살`;
}

function getNeuteringLabel(status: DogProfile["neuteringStatus"]) {
  if (status === "NEUTERED") return "중성화 완료";
  if (status === "NOT_NEUTERED") return "중성화 전";
  return "중성화 여부 미등록";
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

function PetCard({ pet, index }: { pet: DogProfile; index: number }) {
  const [copiedMode, setCopiedMode] = useState<"care" | "lost" | "invite" | null>(null);
  const router = useRouter();

  function openEditPage() {
    router.push(`/pets/${pet.id}/edit`);
  }

  function handleCardKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openEditPage();
    }
  }

  async function copyShareLink(mode: "care" | "lost") {
    const url = new URL(`/share/${pet.id}`, window.location.origin);
    url.searchParams.set("mode", mode);
    await navigator.clipboard.writeText(url.toString());
    setCopiedMode(mode);
    window.setTimeout(() => setCopiedMode(null), 1600);
  }

  async function copyInviteCode() {
    await navigator.clipboard.writeText(pet.id);
    setCopiedMode("invite");
    window.setTimeout(() => setCopiedMode(null), 1600);
  }

  return (
    <article className="home-pet-card" role="link" tabIndex={0} aria-label={`${pet.name} 정보 수정`} onClick={openEditPage} onKeyDown={handleCardKeyDown}>
      <div className="home-pet-photo"><Image src={pet.photos[0]?.url ?? (index === 0 ? "/pets/early.png" : "/pets/bori.png")} alt={`${pet.name} 프로필 사진`} fill sizes="(max-width: 760px) 82vw, 360px" unoptimized={Boolean(pet.photos[0]?.url)} /></div>
      <div className="home-pet-content">
        <h3>{pet.name}</h3>
        <dl className="pet-summary">
          <div><dt>종</dt><dd>{pet.breed}</dd></div>
          <div><dt>나이</dt><dd>{getAgeLabel(pet.birthDate)}</dd></div>
          <div><dt>성별</dt><dd>{pet.gender === "FEMALE" ? "여자아이" : "남자아이"}</dd></div>
          <div><dt>중성화</dt><dd>{getNeuteringLabel(pet.neuteringStatus)}</dd></div>
        </dl>
        <div className="profile-progress"><div><span>프로필 완성도</span><b>85%</b></div><progress value="85" max="100">85%</progress></div>
        <div className="pet-card-actions" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => copyShareLink("care")}>{copiedMode === "care" ? "복사 완료" : "관리 링크 복사"}</button>
          <button type="button" onClick={() => copyShareLink("lost")}>{copiedMode === "lost" ? "복사 완료" : "실종 링크 복사"}</button>
          <Link className="qr-action care-qr" href={`/share/${pet.id}?mode=care&view=qr`}>관리 QR 생성</Link>
          <Link className="qr-action lost-qr" href={`/share/${pet.id}?mode=lost&view=qr`}>실종 QR 생성</Link>
          <button type="button" onClick={copyInviteCode}>{copiedMode === "invite" ? "복사 완료" : "초대코드 복사"}</button>
          <Link className="edit-action" href={`/pets/${pet.id}/edit`}>수정하기</Link>
        </div>
      </div>
    </article>
  );
}

function FriendSection({ empty = false }: { empty?: boolean }) {
  return (
    <section className="home-section friend-section" id="friends">
      <div className="section-heading"><h2>친구들</h2>{!empty && <button type="button">전체보기</button>}</div>
      {empty ? (
        <div className="friend-empty"><strong>아직 등록한 친구가 없어요!</strong><Link href="/friends/new">＋ 친구 등록하기</Link></div>
      ) : (
        <div className="friend-grid">
          {friends.map((friend) => <article key={friend.name}><div><Image src={friend.image} alt={`${friend.name} 프로필 사진`} fill sizes="(max-width: 760px) 45vw, 220px" /></div><h3>{friend.name}</h3><p>{friend.breed} · {friend.age}</p></article>)}
          <Link className="add-friend-card" href="/friends/new"><span>＋</span><b>친구 등록</b></Link>
        </div>
      )}
    </section>
  );
}

export function LoggedHome({ userId, userName }: { userId: string; userName: string }) {
  const [pets, setPets] = useState<DogProfile[] | null>(null);

  useEffect(() => {
    let active = true;
    async function loadPets() {
      const { data, error } = await createBrowserSupabaseClient().from("dogs").select("id,name,breed,birth_date,weight_kg,gender,neutering_status,animal_registration_no,dog_images(image_url,sort_order,is_primary)").eq("owner_id", userId).order("created_at", { ascending: true });
      if (!active) return;
      if (error) return setPets([]);
      setPets((data ?? []).map((dog) => ({ id: dog.id, name: dog.name, breed: dog.breed, birthDate: dog.birth_date, weightKg: dog.weight_kg == null ? null : Number(dog.weight_kg), gender: dog.gender as DogProfile["gender"], neuteringStatus: dog.neutering_status as DogProfile["neuteringStatus"], animalRegistrationNo: dog.animal_registration_no, photos: [...(dog.dog_images ?? [])].filter((photo) => Boolean(photo.image_url)).sort((a, b) => a.sort_order - b.sort_order).map((photo) => ({ url: photo.image_url as string, sortOrder: photo.sort_order, isPrimary: photo.is_primary })) })));
    }
    loadPets();
    return () => { active = false; };
  }, [userId]);

  if (pets === null) return <div className="dashboard-loading">이름표를 불러오고 있어요.</div>;

  return (
    <div className="logged-home">
      <section className="home-greeting"><h1>{userName}님, 오늘도 반가워요 <span aria-hidden>👋</span></h1><p>우리 아이들의 프로필을 확인해보세요.</p></section>
      {pets.length === 0 ? <EmptyPets /> : <>
        <section className="home-section my-pets-section" id="my-pets">
          <div className="section-heading"><h2>내 새꾸 <span aria-hidden>🐾</span></h2><Link href="/pets/new">＋ 새꾸 추가</Link></div>
          <div className="pet-card-scroll">{pets.map((pet, index) => <PetCard key={pet.id} pet={pet} index={index} />)}</div>
        </section>
        <FriendSection />
      </>}
    </div>
  );
}
