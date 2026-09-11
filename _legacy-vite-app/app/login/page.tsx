import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/login-form";
import { SocialLoginPanel } from "@/components/social-login-panel";
import { getHomeMode } from "@/lib/home-mode";

export const metadata: Metadata = { title: "로그인", description: "mynameis에 로그인하고 나만의 프로필을 관리하세요.", robots: { index: false, follow: true } };

export default function LoginPage() {
  const homeMode = getHomeMode();
  return (
    <div className="login-page">
      {homeMode === "tempmode" ? (
        <section className="login-card temp-login-card">
          <Link className="login-brand" href="/">
            <Image className="wordmark-logo" src="/mynameis-logo.png" alt="mynameis" width={122} height={42} priority />
          </Link>
          <h1>우리 아이 정보를 한눈에 봐요</h1>
          <p>간편 로그인하고 이름표와 돌봄 정보를 관리하세요.</p>
          <SocialLoginPanel />
        </section>
      ) : <LoginForm />}
    </div>
  );
}
