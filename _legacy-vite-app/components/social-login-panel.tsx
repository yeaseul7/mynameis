"use client";

import Image from "next/image";
import { useState } from "react";
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
      <button type="button" aria-label="카카오 로그인" onClick={() => login("kakao")} disabled={loading !== null}>
        <Image src="/kakao-signin-tempmode.png" alt="" width={183} height={45} priority />
      </button>
      <button type="button" aria-label="Google 로그인" onClick={() => login("google")} disabled={loading !== null}>
        <Image src="/google-signin-wide.png" alt="" width={203} height={45} priority />
      </button>
      {message && <p role="alert">{message}</p>}
    </section>
  );
}
