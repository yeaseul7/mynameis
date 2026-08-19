"use client";

import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { RiKakaoTalkFill } from "react-icons/ri";
import { signInWithProvider } from "@/lib/auth/client";

type Provider = "kakao" | "google";

export function SocialLoginPanel() {
  const [loading, setLoading] = useState<Provider | null>(null);
  const [message, setMessage] = useState("");

  async function login(provider: Provider) {
    setLoading(provider);
    setMessage("");
    const { error } = await signInWithProvider(provider);
    if (error) {
      setMessage("로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setLoading(null);
    }
  }

  return (
    <section className="social-login-panel" aria-label="간편 로그인">
      <button className="provider-login kakao-provider" type="button" aria-label="카카오 로그인" onClick={() => login("kakao")} disabled={loading !== null}>
        <RiKakaoTalkFill aria-hidden="true" /><span>카카오로 계속하기</span>
      </button>
      <button className="provider-login google-provider" type="button" aria-label="Google 로그인" onClick={() => login("google")} disabled={loading !== null}>
        <FcGoogle aria-hidden="true" /><span>Google로 계속하기</span>
      </button>
      {message && <p role="alert">{message}</p>}
      <p className="login-terms">계속하면 <a href="/terms">이용약관</a>과 <a href="/privacy">개인정보처리방침</a>에 동의하게 됩니다.</p>
    </section>
  );
}
