"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import html2canvas from "html2canvas";
import QRCode from "qrcode";
import { type MouseEvent, type ReactNode, useEffect, useRef, useState } from "react";
import type { IconType } from "react-icons";
import { FaCheckCircle, FaRegCircle } from "react-icons/fa";
import { RiAlarmWarningLine, RiAlertLine, RiCapsuleLine, RiCheckLine, RiFileTextLine, RiFootprintLine, RiHeart3Line, RiHomeSmileLine, RiHospitalLine, RiMapPinLine, RiPhoneLine, RiPrinterLine, RiRestaurantLine, RiSchoolLine, RiShieldCheckLine, RiStickyNoteLine, RiWalkLine } from "react-icons/ri";
import { FoundLocationReports, type FoundLocationReport } from "@/components/found-location-reports";
import { Guestbook, type GuestbookEntry } from "@/components/guestbook";
import { LostLocationModal, type LostLocationSnapshot } from "@/components/lost-location-modal";
import type { DogProfile } from "@/lib/dogs";
import { normalizeInstagramUsername } from "@/lib/pets/validation";
import type { DogPublicLinkType, DogToiletingType } from "@/lib/pets/types";
import { invokeFunction } from "@/lib/supabase/functions";

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

function InfoLabel({ icon: Icon, children }: { icon: IconType; children: ReactNode }) {
  return <span className="info-label"><Icon aria-hidden="true" /><span>{children}</span></span>;
}

function getNeuteringLabel(status: DogProfile["neuteringStatus"]) {
  if (status === "NEUTERED") return "완료";
  if (status === "NOT_NEUTERED") return "미완료";
  return "모름";
}

function getToiletingLabel(type: DogToiletingType | null | undefined) {
  if (type === "INDOOR") return "실내 배변";
  if (type === "OUTDOOR") return "실외 배변";
  if (type === "BOTH") return "실내·실외 모두";
  return "미입력";
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
  const router = useRouter();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const activePhoto = photos[activePhotoIndex]?.url;
  const galleryPhotos = photos.slice(1);
  const care = dog.careProfile;
  const [lostModalOpen, setLostModalOpen] = useState(false);
  const [locationShareStatus, setLocationShareStatus] = useState<"idle" | "locating" | "sharing" | "shared" | "failed">("idle");
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "failed">("idle");
  const [locationReportOpen, setLocationReportOpen] = useState(false);
  const [locationThanksOpen, setLocationThanksOpen] = useState(false);
  const [locationReportNote, setLocationReportNote] = useState("");
  const [selectedReportLocation, setSelectedReportLocation] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);
  const locationPickerMapRef = useRef<HTMLDivElement>(null);
  const [lostSnapshot, setLostSnapshot] = useState<LostLocationSnapshot>({
    lostAt: care?.lostAt ?? null,
    lostLocationAddress: care?.lostLocationAddress ?? null,
    lostLocationDistrict: care?.lostLocationDistrict ?? null,
    lostLocationNeighborhood: care?.lostLocationNeighborhood ?? null,
    lostLocationDetail: care?.lostLocationDetail ?? null,
  });
  const [activeTab, setActiveTab] = useState<"lost" | "care">(mode === "lost" ? "lost" : "care");
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

  useEffect(() => {
    function syncTabWithUrl() {
      const currentToken = decodeURIComponent(location.pathname.split("/").filter(Boolean).at(-1) ?? "");
      if (currentToken === links.LOST) setActiveTab("lost");
      if (currentToken === links.CARE) setActiveTab("care");
    }
    window.addEventListener("popstate", syncTabWithUrl);
    return () => window.removeEventListener("popstate", syncTabWithUrl);
  }, [links.CARE, links.LOST]);

  useEffect(() => {
    if (!locationReportOpen || !kakaoMapKey || !locationPickerMapRef.current) return;
    let cancelled = false;

    function renderPicker(latitude: number, longitude: number, accuracy: number | null) {
      if (cancelled || !window.kakao?.maps || !locationPickerMapRef.current) return;
      const center = new window.kakao.maps.LatLng(latitude, longitude);
      const map = new window.kakao.maps.Map(locationPickerMapRef.current, { center, level: 4 });
      map.setMinLevel?.(2);
      map.setMaxLevel?.(6);
      setSelectedReportLocation({ latitude, longitude, accuracy });
      setLocationShareStatus("idle");
      window.kakao.maps.event.addListener(map, "idle", () => {
        if (cancelled) return;
        const nextCenter = map.getCenter();
        setSelectedReportLocation({ latitude: nextCenter.getLat(), longitude: nextCenter.getLng(), accuracy: null });
      });
    }

    function locateAndRender() {
      setLocationShareStatus("locating");
      const fallback = () => renderPicker(care?.lostLocationLat ?? 37.5665, care?.lostLocationLng ?? 126.978, null);
      if (!("geolocation" in navigator)) {
        fallback();
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => renderPicker(position.coords.latitude, position.coords.longitude, position.coords.accuracy),
        fallback,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
      );
    }

    if (window.kakao?.maps) {
      window.kakao.maps.load(locateAndRender);
    } else {
      const scriptUrl = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoMapKey}&autoload=false`;
      let script = document.querySelector<HTMLScriptElement>(`script[src="${scriptUrl}"]`);
      const onLoad = () => window.kakao?.maps.load(locateAndRender);
      if (script) script.addEventListener("load", onLoad, { once: true });
      else {
        script = document.createElement("script");
        script.src = scriptUrl;
        script.async = true;
        script.addEventListener("load", onLoad, { once: true });
        document.head.appendChild(script);
      }
    }

    return () => { cancelled = true; };
  }, [care?.lostLocationLat, care?.lostLocationLng, kakaoMapKey, locationReportOpen]);

  function switchInfoTab(event: MouseEvent<HTMLAnchorElement>, tab: "lost" | "care", token: string) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    window.history.pushState({}, "", `/share/${token}`);
    setActiveTab(tab);
  }

  function movePhoto(direction: -1 | 1) {
    if (photos.length < 2) return;
    setActivePhotoIndex((current) => (current + direction + photos.length) % photos.length);
  }

  async function endLostReport() {
    const confirmed = window.confirm("정말 종료하시겠습니까?\n잔여 기록이 모두 삭제됩니다.");
    if (!confirmed) return;

    try { await invokeFunction("dogs", { action: "lost-location", dogId: dog.id, endReport: true }); } catch { return; }
    const emptyLostSnapshot: LostLocationSnapshot = {
      lostAt: null,
      lostLocationAddress: null,
      lostLocationDistrict: null,
      lostLocationNeighborhood: null,
      lostLocationDetail: null,
    };
    setLostSnapshot(emptyLostSnapshot);
  }

  async function deleteMyDog() {
    const confirmed = window.confirm(`${dog.name} 정보를 삭제할까요?\n사진, 공유 링크, 방명록, 친구/실종 관련 기록도 함께 삭제됩니다.`);
    if (!confirmed) return;

    setDeleteStatus("deleting");
    try {
      await invokeFunction("dogs", { action: "delete", dogId: dog.id });
    } catch {
      setDeleteStatus("failed");
      return;
    }

    router.push("/");
    router.refresh();
  }

  async function shareSelectedLocation() {
    if (!selectedReportLocation) {
      setLocationShareStatus("failed");
      return;
    }
    setLocationShareStatus("sharing");
    try {
      await invokeFunction("share", {
        action: "found-location", slug, latitude: selectedReportLocation.latitude,
        longitude: selectedReportLocation.longitude, accuracy: selectedReportLocation.accuracy,
        note: locationReportNote,
      });
      setLocationShareStatus("shared");
      setLocationReportOpen(false);
      setLocationReportNote("");
      setLocationThanksOpen(true);
    } catch {
      setLocationShareStatus("failed");
    }
  }

  async function savePoster() {
    const activeSlug = activeTab === "lost" ? links.LOST ?? slug : links.CARE ?? slug;
    const shareUrl = `${window.location.origin}/share/${activeSlug}`;
    const qrImage = await QRCode.toDataURL(shareUrl, { width: 260, margin: 1, errorCorrectionLevel: "H", color: { dark: "#3F392F", light: "#FFFFFF" } });
    const isLostPoster = activeTab === "lost";
    const posterTitle = isLostPoster ? `${dog.name} 실종 정보` : `${dog.name} 돌봄 정보`;
    const posterBadge = isLostPoster ? "실종 공유 포스터" : "돌봄 공유 포스터";
    const posterRows = isLostPoster ? [
      { label: "실종 시간", value: getDateTimeLabel(lostSnapshot.lostAt) },
      { label: "실종지", value: lostLocationLabel },
      { label: "복용약", value: getYesNo(care?.takesMedication, "있어요", "없어요") },
      {
        label: "주치 병원",
        value: [care?.primaryHospital, care?.primaryHospitalPhone].filter(Boolean).join(" / ") || "미입력",
      },
      { label: "특이사항", value: care?.emergencyNote || "미입력" },
    ] : [
      { label: "식사", value: care?.mealsPerDay ? `하루 ${care.mealsPerDay}회` : "미입력" },
      { label: "산책", value: care?.walksPerWeek != null ? `일주일 ${care.walksPerWeek}회` : "미입력" },
      { label: "배변", value: getToiletingLabel(care?.toiletingType) },
      { label: "마킹", value: getYesNo(care?.marksIndoors, "해요", "안 해요") },
      { label: "접종", value: getYesNo(care?.fifthVaccineDone, "5차 완료", "미완료") },
      { label: "알러지", value: getYesNo(care?.hasAllergy, "있어요", "없어요") },
      { label: "전달 메모", value: care?.handoffMemo || "미입력" },
    ];
    const careRoutineRows = posterRows.filter((row) => row.label !== "전달 메모");
    const careRowIcons: Record<string, string> = {
      식사: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 10h14l-1.2 7.2A2.2 2.2 0 0 1 15.6 19H8.4a2.2 2.2 0 0 1-2.2-1.8L5 10Z"/><path d="M7 10c.4-3.3 2-5 5-5s4.6 1.7 5 5"/><path d="M4 19h16"/></svg>`,
      산책: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="13" cy="5" r="2"/><path d="m10 21 1-6-3-3 2.5-4 4 2 3-1"/><path d="m11 15 4 2 2 4"/><path d="M8 12 5 15"/></svg>`,
      배변: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8.5 11.5c-2.8 1-4.5 3-4.5 5.2C4 19.1 6.1 21 9 21h6c2.8 0 5-1.7 5-4 0-2.1-1.8-3.8-4.3-4.5"/><path d="M8 12c0-2 1.4-2.7 3-3.2-1.2-1-1.4-2.2-.8-3.4.7-1.4 2.2-2.1 3.8-2.4-.4 2.1.3 3.5 2 4.5 1.3.8 1.3 2.7.2 3.7-1.8 1.6-6 1.8-8.2.8Z"/></svg>`,
      마킹: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6 7-12a7 7 0 1 0-14 0c0 6 7 12 7 12Z"/><circle cx="12" cy="9" r="2.4"/></svg>`,
      접종: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 7 3v5c0 4.7-2.8 8.2-7 10-4.2-1.8-7-5.3-7-10V6l7-3Z"/><path d="m9 12 2 2 4-5"/></svg>`,
      알러지: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 5.8a5.2 5.2 0 0 0-7.4 0L12 7.2l-1.4-1.4a5.2 5.2 0 0 0-7.4 7.4L12 22l8.8-8.8a5.2 5.2 0 0 0 0-7.4Z"/><path d="M12 10v6M9 13h6"/></svg>`,
    };
    const careRowsHtml = careRoutineRows.map((row) => `
      <div class="care-row"><span class="care-row-icon">${careRowIcons[row.label] ?? ""}</span><dt>${escapeXml(row.label)}</dt><dd>${escapeXml(row.value || "미입력")}</dd></div>
    `).join("");
    const posterPhotos = photos.slice(0, isLostPoster ? 5 : 4);
    const photoHtml = posterPhotos.length ? posterPhotos.map((photo, index) => `
      <figure class="${index === 0 ? "main-photo" : "sub-photo"}">
        <img src="${escapeXml(photo.url)}" alt="" />
      </figure>
    `).join("") : `<figure class="main-photo empty-photo"><span>${escapeXml(dog.name.slice(0, 1))}</span></figure>`;
    const logoUrl = `${window.location.origin}/mynameis-logo-240.png`;
    const contactLabel = care?.emergencyContact1 || "연락처 미입력";
    const lostPosterHtml = `
      <main class="poster lost-poster">
        <header class="lost-header">
          <img class="brand-logo" src="${escapeXml(logoUrl)}" alt="mynameis" />
          <span class="help-bubble">도와주세요!</span>
          <h1>${escapeXml(dog.name)}를 찾습니다</h1>
          <p>사랑하는 <strong>${escapeXml(dog.name)}</strong>가 가족 곁으로 돌아올 수 있도록 도와주세요.</p>
        </header>
        <section class="lost-main">
          <div class="lost-photo-wrap">
            ${posterPhotos[0] ? `<img src="${escapeXml(posterPhotos[0].url)}" alt="" />` : `<span>${escapeXml(dog.name.slice(0, 1))}</span>`}
            <div class="photo-message">소중한 우리 가족,<br /><b>${escapeXml(dog.name)}를 꼭 찾아주세요</b></div>
          </div>
          <dl class="lost-details">${posterRowsToHtml(posterRows)}</dl>
        </section>
        <div class="lost-thumbs">${posterPhotos.slice(1).map((photo) => `<figure><img src="${escapeXml(photo.url)}" alt="" /></figure>`).join("")}</div>
        <section class="contact-banner">
          <div class="contact-hope">♡ <span>작은 제보도<br />큰 희망이 됩니다</span></div>
          <div class="contact-copy"><small>${escapeXml(dog.name)}를 보셨거나 보호하고 계신 분은</small><strong>☎ ${escapeXml(contactLabel)}</strong><span>꼭 연락 부탁드립니다</span></div>
        </section>
        <footer class="lost-footer">
          <div class="qr-callout">● QR로 공유<br />페이지 열기</div>
          <img class="lost-qr" src="${qrImage}" alt="" />
          <div class="share-link"><b>공유 링크</b> (복사해서 공유해주세요)<br /><strong>${escapeXml(shareUrl)}</strong></div>
          <p>made with <b>mynameis</b></p>
        </footer>
      </main>`;
    const carePosterHtml = `
      <main class="poster care-poster">
        <header class="care-header"><p>${escapeXml(posterBadge)}</p><h1>${escapeXml(posterTitle)}</h1><span>유치원 · 펫시터에게 미리 보여주기 좋은 돌봄 안내</span></header>
        <div class="care-photo-grid">${photoHtml}</div>
        <dl class="care-rows">${careRowsHtml}</dl>
        <section class="care-memo"><h2><span>▣</span> 전달 메모</h2><p>${escapeXml(care?.handoffMemo || "미입력")}</p></section>
        <section class="care-qr-box"><img src="${qrImage}" alt="" /><div><h2>QR로 공유 페이지 열기</h2><p>${escapeXml(shareUrl)}</p></div></section>
        <footer class="care-made"><span></span><p>made with <b>mynameis</b></p><span></span></footer>
      </main>`;
    const posterWindow = window.open("", "_blank", "width=900,height=1200");
    if (!posterWindow) {
      window.alert("팝업이 차단되어 포스터를 열 수 없어요. 팝업 허용 후 다시 시도해 주세요.");
      return;
    }

    (posterWindow as Window & { html2canvas: typeof html2canvas }).html2canvas = html2canvas;

    posterWindow.document.write(`<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <title>${escapeXml(posterTitle)}</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body { margin: 0; background: #ece9e2; color: #3F392F; font-family: "Apple SD Gothic Neo", Arial, sans-serif; }
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
    .actions { position: fixed; right: 20px; top: 20px; z-index: 9999; display: flex; gap: 8px; }
    .actions button { width: 52px; height: 52px; display: grid; place-items: center; padding: 0; border: 1px solid rgba(255,255,255,.72); border-radius: 50%; background: #3F392F; color: #fff; cursor: pointer; box-shadow: 0 8px 24px rgba(0,0,0,.28); }
    .actions button:hover { background: #d93623; transform: translateY(-1px); }
    .actions button:disabled { opacity: .6; cursor: wait; transform: none; }
    .actions button:focus-visible { outline: 3px solid #ffd133; outline-offset: 3px; }
    .actions svg { width: 25px; height: 25px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .lost-poster { position: relative; display: flex; flex-direction: column; padding: 8mm 9mm 5mm; background: #fffcf7; color: #181818; overflow: hidden; }
    .lost-header { position: relative; text-align: center; }
    .brand-logo { width: 39mm; height: auto; object-fit: contain; margin: 0 auto 4mm; }
    .help-bubble { position: absolute; right: -2mm; top: -9mm; padding: 4mm 7mm; border-radius: 50%; background: #dc301d; color: #fff; font-size: 17px; font-weight: 900; transform: rotate(3deg); }
    .lost-header h1 { margin: 0; color: #d93623; font-size: 27mm; line-height: .94; font-weight: 1000; letter-spacing: -2.2mm; white-space: nowrap; transform: scaleX(.88); }
    .lost-header > p { margin: 4mm 0 6mm; font-size: 5mm; font-weight: 800; letter-spacing: -.25mm; }
    .lost-header > p strong { color: #d93623; }
    .lost-main { display: grid; grid-template-columns: 47% 1fr; gap: 7mm; align-items: stretch; height: 96mm; }
    .lost-photo-wrap { position: relative; overflow: visible; border: 1.3mm solid #d93623; border-radius: 6mm; background: #f2e7d7; }
    .lost-photo-wrap > img { border-radius: 4.5mm; }
    .lost-photo-wrap > span { height: 100%; display: grid; place-items: center; font-size: 30mm; font-weight: 900; color: #d93623; }
    .photo-message { position: absolute; left: -4mm; bottom: -3mm; padding: 3mm 5mm; border: 1mm solid #fff4dc; outline: .7mm solid #d93623; background: #d93623; color: #fff; font-size: 4.1mm; font-weight: 800; line-height: 1.35; transform: rotate(-1.5deg); box-shadow: 0 1mm 2mm rgba(104,25,13,.18); }
    .photo-message b { color: #ffd234; font-size: 5mm; }
    .lost-details { margin: 0; align-self: center; }
    .lost-details .poster-row { grid-template-columns: 28mm 1fr; gap: 0; padding: 4.1mm 0; border-bottom: .35mm dashed #aaa; }
    .lost-details dt { color: #181818; font-size: 4mm; font-weight: 900; }
    .lost-details dt::before { content: "●"; margin-right: 3mm; color: #d93623; }
    .lost-details dd { color: #d93623; font-size: 3.9mm; font-weight: 900; line-height: 1.4; }
    .lost-thumbs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; height: 36mm; margin-top: 7mm; }
    .lost-thumbs figure { border-radius: 5mm; background: #f2e7d7; }
    .contact-banner { display: grid; grid-template-columns: 1fr 1.35fr; align-items: center; min-height: 35mm; margin-top: 5mm; padding: 4mm 8mm; border-radius: 5mm; background: #db321f; color: #fff; }
    .contact-hope { align-self: stretch; display: flex; align-items: center; gap: 4mm; margin: -4mm 0 -4mm -8mm; padding: 4mm 7mm; border-right: .4mm solid rgba(255,255,255,.75); border-radius: 5mm 0 0 5mm; background: #d92f1d; color: #fff; font-size: 17mm; }
    .contact-hope span { font-size: 6mm; line-height: 1.25; font-weight: 900; }
    .contact-copy { display: grid; justify-items: center; gap: 1mm; text-align: center; }
    .contact-copy small { font-size: 3.4mm; font-weight: 800; }
    .contact-copy strong { display: block; min-width: 67mm; padding: 2mm 5mm; border-radius: 8mm; background: #ffd133; color: #252018; font-size: 5.5mm; }
    .contact-copy span { font-size: 4mm; font-weight: 900; }
    .lost-footer { position: relative; display: grid; grid-template-columns: 41mm 26mm 1fr; align-items: center; gap: 4mm; margin-top: 5mm; }
    .qr-callout { padding: 7mm 4mm; border-radius: 5mm 13mm 13mm 5mm; background: #ffc52d; font-size: 4mm; font-weight: 900; line-height: 1.4; }
    .lost-qr { width: 26mm; height: 26mm; }
    .share-link { padding: 4mm; border: .35mm dashed #999; border-radius: 4mm; font-size: 3.2mm; line-height: 1.7; overflow-wrap: anywhere; }
    .share-link b { color: #d93623; font-size: 4mm; }
    .share-link strong { font-size: 3.4mm; }
    .lost-footer > p { position: absolute; right: 0; bottom: -5mm; margin: 0; font-size: 2.7mm; }
    .care-poster { padding: 8mm; border: .45mm solid #eadcc2; background: linear-gradient(135deg,#fffefa,#fffaf0); color: #332e27; }
    .care-header { margin: 0 0 4mm; }
    .care-header p { margin: 0 0 2mm; color: #a9843c; font-size: 4mm; font-weight: 900; }
    .care-header h1 { margin: 0 0 2mm; font-size: 12mm; line-height: 1.05; letter-spacing: -.6mm; }
    .care-header span { color: #8b8378; font-size: 3.7mm; font-weight: 800; }
    .care-photo-grid { display: grid; grid-template-columns: 1.9fr 1fr; grid-template-rows: repeat(3, 30mm); gap: 2mm; height: 94mm; margin-bottom: 3mm; }
    .care-photo-grid figure { border-radius: 4mm; background: #f4ecdc; }
    .care-photo-grid .main-photo { grid-row: 1 / 4; }
    .care-photo-grid .empty-photo { height: 100%; }
    .care-rows { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5mm; margin: 0 0 3mm; }
    .care-row { min-width: 0; display: grid; grid-template-columns: 10mm 22mm 1fr; align-items: center; min-height: 11mm; padding: 1.6mm 3mm; border: .35mm solid #ebdcc0; border-radius: 3mm; background: rgba(255,255,255,.55); }
    .care-row-icon { width: 8mm; height: 8mm; display: grid; place-items: center; color: #bd9342; }
    .care-row-icon svg { width: 7mm; height: 7mm; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .care-row dt { color: #332e27; font-size: 3.6mm; font-weight: 900; }
    .care-row dd { min-width: 0; padding-left: 4mm; border-left: .35mm solid #eadcc2; color: #332e27; font-size: 3.6mm; font-weight: 800; overflow-wrap: anywhere; }
    .care-memo { min-height: 32mm; padding: 4mm; border: .35mm solid #ead9b9; border-radius: 4mm; background: rgba(255,252,244,.8); }
    .care-memo h2 { display: flex; align-items: center; gap: 3mm; margin: 0 0 3mm; font-size: 4.2mm; }
    .care-memo h2 span { width: 8mm; height: 8mm; display: grid; place-items: center; border-radius: 50%; background: #fff; color: #ad8740; box-shadow: 0 1mm 3mm rgba(122,93,43,.12); }
    .care-memo p { margin: 0; font-size: 3.4mm; font-weight: 700; line-height: 1.55; white-space: pre-wrap; }
    .care-qr-box { display: grid; grid-template-columns: 31mm 1fr; align-items: center; gap: 7mm; min-height: 40mm; margin-top: 3mm; padding: 3mm 5mm; border: .35mm solid #ead9b9; border-radius: 4mm; background: rgba(255,255,255,.62); }
    .care-qr-box > img { width: 29mm; height: 29mm; padding: 2mm; border-radius: 3mm; background: #fff; box-shadow: 0 1mm 3mm rgba(93,73,39,.1); }
    .care-qr-box h2 { margin: 0 0 3mm; font-size: 4.5mm; }
    .care-qr-box p { margin: 0; padding: 3mm 4mm; border: .35mm solid #e2cfa9; border-radius: 3mm; background: #fffdf8; font-family: Arial,sans-serif; font-size: 3.1mm; font-weight: 700; overflow-wrap: anywhere; }
    .care-made { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 4mm; margin-top: 3mm; color: #aaa197; }
    .care-made span { height: .3mm; background: #eadfca; }
    .care-made p { margin: 0; font-size: 2.8mm; }
    @media print { .actions { display: none; } body { background: #fff; } .poster { break-after: avoid; } }
  </style>
</head>
<body>
  <div class="actions">
    <button type="button" onclick="savePosterImage(this)" aria-label="포스터를 사진으로 저장하기" title="사진으로 저장하기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h16v16H4z"/><circle cx="9" cy="9" r="2"/><path d="m4 17 4-4 3 3 2-2 7 6"/><path d="M12 2v7"/><path d="m9 6 3 3 3-3"/></svg></button>
    <button type="button" onclick="window.print()" aria-label="PDF로 저장하기" title="PDF로 저장하기"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/><path d="M18 12h.01"/></svg></button>
  </div>
  ${isLostPoster ? lostPosterHtml : carePosterHtml}
  <script>
    async function imageAsDataUrl(src) {
      if (!src || src.indexOf("data:") === 0) return src;
      const response = await fetch(src, { mode: "cors" });
      if (!response.ok) throw new Error("이미지를 불러오지 못했습니다.");
      const blob = await response.blob();
      return await new Promise(function(resolve, reject) {
        const reader = new FileReader();
        reader.onload = function() { resolve(reader.result); };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    }

    async function savePosterImage(button) {
      const originalTitle = button.title;
      button.disabled = true;
      button.title = "이미지 생성 중";
      try {
        const poster = document.querySelector(".poster");
        if (!poster || typeof window.html2canvas !== "function") throw new Error("이미지 캡처를 준비하지 못했습니다.");
        await Promise.all(Array.from(poster.querySelectorAll("img")).map(async function(img) {
          img.src = await imageAsDataUrl(img.currentSrc || img.src);
        }));
        await document.fonts.ready;
        const canvas = await window.html2canvas(poster, {
          scale: 2,
          useCORS: true,
          backgroundColor: null,
          logging: false
        });
        const png = await new Promise(function(resolve) { canvas.toBlob(resolve, "image/png", 1); });
        if (!png) throw new Error("이미지 생성에 실패했습니다.");
        const downloadUrl = URL.createObjectURL(png);
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = ${JSON.stringify(`mynameis-${dog.name}-${isLostPoster ? "실종" : "돌봄"}-포스터.png`)};
        link.click();
        setTimeout(function() { URL.revokeObjectURL(downloadUrl); }, 1000);
      } catch (error) {
        alert("사진 저장에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      } finally {
        button.disabled = false;
        button.title = originalTitle;
      }
    }
    window.addEventListener("load", () => setTimeout(() => window.print(), 350));
  </script>
</body>
</html>`);
    posterWindow.document.close();
  }

  return (
    <section className={`basic-share-profile${activeTab === "lost" ? " has-lost-remote" : ""}`}>
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
          <div className="basic-share-header">
            <a className="basic-share-brand" href="/" aria-label="mynameis 홈">
              <Image className="wordmark-logo" src="/mynameis-logo-240.png" alt="mynameis" width={72} height={25} />
            </a>
            <button className="share-print-button" type="button" aria-label="인쇄" title="인쇄" onClick={() => void savePoster()}><RiPrinterLine aria-hidden="true" /></button>
          </div>
          <div className="basic-share-copy">
            {hasLostReportDetails ? <p className="lost-status-message"><RiAlarmWarningLine aria-hidden="true" />현재 실종된 상태입니다.</p> : null}
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
          <div className="basic-info-tabs" role="tablist" aria-label={`${dog.name} 추가 정보`} data-active={activeTab}>
            <span className="basic-info-tab-slider" aria-hidden="true" />
            {links.LOST ? <Link role="tab" aria-selected={activeTab === "lost"} href={`/share/${links.LOST}`} onClick={(event) => switchInfoTab(event, "lost", links.LOST!)}><RiAlarmWarningLine aria-hidden="true" />실종</Link> : null}
            {links.CARE ? <Link role="tab" aria-selected={activeTab === "care"} href={`/share/${links.CARE}`} onClick={(event) => switchInfoTab(event, "care", links.CARE!)}><RiHeart3Line aria-hidden="true" />돌봄</Link> : null}
          </div>
        ) : null}
        <section className="basic-tab-panel">
          {activeTab === "lost" ? (
            <>
              <h2>실종 정보</h2>
              {canEdit && !hasLostReportDetails ? <button className="lost-place-button lost-info-register-button" type="button" onClick={() => setLostModalOpen(true)}>실종 등록</button> : null}
              {hasLostReportDetails ? (
                <div className="lost-summary-card">
                  <div className="lost-summary-item">
                    <RiAlarmWarningLine aria-hidden="true" />
                    <div><span>실종 일시</span><strong>{getDateTimeLabel(lostSnapshot.lostAt)}</strong></div>
                  </div>
                  <div className="lost-summary-item">
                    <RiMapPinLine aria-hidden="true" />
                    <div><span>마지막 확인 위치</span><strong>{lostLocationLabel}</strong></div>
                  </div>
                  {canEdit ? (
                    <div className="lost-summary-actions">
                      <button className="edit-lost-report-button" type="button" onClick={() => setLostModalOpen(true)}>실종 정보 수정</button>
                      <button className="end-lost-report-button" type="button" onClick={() => void endLostReport()}>실종 신고 종료</button>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {canEdit && foundLocationReports.length > 0 ? <FoundLocationReports reports={foundLocationReports} kakaoKey={kakaoMapKey} /> : null}
              {canEdit ? (
                <>
                  <dl><dt><InfoLabel icon={RiPhoneLine}>긴급 연락처1</InfoLabel></dt><dd>{care?.emergencyContact1 || "미입력"}</dd></dl>
                  <dl><dt><InfoLabel icon={RiPhoneLine}>긴급 연락처2</InfoLabel></dt><dd>{care?.emergencyContact2 || "미입력"}</dd></dl>
                </>
              ) : null}
              <dl><dt><InfoLabel icon={RiCapsuleLine}>복용약 여부</InfoLabel></dt><dd><BooleanValue value={care?.takesMedication} trueLabel="있어요" falseLabel="없어요" /></dd></dl>
              <dl><dt><InfoLabel icon={RiHospitalLine}>주치 병원</InfoLabel></dt><dd>{care?.primaryHospital || "미입력"}</dd></dl>
              {care?.primaryHospitalAddress ? <dl><dt><InfoLabel icon={RiMapPinLine}>병원 주소</InfoLabel></dt><dd>{care.primaryHospitalAddress}</dd></dl> : null}
              {care?.primaryHospitalPhone ? <dl><dt><InfoLabel icon={RiPhoneLine}>병원 전화</InfoLabel></dt><dd>{care.primaryHospitalPhone}</dd></dl> : null}
              <dl><dt><InfoLabel icon={RiFileTextLine}>특이사항</InfoLabel></dt><dd>{care?.emergencyNote || "미입력"}</dd></dl>
              <p className="lost-contact-notice">
                연락처는 화면에 바로 보이지 않아요.
              </p>
            </>
          ) : (
            <>
              <h2>돌봄 정보</h2>
              <dl><dt><InfoLabel icon={RiRestaurantLine}>1일 식사 횟수</InfoLabel></dt><dd>{care?.mealsPerDay ? `${care.mealsPerDay}회` : "미입력"}</dd></dl>
              <dl><dt><InfoLabel icon={RiWalkLine}>일주일 산책 횟수</InfoLabel></dt><dd>{care?.walksPerWeek != null ? `${care.walksPerWeek}회` : "미입력"}</dd></dl>
              <dl><dt><InfoLabel icon={RiFootprintLine}>배변 방식</InfoLabel></dt><dd>{getToiletingLabel(care?.toiletingType)}</dd></dl>
              <dl><dt><InfoLabel icon={RiHomeSmileLine}>마킹 여부</InfoLabel></dt><dd><BooleanValue value={care?.marksIndoors} trueLabel="해요" falseLabel="안 해요" /></dd></dl>
              <dl><dt><InfoLabel icon={RiShieldCheckLine}>5차 필수 접종</InfoLabel></dt><dd><BooleanValue value={care?.fifthVaccineDone} trueLabel="완료" falseLabel="미완료" /></dd></dl>
              <dl><dt><InfoLabel icon={RiSchoolLine}>유치원 경험</InfoLabel></dt><dd><BooleanValue value={care?.daycareExperience} trueLabel="있어요" falseLabel="없어요" /></dd></dl>
              <dl><dt><InfoLabel icon={RiAlertLine}>알러지 여부</InfoLabel></dt><dd><BooleanValue value={care?.hasAllergy} trueLabel="있어요" falseLabel="없어요" /></dd></dl>
              <dl><dt><InfoLabel icon={RiStickyNoteLine}>전달 메모</InfoLabel></dt><dd>{care?.handoffMemo || "미입력"}</dd></dl>
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
        <Guestbook slug={slug} dogId={dog.id} dogName={dog.name} initialEntries={guestbookEntries} canWrite={canWriteGuestbook} />
        {canEdit ? (
          <div className="basic-owner-actions">
            <Link className="basic-edit-button" href={`/pets/${dog.id}/edit`}>수정하기</Link>
            <button className="delete-my-dog-button" type="button" onClick={() => void deleteMyDog()} disabled={deleteStatus === "deleting"}>
              {deleteStatus === "deleting" ? "삭제 중..." : "내새꾸삭제"}
            </button>
          </div>
        ) : null}
        {deleteStatus === "failed" ? <p className="delete-my-dog-error" role="alert">삭제하지 못했어요. 잠시 후 다시 시도해 주세요.</p> : null}
        <Link className="made-with" href="/">made with <b>mynameis</b></Link>
      </div>
      {activeTab === "lost" ? (
        <footer className="share-remote-footer" aria-label="빠른 연락">
          {primaryContact ? <a href={`tel:${primaryContact}`}>전화하기</a> : <span aria-disabled="true">전화하기</span>}
          <button type="button" onClick={() => { setSelectedReportLocation(null); setLocationShareStatus("idle"); setLocationReportOpen(true); }} disabled={locationShareStatus === "sharing"}>
            {locationShareStatus === "sharing" ? "제보 중" : locationShareStatus === "shared" ? "제보 완료" : locationShareStatus === "failed" ? "다시 제보" : "목격 위치 제보"}
          </button>
          {instagramUrl ? <a className="instagram-footer-link" href={instagramUrl} target="_blank" rel="noopener noreferrer"><Image src="/social/instagram-icon.png" alt="" width={18} height={18} />인스타</a> : <span className="instagram-footer-link" aria-disabled="true"><Image src="/social/instagram-icon.png" alt="" width={18} height={18} />인스타</span>}
        </footer>
      ) : null}
      {locationReportOpen ? (
        <div className="lost-modal-backdrop" role="presentation" onMouseDown={() => setLocationReportOpen(false)}>
          <div className="location-report-modal" role="dialog" aria-modal="true" aria-labelledby="location-report-title" onMouseDown={(event) => event.stopPropagation()}>
            <div className="lost-modal-header">
              <h2 id="location-report-title">위치 제보</h2>
              <button type="button" aria-label="닫기" onClick={() => setLocationReportOpen(false)}>×</button>
            </div>
            <p>지도를 움직여 중앙 핀을 실제 목격 위치에 맞춰주세요.</p>
            {kakaoMapKey ? (
              <div className="location-picker-wrap">
                <div className="location-picker-map" ref={locationPickerMapRef} aria-label="목격 위치 선택 지도" />
                <span className="location-picker-pin" aria-hidden="true"><RiMapPinLine /></span>
                {locationShareStatus === "locating" ? <span className="location-picker-loading">현재 위치를 찾고 있어요…</span> : null}
              </div>
            ) : <p className="location-picker-error" role="alert">지도를 불러올 수 없어요.</p>}
            <small className="location-picker-help">현재 위치에 핀이 먼저 표시됩니다. 지도를 드래그하면 핀 위치가 변경돼요.</small>
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
              <button type="button" onClick={() => void shareSelectedLocation()} disabled={locationShareStatus === "sharing" || locationShareStatus === "locating" || !selectedReportLocation}>{locationShareStatus === "sharing" ? "제보 중..." : "이 위치로 제보"}</button>
            </div>
          </div>
        </div>
      ) : null}
      {locationThanksOpen ? (
        <div className="location-thanks-backdrop" role="presentation" onMouseDown={() => setLocationThanksOpen(false)}>
          <div className="location-thanks-alert" role="alertdialog" aria-modal="true" aria-labelledby="location-thanks-title" aria-describedby="location-thanks-description" onMouseDown={(event) => event.stopPropagation()}>
            <span className="location-thanks-icon" aria-hidden="true"><RiCheckLine /></span>
            <div>
              <h2 id="location-thanks-title">제보해주셔서 감사합니다</h2>
              <p id="location-thanks-description">소중한 위치 정보를 보호자에게 전달했어요.</p>
            </div>
            <button type="button" onClick={() => setLocationThanksOpen(false)}>확인</button>
          </div>
        </div>
      ) : null}
      {lostModalOpen ? <LostLocationModal dogId={dog.id} initial={lostSnapshot} onClose={() => setLostModalOpen(false)} onSaved={setLostSnapshot} /> : null}
    </section>
  );
}
