import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SocialLoginPanel } from "@/components/social-login-panel";

export const metadata: Metadata = { title: "로그인", description: "mynameis에 로그인하고 나만의 프로필을 관리하세요.", robots: { index: false, follow: true } };

export default function LoginPage() {
  return (
    <div className="login-page">
      <section className="login-card temp-login-card">
        <a className="login-contact" href="https://mail.google.com/mail/?view=cm&fs=1&to=sientobiz@gmail.com&su=mynameis%20문의" target="_blank" rel="noreferrer">문의하기</a>
        <div className="login-intro">
          <Link className="login-brand" href="/">
            <Image className="wordmark-logo" src="/mynameis-logo-240.png" alt="mynameis" width={170} height={59} priority />
          </Link>
          <p>우리 아이의 다정한 이름표</p>
          <h1>반가워요!</h1>
        </div>
        <SocialLoginPanel />
      </section>
    </div>
  );
}
