"use client";

import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { useState } from "react";
import { FaCheckCircle, FaRegCircle } from "react-icons/fa";
import { FoundLocationReports, type FoundLocationReport } from "@/components/found-location-reports";
import { Guestbook, type GuestbookEntry } from "@/components/guestbook";
import { LostLocationModal, type LostLocationSnapshot } from "@/components/lost-location-modal";
import type { DogProfile } from "@/lib/dogs";
import { normalizeInstagramUsername } from "@/lib/pets/validation";
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

function BooleanValue({ value, trueLabel, falseLabel }: { value: boolean | null | undefined; trueLabel: string; falseLabel: string }) {
  if (value === null || value === undefined) return <>미입력</>;

  const label = value ? trueLabel : falseLabel;
  const Icon = value ? FaCheckCircle : FaRegCircle;
  return (
    <span className={`boolean-value ${value ? "checked" : "unchecked"}`}>
      <Icon aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
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

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function posterRowsToHtml(rows: { label: string; value: string }[]) {
  return rows.map((row) => `
    <div class="poster-row">
      <dt>${escapeXml(row.label)}</dt>
      <dd>${escapeXml(row.value || "미입력")}</dd>
    </div>
  `).join("");
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
  const hasLostReportDetails = Boolean(lostSnapshot.lostAt || lostSnapshot.lostLocationDistrict || lostSnapshot.lostLocationNeighborhood || lostSnapshot.lostLocationDetail || lostSnapshot.lostLocationAddress);
  const primaryContact = care?.emergencyContact1?.replace(/[^\d+]/g, "") ?? "";
  const instagramUsername = normalizeInstagramUsername(dog.instagramUsername);
  const instagramUrl = instagramUsername ? `https://www.instagram.com/${encodeURIComponent(instagramUsername)}/` : "";
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

  async function savePoster() {
    const shareUrl = `${window.location.origin}/share/${slug}`;
    const qrImage = await QRCode.toDataURL(shareUrl, { width: 260, margin: 1, errorCorrectionLevel: "H", color: { dark: "#3F392F", light: "#FFFFFF" } });
    const isLostPoster = activeTab === "lost";
    const posterTitle = isLostPoster ? `${dog.name} 실종 정보` : `${dog.name} 돌봄 정보`;
    const posterBadge = isLostPoster ? "실종 공유 포스터" : "돌봄 공유 포스터";
    const posterRows = isLostPoster ? [
      { label: "실종 시간", value: getDateTimeLabel(lostSnapshot.lostAt) },
      { label: "실종지", value: lostLocationLabel },
      { label: "복용약", value: getYesNo(care?.takesMedication, "있어요", "없어요") },
      { label: "주치 병원", value: care?.primaryHospital || "미입력" },
      { label: "특이사항", value: care?.emergencyNote || "미입력" },
    ] : [
      { label: "식사", value: care?.mealsPerDay ? `하루 ${care.mealsPerDay}회` : "미입력" },
      { label: "마킹", value: getYesNo(care?.marksIndoors, "해요", "안 해요") },
      { label: "접종", value: getYesNo(care?.fifthVaccineDone, "5차 완료", "미완료") },
      { label: "알러지", value: getYesNo(care?.hasAllergy, "있어요", "없어요") },
      { label: "전달 메모", value: care?.handoffMemo || "미입력" },
    ];
    const posterPhotos = photos.slice(0, 4);
    const photoHtml = posterPhotos.length ? posterPhotos.map((photo, index) => `
      <figure class="${index === 0 ? "main-photo" : "sub-photo"}">
        <img src="${escapeXml(photo.url)}" alt="" />
      </figure>
    `).join("") : `<figure class="main-photo empty-photo"><span>${escapeXml(dog.name.slice(0, 1))}</span></figure>`;
    const posterWindow = window.open("", "_blank", "width=900,height=1200");
    if (!posterWindow) {
      window.alert("팝업이 차단되어 포스터를 열 수 없어요. 팝업 허용 후 다시 시도해 주세요.");
      return;
    }

    posterWindow.document.write(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${escapeXml(posterTitle)}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #FFFDF7; color: #3F392F; font-family: "Apple SD Gothic Neo", Arial, sans-serif; }
    .poster { width: 210mm; min-height: 297mm; padding: 14mm; background: radial-gradient(circle at 92% 3%, #FFF3C4 0 18%, transparent 19%), #FFFDF7; }
    .card { min-height: 269mm; padding: 10mm; border: 1.5px solid #EDE5D7; border-radius: 13mm; background: #fff; }
    .badge { margin: 0 0 2mm; color: #7B6526; font-size: 12px; font-weight: 900; }
    h1 { margin: 0 0 7mm; font-size: 30px; line-height: 1.15; letter-spacing: 0; }
    .photos { display: grid; grid-template-columns: 1.35fr .65fr; grid-template-rows: repeat(3, 33mm); gap: 3mm; margin-bottom: 8mm; }
    figure { margin: 0; overflow: hidden; border-radius: 7mm; background: #FFF3C4; }
    .main-photo { grid-row: 1 / 4; }
    .empty-photo { display: grid; place-items: center; color: #3F392F; font-size: 44px; font-weight: 900; }
    img { width: 100%; height: 100%; object-fit: cover; display: block; }
    dl { margin: 0; }
    .poster-row { display: grid; grid-template-columns: 33mm 1fr; gap: 7mm; padding: 3.2mm 0; border-bottom: 1px solid #F1E9DA; page-break-inside: avoid; }
    dt { color: #81786B; font-size: 13px; font-weight: 800; }
    dd { margin: 0; color: #3F392F; font-size: 15px; font-weight: 900; line-height: 1.45; word-break: keep-all; overflow-wrap: anywhere; }
    .qr-area { display: grid; grid-template-columns: 32mm 1fr; align-items: center; gap: 7mm; margin-top: 5mm; }
    .qr-area img { width: 32mm; height: 32mm; }
    .qr-title { margin: 0 0 2mm; font-size: 17px; font-weight: 900; }
    .url { margin: 0; color: #81786B; font-size: 11px; font-weight: 800; overflow-wrap: anywhere; }
    .made { margin: 7mm 0 0; color: #AAA092; font-size: 11px; font-weight: 800; }
    .actions { position: fixed; right: 20px; top: 20px; display: flex; gap: 8px; }
    .actions button { min-height: 40px; padding: 0 14px; border: 0; border-radius: 12px; background: #3F392F; color: #fff; font-weight: 900; cursor: pointer; }
    @media print { .actions { display: none; } body { background: #fff; } }
  </style>
</head>
<body>
  <div class="actions"><button onclick="window.print()">PDF로 저장하기</button></div>
  <main class="poster">
    <section class="card">
      <p class="badge">${escapeXml(posterBadge)}</p>
      <h1>${escapeXml(posterTitle)}</h1>
      <div class="photos">${photoHtml}</div>
      <dl>${posterRowsToHtml(posterRows)}</dl>
      <div class="qr-area">
        <img src="${qrImage}" alt="" />
        <div>
          <p class="qr-title">QR로 공유 페이지 열기</p>
          <p class="url">${escapeXml(shareUrl)}</p>
        </div>
      </div>
      <p class="made">made with mynameis</p>
    </section>
  </main>
  <script>window.addEventListener("load", () => setTimeout(() => window.print(), 350));</script>
</body>
</html>`);
    posterWindow.document.close();
  }

  return (
    <section className={`basic-share-profile${mode === "lost" ? " has-lost-remote" : ""}`}>
      {canEdit && !hasLostReportDetails ? (
        <div className="basic-share-topbar">
          <button className="lost-place-button" type="button" onClick={() => setLostModalOpen(true)}>실종등록</button>
        </div>
      ) : null}
      <div className="basic-share-hero">
        {activePhoto ? (
          <>
            <Image className="basic-share-bg" src={activePhoto} alt="" fill sizes="100vw" quality={25} aria-hidden />
            <Image className="basic-share-main-photo" src={activePhoto} alt={`${dog.name} 선택 사진`} fill sizes="(max-width: 760px) 100vw, 560px" quality={78} priority />
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
          <a className="basic-share-brand" href="/" aria-label="mynameis 홈">
            <Image className="wordmark-logo" src="/mynameis-logo.png" alt="mynameis" width={96} height={33} />
          </a>
          <div className="basic-share-copy">
            {hasLostReportDetails ? <p className="lost-status-message">현재 실종된 상태입니다.</p> : null}
            <div className="basic-share-title">
              <h1>{dog.name}</h1>
              <b>{dog.breed}</b>
            </div>
            {instagramUsername ? (
              <a className="basic-instagram-link" href={instagramUrl} target="_blank" rel="noopener noreferrer">
                <Image src="/social/instagram-icon.png" alt="" width={18} height={18} />
                <span>@{instagramUsername}</span>
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
              {canEdit && hasLostReportDetails ? <button className="end-lost-report-button" type="button" onClick={() => void endLostReport()}>실종 신고 종료</button> : null}
              {canEdit && foundLocationReports.length > 0 ? <FoundLocationReports reports={foundLocationReports} kakaoKey={kakaoMapKey} /> : null}
              {canEdit ? (
                <>
                  <dl><dt>긴급 연락처1</dt><dd>{care?.emergencyContact1 || "미입력"}</dd></dl>
                  <dl><dt>긴급 연락처2</dt><dd>{care?.emergencyContact2 || "미입력"}</dd></dl>
                </>
              ) : null}
              <dl><dt>실종 시간</dt><dd>{getDateTimeLabel(lostSnapshot.lostAt)}</dd></dl>
              <dl><dt>실종지</dt><dd>{lostLocationLabel}</dd></dl>
              <dl><dt>복용약 여부</dt><dd><BooleanValue value={care?.takesMedication} trueLabel="있어요" falseLabel="없어요" /></dd></dl>
              <dl><dt>주치 병원</dt><dd>{care?.primaryHospital || "미입력"}</dd></dl>
              {care?.primaryHospitalAddress ? <dl><dt>병원 주소</dt><dd>{care.primaryHospitalAddress}</dd></dl> : null}
              {care?.primaryHospitalPhone ? <dl><dt>병원 전화</dt><dd>{care.primaryHospitalPhone}</dd></dl> : null}
              <dl><dt>특이사항</dt><dd>{care?.emergencyNote || "미입력"}</dd></dl>
              <p className="lost-contact-notice">
                연락처는 화면에 바로 보이지 않아요.<br />
                하단의 전화하기 버튼을 누르면 보호자에게 바로 연결돼요.
              </p>
            </>
          ) : (
            <>
              <h2>돌봄 정보</h2>
              <dl><dt>1일 식사 횟수</dt><dd>{care?.mealsPerDay ? `${care.mealsPerDay}회` : "미입력"}</dd></dl>
              <dl><dt>마킹 여부</dt><dd><BooleanValue value={care?.marksIndoors} trueLabel="해요" falseLabel="안 해요" /></dd></dl>
              <dl><dt>5차 필수 접종</dt><dd><BooleanValue value={care?.fifthVaccineDone} trueLabel="완료" falseLabel="미완료" /></dd></dl>
              <dl><dt>유치원 경험</dt><dd><BooleanValue value={care?.daycareExperience} trueLabel="있어요" falseLabel="없어요" /></dd></dl>
              <dl><dt>알러지 여부</dt><dd><BooleanValue value={care?.hasAllergy} trueLabel="있어요" falseLabel="없어요" /></dd></dl>
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
                  <Image src={photo.url} alt={`${dog.name} 등록 사진 ${photoIndex}`} fill sizes="(max-width: 760px) 45vw, 260px" quality={58} />
                </button>
              );
            })}
          </div>
        ) : (
          <div className="basic-photo-empty">대표사진 외 등록된 사진이 없어요.</div>
        )}
        <button className="poster-save-button" type="button" onClick={() => void savePoster()}>포스터 저장하기</button>
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
