import { useEffect, useState } from "react";
import { BasicShareProfile } from "@/components/basic-share-profile";
import type { GuestbookEntry } from "@/components/guestbook";
import type { FoundLocationReport } from "@/components/found-location-reports";
import type { DogProfile, DogPublicLinkType } from "@/lib/pets/types";
import { getDogByPublicToken } from "@/lib/pets/service";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { RouteSkeleton } from "@/src/components/route-skeleton";
import { createBrandedQrDataUrl } from "@/lib/qr/create-branded-qr";

type Data = { dog: DogProfile; mode: "basic" | "care" | "lost"; canEdit: boolean; canWriteGuestbook: boolean; links: Partial<Record<DogPublicLinkType, string>>; entries: GuestbookEntry[]; reports: FoundLocationReport[] };

async function loadShare(slug: string): Promise<Data | null> {
  const supabase = createBrowserSupabaseClient();
  const publicDog = await getDogByPublicToken(supabase, slug);
  if (!publicDog) return null;
  const { dog, publicLink } = publicDog;
  const [{ data: auth }, { data: linkRows }, { data: entryRows }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("dog_public_links").select("type,token").eq("dog_id", dog.id).eq("is_active", true).is("revoked_at", null),
    supabase.from("dog_guestbook_entries").select("id,author_name,message,created_at,author_id,parent_id").eq("dog_id", dog.id).is("hidden_at", null).is("deleted_at", null).order("created_at", { ascending: false }).limit(50),
  ]);
  const canEdit = auth.user?.id === dog.ownerId;
  const canWriteGuestbook = Boolean(auth.user);
  const links = Object.fromEntries((linkRows ?? []).map(row => [row.type, row.token])) as Partial<Record<DogPublicLinkType, string>>;
  const entries = (entryRows ?? []).map(({ author_id, ...entry }) => ({ ...entry, is_mine: auth.user?.id === author_id })) as GuestbookEntry[];
  let reports: FoundLocationReport[] = [];
  if (canEdit) {
    const { data } = await supabase.from("dog_found_location_reports").select("id,latitude,longitude,accuracy_meters,note,created_at").eq("dog_id", dog.id).order("created_at", { ascending: false }).limit(50);
    reports = (data ?? []).map(r => ({ id: r.id, latitude: Number(r.latitude), longitude: Number(r.longitude), accuracyMeters: r.accuracy_meters == null ? null : Number(r.accuracy_meters), note: r.note, createdAt: r.created_at }));
  }
  return { dog, mode: publicLink.type === "LOST" ? "lost" : publicLink.type === "CARE" ? "care" : "basic", canEdit, canWriteGuestbook, links, entries, reports };
}

export function SharePage({ slug }: { slug: string }) {
  const [data, setData] = useState<Data | null | undefined>();
  const [qr, setQr] = useState<string>();
  useEffect(() => { loadShare(slug).then(setData); }, [slug]);
  useEffect(() => {
    if (new URLSearchParams(location.search).get("view") !== "qr" || !data) return;
    createBrandedQrDataUrl(`${location.origin}/share/${slug}`, data.mode === "lost" ? "lost" : "care").then(setQr);
  }, [data, slug]);
  if (data === undefined) return <RouteSkeleton variant="share" label="이름표를 불러오고 있어요" />;
  if (!data) return <div className="shared-page"><section className="shared-profile"><a className="share-brand" href="/"><img src="/mynameis-logo.png" alt="mynameis" width="72" /></a><h1>이름표를 찾을 수 없어요</h1><p>공유 링크가 만료되었거나 접근할 수 없는 프로필이에요.</p></section></div>;
  if (new URLSearchParams(location.search).get("view") === "qr") {
    const isLost = data.mode === "lost";
    return <div className={`shared-page qr-page ${isLost ? "lost" : "care"}`}><section className="qr-card"><span>{isLost ? "실종" : "돌봄"} 이름표</span><h1>{data.dog.name}의 {isLost ? "실종" : "돌봄"} QR</h1><p>휴대폰 카메라로 스캔하면 공유 페이지가 열립니다.</p><div className="branded-qr-frame">{qr ? <img src={qr} alt={`${isLost ? "실종" : "돌봄"} 공유 QR 코드`} width="360" height="360" /> : <div className="branded-qr-loading" aria-label="QR 생성 중" />}</div><a className="qr-download-link" href={qr} download={`mynameis-${isLost ? "lost" : "care"}-qr.png`} aria-disabled={!qr}>사진으로 저장하기</a><a href={`/share/${slug}`}>공유 페이지 확인</a></section></div>;
  }
  return <div className="shared-page basic-shared-page"><BasicShareProfile dog={data.dog} mode={data.mode} canEdit={data.canEdit} links={data.links} slug={slug} guestbookEntries={data.entries} canWriteGuestbook={data.canWriteGuestbook} foundLocationReports={data.reports} kakaoMapKey={import.meta.env.VITE_KAKAO_JAVASCRIPT_KEY} /></div>;
}
