"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { FoundLocationReports, type FoundLocationReport } from "@/components/found-location-reports";
import { Guestbook, type GuestbookEntry } from "@/components/guestbook";
import { LostLocationModal, type LostLocationSnapshot } from "@/components/lost-location-modal";
import type { DogProfile } from "@/lib/dogs";
import type { DogPublicLinkType } from "@/lib/pets/types";

type ShareMode = "basic" | "care" | "lost";

function getAgeLabel(birthDate: string | null) {
  if (!birthDate) return "";
  const birth = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return "";
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? `${age}살` : "";
}

function getGenderLabel(gender: DogProfile["gender"]) {
  return gender === "MALE" ? "남아" : "여아";
}

function getYesNo(value: boolean | null | undefined, yes = "예", no = "아니오") {
  if (value === true) return yes;
  if (value === false) return no;
  return "미입력";
}

function getNeuteringLabel(status: DogProfile["neuteringStatus"]) {
  if (status === "NEUTERED") return "완료";
  if (status === "NOT_NEUTERED") return "미완료";
  return "모름";
}

function getDateTimeLabel(value: string | null | undefined) {
  if (!value) return "미입력";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "미입력";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(date);
}

export function BasicShareProfile({
  dog,
  mode,
  canEdit,
  links = {},
  slug,
  guestbookEntries,
  canWriteGuestbook,
  foundLocationReports,
  kakaoMapKey,
}: {
  dog: DogProfile;
  mode: ShareMode;
  canEdit: boolean;
  links?: Partial<Record<DogPublicLinkType, string>>;
  slug: string;
  guestbookEntries: GuestbookEntry[];
  canWriteGuestbook: boolean;
  foundLocationReports: FoundLocationReport[];
  kakaoMapKey?: string;
}) {
  const photos = dog.photos;
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const activePhoto = photos[activePhotoIndex]?.url;
  const galleryPhotos = photos.slice(1);
  const care = dog.careProfile;
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [locationShareStatus, setLocationShareStatus] = useState<"idle" | "sharing" | "shared" | "failed">("idle");
  const [locationReportOpen, setLocationReportOpen] = useState(false);
  const [locationReportNote, setLocationReportNote] = useState("");
  const [lostSnapshot, setLostSnapshot] = useState<LostLocationSnapshot>({
    lostAt: care?.lostAt ?? null,
    lostLocationAddress: care?.lostLocationAddress ?? null,
    lostLocationDistrict: care?.lostLocationDistrict ?? null,
    lostLocationNeighborhood: care?.lostLocationNeighborhood ?? null,
    lostLocationDetail: care?.lostLocationDetail ?? null,
  });
  const activeTab = mode === "lost" ? "lost" : "care";
  const lostLocationLabel = [lostSnapshot.lostLocationDistrict, lostSnapshot.lostLocationNeighborhood, lostSnapshot.lostLocationDetail].filter(Boolean).join(" ") || lostSnapshot.lostLocationAddress || "미입력";
  const hasLostInfo = Boolean(lostSnapshot.lostAt && (lostSnapshot.lostLocationDistrict || lostSnapshot.lostLocationNeighborhood || lostSnapshot.lostLocationDetail || lostSnapshot.lostLocationAddress));
  const primaryContact = care?.emergencyContact1?.replace(/[^\d+]/g, "") ?? "";
  const instagramUrl = dog.instagramUsername ? `https://www.instagram.com/${dog.instagramUsername}` : "";
  const profileStats = [
    { label: "나이", value: getAgeLabel(dog.birthDate) || "미입력" },
    { label: "성별", value: getGenderLabel(dog.gender) },
    { label: "몸무게", value: dog.weightKg ? `${dog.weightKg}kg` : "미입력" },
    { label: "중성화", value: getNeuteringLabel(dog.neuteringStatus) },
  ];

  function movePhoto(direction: -1 | 1) {
    if (photos.length < 2) return;
    setActivePhotoIndex((current) => (current + direction + photos.length) % photos.length);
  }

  async function endLostReport() {
    const confirmed = window.confirm("정말 종료하시겠습니까?\n잔여 기록이 모두 삭제됩니다.");
    if (!confirmed) return;

    const response = await fetch(`/api/dogs/${dog.id}/lost-location`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endReport: true }),
    });
    if (!response.ok) return;
    const emptyLostSnapshot: LostLocationSnapshot = {
      lostAt: null,
      lostLocationAddress: null,
      lostLocationDistrict: null,
      lostLocationNeighborhood: null,
      lostLocationDetail: null,
    };
    setLostSnapshot(emptyLostSnapshot);
  }

  function shareCurrentLocation() {
    if (!("geolocation" in navigator)) {
      setLocationShareStatus("failed");
      return;
    }

    setLocationShareStatus("sharing");
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const response = await fetch(`/api/share/${slug}/found-location`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              note: locationReportNote,
            }),
          });
          if (!response.ok) throw new Error("save failed");
          setLocationShareStatus("shared");
          setLocationReportOpen(false);
          setLocationReportNote("");
        } catch {
          setLocationShareStatus("failed");
        }
      },
      () => setLocationShareStatus("failed"),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }

  return (
    <section className={`basic-share-profile${mode === "lost" ? " has-lost-remote" : ""}`}>
      <div className="basic-share-topbar">
        <div className="share-brand basic-share-brand"><Image className="wordmark-logo" src="/mynameis-logo.png" alt="mynameis" width={96} height={33} /></div>
        {canEdit && !hasLostInfo ? <button className="lost-place-button" type="button" onClick={() => setLostModalOpen(true)}>실종등록</button> : null}
      </div>
      <div className="basic-share-hero">
        {activePhoto ? (
          <>
            <Image className="basic-share-bg" src={activePhoto} alt="" fill sizes="100vw" unoptimized aria-hidden />
            <Image className="basic-share-main-photo" src={activePhoto} alt={`${dog.name} 선택 사진`} fill sizes="(max-width: 760px) 100vw, 560px" unoptimized priority />
          </>
        ) : (
          <div className="basic-share-empty-photo">강아지</div>
        )}
        {photos.length > 1 ? (
          <div className="basic-photo-nav" aria-label="배경 사진 변경">
            <button type="button" onClick={() => movePhoto(-1)} aria-label="이전 사진">‹</button>
            <button type="button" onClick={() => movePhoto(1)} aria-label="다음 사진">›</button>
          </div>
        ) : null}
        <div className="basic-share-overlay">
          <div aria-hidden />
          <div className="basic-share-copy">
            {hasLostInfo ? <p className="lost-status-message">현재 실종된 상태입니다.</p> : null}
            <div className="basic-share-title">
              <h1>{dog.name}</h1>
              <b>{dog.breed}</b>
            </div>
            {dog.instagramUsername ? (
              <a className="basic-instagram-link" href={`https://www.instagram.com/${dog.instagramUsername}`} target="_blank" rel="noopener noreferrer">
                <Image src="/social/instagram-icon.png" alt="" width={18} height={18} />
                <span>@{dog.instagramUsername}</span>
              </a>
            ) : null}
            <div className="basic-share-stats">
              {profileStats.map((item) => (
                <dl key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </dl>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="basic-share-body">
        {canEdit ? (
          <div className="basic-info-tabs" role="tablist" aria-label={`${dog.name} 추가 정보`}>
            {links.LOST ? <Link role="tab" aria-selected={activeTab === "lost"} href={`/share/${links.LOST}`}>실종</Link> : null}
            {links.CARE ? <Link role="tab" aria-selected={activeTab === "care"} href={`/share/${links.CARE}`}>돌봄</Link> : null}
          </div>
        ) : null}
        <section className="basic-tab-panel">
          {activeTab === "lost" ? (
            <>
              <h2>실종 정보</h2>
              {canEdit && hasLostInfo ? <button className="end-lost-report-button" type="button" onClick={() => void endLostReport()}>실종 신고 종료</button> : null}
              {canEdit && foundLocationReports.length > 0 ? <FoundLocationReports reports={foundLocationReports} kakaoKey={kakaoMapKey} /> : null}
              {hasLostInfo ? (
                <>
                  {canEdit ? <dl><dt>긴급 연락처1</dt><dd>{care?.emergencyContact1 || "미입력"}</dd></dl> : null}
                  {canEdit ? <dl><dt>긴급 연락처2</dt><dd>{care?.emergencyContact2 || "미입력"}</dd></dl> : null}
                  <dl><dt>실종 시간</dt><dd>{getDateTimeLabel(lostSnapshot.lostAt)}</dd></dl>
                  <dl><dt>실종지</dt><dd>{lostLocationLabel}</dd></dl>
                  <dl><dt>복용약 여부</dt><dd>{getYesNo(care?.takesMedication, "있어요", "없어요")}</dd></dl>
                  <dl><dt>주치 병원</dt><dd>{care?.primaryHospital || "미입력"}</dd></dl>
                  {care?.primaryHospitalAddress ? <dl><dt>병원 주소</dt><dd>{care.primaryHospitalAddress}</dd></dl> : null}
                  {care?.primaryHospitalPhone ? <dl><dt>병원 전화</dt><dd>{care.primaryHospitalPhone}</dd></dl> : null}
                  <dl><dt>특이사항</dt><dd>{care?.emergencyNote || "미입력"}</dd></dl>
                </>
              ) : (
                <p className="basic-tab-empty">등록된 실종 정보가 없어요.</p>
              )}
            </>
          ) : (
            <>
              <h2>돌봄 정보</h2>
              <dl><dt>1일 식사 횟수</dt><dd>{care?.mealsPerDay ? `${care.mealsPerDay}회` : "미입력"}</dd></dl>
              <dl><dt>마킹 여부</dt><dd>{getYesNo(care?.marksIndoors, "해요", "안 해요")}</dd></dl>
              <dl><dt>5차 필수 접종</dt><dd>{getYesNo(care?.fifthVaccineDone, "완료", "미완료")}</dd></dl>
              <dl><dt>유치원 경험</dt><dd>{getYesNo(care?.daycareExperience, "있어요", "없어요")}</dd></dl>
              <dl><dt>알러지 여부</dt><dd>{getYesNo(care?.hasAllergy, "있어요", "없어요")}</dd></dl>
              <dl><dt>전달 메모</dt><dd>{care?.handoffMemo || "미입력"}</dd></dl>
            </>
          )}
        </section>
        {galleryPhotos.length ? (
          <div className="basic-photo-grid">
            {galleryPhotos.map((photo, index) => {
              const photoIndex = index + 1;
              return (
                <button className="basic-photo-card" type="button" key={photo.id ?? photo.url} aria-pressed={activePhotoIndex === photoIndex} onClick={() => setActivePhotoIndex(photoIndex)}>
                  <Image src={photo.url} alt={`${dog.name} 등록 사진 ${photoIndex}`} fill sizes="(max-width: 760px) 45vw, 260px" unoptimized />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="basic-photo-empty">대표사진 외 등록된 사진이 없어요.</div>
        )}
        <Guestbook slug={slug} dogName={dog.name} initialEntries={guestbookEntries} canWrite={canWriteGuestbook} />
        {canEdit ? <Link className="share-edit-button basic-edit-button" href={`/pets/${dog.id}/edit`}>정보 수정</Link> : null}
        <Link className="made-with" href="/">made with <b>mynameis</b></Link>
      </div>
      {mode === "lost" ? (
        <footer className="share-remote-footer" aria-label="빠른 연락">
          {primaryContact ? <a href={`tel:${primaryContact}`}>전화하기</a> : <span aria-disabled="true">전화하기</span>}
          <button type="button" onClick={() => setLocationReportOpen(true)} disabled={locationShareStatus === "sharing"}>
            {locationShareStatus === "sharing" ? "공유 중" : locationShareStatus === "shared" ? "공유 완료" : locationShareStatus === "failed" ? "다시 공유" : "현위치 공유"}
          </button>
          {instagramUrl ? <a href={instagramUrl} target="_blank" rel="noopener noreferrer">인스타</a> : <span aria-disabled="true">인스타</span>}
        </footer>
      ) : null}
      {locationReportOpen ? (
        <div className="lost-modal-backdrop" role="presentation" onMouseDown={() => setLocationReportOpen(false)}>
          <div className="location-report-modal" role="dialog" aria-modal="true" aria-labelledby="location-report-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="lost-modal-header">
              <h2 id="location-report-title">위치 제보</h2>
              <button type="button" aria-label="닫기" onClick={() => setLocationReportOpen(false)}>×</button>
            </div>
            <p>목격 상황이나 주변 특징을 남겨주시면 보호자에게 큰 도움이 돼요.</p>
            <textarea
              className="location-report-note"
              value={locationReportNote}
              onChange={(event) => setLocationReportNote(event.target.value.slice(0, 500))}
              placeholder="예: 방금 공원 입구 쪽으로 지나갔어요."
              aria-label="제보 메모"
              rows={4}
            />
            <div className="lost-modal-actions">
              <button type="button" onClick={() => setLocationReportOpen(false)}>취소</button>
              <button type="button" onClick={shareCurrentLocation} disabled={locationShareStatus === "sharing"}>{locationShareStatus === "sharing" ? "공유 중..." : "제보"}</button>
            </div>
          </div>
        </div>
      ) : null}
      {lostModalOpen ? <LostLocationModal dogId={dog.id} initial={lostSnapshot} onClose={() => setLostModalOpen(false)} onSaved={setLostSnapshot} /> : null}
    </section>
  );
}
