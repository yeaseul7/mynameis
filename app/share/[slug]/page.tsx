import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { BasicShareProfile } from "@/components/basic-share-profile";
import type { FoundLocationReport } from "@/components/found-location-reports";
import { getCurrentUser } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDogByPublicToken } from "@/lib/pets/service";
import type { GuestbookEntry } from "@/components/guestbook";
import type { DogPublicLinkType } from "@/lib/pets/types";

type ShareMode = "basic" | "care" | "lost";

function getShareMode(type: DogPublicLinkType): ShareMode {
  if (type === "LOST") return "lost";
  if (type === "CARE") return "care";
  return "basic";
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: "이름표",
    description: "반려동물의 기본, 돌봄, 실종 정보를 확인하세요.",
    alternates: { canonical: `/share/${slug}` },
    openGraph: { title: "mynameis 이름표", description: "우리 아이의 정보를 확인하세요.", url: `/share/${slug}` },
  };
}

async function getSiblingLinks(dogId: string) {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("dog_public_links")
    .select("type,token")
    .eq("dog_id", dogId)
    .eq("is_active", true)
    .is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

  return Object.fromEntries((data ?? []).map((row) => [row.type as DogPublicLinkType, row.token as string])) as Partial<Record<DogPublicLinkType, string>>;
}

async function getGuestbookEntries(dogId: string, userId?: string): Promise<GuestbookEntry[]> {
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("dog_guestbook_entries")
    .select("id,author_name,message,created_at,author_id")
    .eq("dog_id", dogId)
    .is("hidden_at", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  return (data ?? []).map(({ author_id, ...entry }) => ({
    ...entry,
    is_mine: Boolean(userId && author_id === userId),
  })) as GuestbookEntry[];
}

async function getFoundLocationReports(dogId: string, canEdit: boolean): Promise<FoundLocationReport[]> {
  if (!canEdit) return [];
  const supabase = await createServerSupabaseClient();
  const { data } = await supabase
    .from("dog_found_location_reports")
    .select("id,latitude,longitude,accuracy_meters,note,created_at")
    .eq("dog_id", dogId)
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((report) => ({
    id: report.id as string,
    latitude: Number(report.latitude),
    longitude: Number(report.longitude),
    accuracyMeters: report.accuracy_meters == null ? null : Number(report.accuracy_meters),
    note: report.note as string | null,
    createdAt: report.created_at as string,
  }));
}

export default async function SharedProfile({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ view?: string }> }) {
  const { slug } = await params;
  const { view } = await searchParams;
  const publicDog = await getDogByPublicToken(await createServerSupabaseClient(), slug);

  if (!publicDog) {
    return (
      <div className="shared-page">
        <section className="shared-profile">
          <Link className="share-brand" href="/" aria-label="mynameis 홈"><Image className="wordmark-logo" src="/mynameis-logo.png" alt="mynameis" width={96} height={33} /></Link>
          <h1>이름표를 찾을 수 없어요</h1>
          <p>공유 링크가 만료되었거나 접근할 수 없는 프로필이에요.</p>
          <Link className="made-with" href="/">made with <b>mynameis</b></Link>
        </section>
      </div>
    );
  }

  if (view === "qr") {
    const qrMode = publicDog.publicLink.type === "LOST" ? "lost" : "care";
    const requestHeaders = await headers();
    const host = requestHeaders.get("host") ?? "localhost:3004";
    const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const shareUrl = `${protocol}://${host}/share/${slug}`;
    const qrImage = await QRCode.toDataURL(shareUrl, { width: 360, margin: 2, errorCorrectionLevel: "H", color: { dark: "#3F392F", light: "#FFFFFF" } });
    const isLost = qrMode === "lost";

    return (
      <div className="shared-page qr-page">
        <section className="qr-card">
          <span>{isLost ? "실종 이름표" : "관리 이름표"}</span>
          <h1>{isLost ? "실종 QR" : "관리 QR"}</h1>
          <p>휴대폰 카메라로 스캔하면 공유 페이지가 열립니다.</p>
          <img src={qrImage} alt={`${isLost ? "실종" : "관리"} 공유 QR 코드`} width="360" height="360" />
          <a className="qr-download-link" href={qrImage} download={`mynameis-${isLost ? "lost" : "care"}-qr.png`}>사진으로 저장하기</a>
          <Link href={`/share/${slug}`}>공유 페이지 확인</Link>
        </section>
      </div>
    );
  }

  const { dog, publicLink } = publicDog;
  const mode = getShareMode(publicLink.type);
  const user = await getCurrentUser();
  const canEdit = user?.id === dog.ownerId;
  const links = await getSiblingLinks(dog.id);
  const guestbookEntries = await getGuestbookEntries(dog.id, user?.id);
  const foundLocationReports = await getFoundLocationReports(dog.id, canEdit);

  return <div className="shared-page basic-shared-page"><BasicShareProfile dog={dog} mode={mode} canEdit={canEdit} links={links} slug={slug} guestbookEntries={guestbookEntries} canWriteGuestbook={Boolean(user)} foundLocationReports={foundLocationReports} kakaoMapKey={process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY} /></div>;
}
