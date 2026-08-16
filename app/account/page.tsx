import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountDeleteButton, AccountSignOutButton } from "@/components/account-sign-out-button";
import { getCurrentUser } from "@/lib/auth/server";

export const metadata: Metadata = {
  title: "계정관리",
};

function formatDate(value?: string) {
  if (!value) return "확인 중";
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric" }).format(new Date(value));
}

function getProviderLabel(provider?: string) {
  if (provider === "kakao") return "카카오";
  if (provider === "google") return "구글";
  if (provider === "email") return "이메일";
  return provider ?? "확인 중";
}

function getInitial(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || "U";
}

export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const displayName = user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "보호자";
  const provider = user.app_metadata?.provider as string | undefined;

  return (
    <main className="account-page">
      <section className="account-panel" aria-labelledby="account-title">
        <div className="account-hero">
          <div className="account-avatar" aria-hidden>{getInitial(displayName)}</div>
          <div>
            <p className="account-kicker">계정관리</p>
            <h1 id="account-title">{displayName}님</h1>
            <p>이름표와 공유 링크를 관리하는 보호자 계정이에요.</p>
          </div>
        </div>

        <div className="account-info-grid" aria-label="계정 정보">
          <article>
            <span>이메일</span>
            <strong>{user.email ?? "등록된 이메일 없음"}</strong>
          </article>
          <article>
            <span>로그인 방식</span>
            <strong>{getProviderLabel(provider)}</strong>
          </article>
          <article>
            <span>가입일</span>
            <strong>{formatDate(user.created_at)}</strong>
          </article>
        </div>

        <div className="account-actions">
          <div className="account-main-actions">
            <Link className="account-primary-link" href="/">내 이름표 보기</Link>
            <AccountSignOutButton />
          </div>
          <AccountDeleteButton />
        </div>
      </section>
    </main>
  );
}
