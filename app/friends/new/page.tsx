import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "친구 등록", robots: { index: false, follow: false } };

export default async function NewFriendPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="friend-registration-page">
      <section className="friend-registration-card">
        <span>친구 이름표</span><h1>새로운 친구를 추가해요</h1><p>등록 방법을 선택해 주세요.</p>
        <button type="button"><i aria-hidden>▦</i><b>QR 코드 스캔</b><small>친구의 이름표 QR을 스캔해요</small></button>
        <button type="button"><i aria-hidden>↗</i><b>공유 링크 입력</b><small>받은 mynameis 링크를 입력해요</small></button>
        <button type="button" disabled><i aria-hidden>#</i><b>초대 코드</b><small>곧 사용할 수 있어요</small></button>
      </section>
    </div>
  );
}
