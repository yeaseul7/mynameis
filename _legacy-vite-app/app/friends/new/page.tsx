import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FriendInviteForm } from "@/components/friend-invite-form";
import { getCurrentUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "친구 등록", robots: { index: false, follow: false } };

export default async function NewFriendPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="friend-registration-page">
      <section className="friend-registration-card">
        <span>친구 이름표</span>
        <h1>초대코드로 친구를 추가해요</h1>
        <p>친구 이름표에 초대코드를 복사해서 붙여넣어주세요</p>
        <FriendInviteForm />
      </section>
    </div>
  );
}
