"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signInWithEmail, signInWithProvider, signUpWithEmail } from "@/lib/auth/client";

type Provider = "kakao" | "google";

export function LoginForm({ variant = "card" }: { variant?: "card" | "inline" }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function socialLogin(provider: Provider) {
    setLoading(provider); setMessage("");
    const { error } = await signInWithProvider(provider);
    if (error) { setMessage(error.message); setLoading(null); }
  }

  async function emailAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading("email"); setMessage("");
    const data = new FormData(event.currentTarget);
    const email = String(data.get("email")).trim();
    const password = String(data.get("password"));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("올바른 이메일 주소를 입력해 주세요.");
      setLoading(null);
      return;
    }
    if (password.length < 6) {
      setMessage("비밀번호는 6자 이상 입력해 주세요.");
      setLoading(null);
      return;
    }
    const result = mode === "login"
      ? await signInWithEmail(email, password)
      : await signUpWithEmail(email, password);
    if (result.error) setMessage(result.error.message);
    else if (mode === "signup" && !result.data.session) setMessage("인증 메일을 확인해 주세요.");
    else { router.push("/"); router.refresh(); }
    setLoading(null);
  }

  return (
    <section className={`login-card${variant === "inline" ? " login-inline" : ""}`}>
      {variant === "card" && <>
        <Link className="login-brand" href="/"><Image className="wordmark-logo" src="/mynameis-logo-240.png" alt="mynameis" width={122} height={42} priority /></Link>
        <h1>{mode === "login" ? "우리 아이 정보를 한눈에 봐요" : "우리 아이의 이름표를 만들어요"}</h1>
        <p>{mode === "login" ? "로그인하고 이름표와 돌봄 정보를 관리하세요." : "계정을 만들고 첫 이름표를 등록하세요."}</p>
        <div className="social-buttons">
          <button className="social kakao kakao-image-button" aria-label="카카오로 계속하기" onClick={() => socialLogin("kakao")} disabled={!!loading}><Image src="/kakao-login.png" alt="" width={90} height={45} /></button>
          <button className="social google google-image-button" onClick={() => socialLogin("google")} disabled={!!loading}><span className="google-icon-crop" aria-hidden><Image src="/google-login.png" alt="" width={30} height={30} /></span><span>Google 로그인</span></button>
        </div>
        <div className="divider"><span>또는 이메일로</span></div>
      </>}
      <form onSubmit={emailAuth}>
        <label>이메일<input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></label>
        <label>비밀번호<input name="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} minLength={6} placeholder="6자 이상 입력" required /></label>
        <button className="button primary submit" disabled={!!loading}>{loading === "email" ? "처리 중..." : mode === "login" ? "이메일로 로그인" : "이메일로 가입"}</button>
      </form>
      {message && <p className="form-message" role="alert">{message}</p>}
      {mode === "login" ? (
        <div className="account-links">
          <button type="button" onClick={() => { setMode("signup"); setMessage(""); }}>회원가입</button>
          <div>
            <button type="button" onClick={() => setMessage("가입한 이메일 주소를 입력한 뒤 비밀번호 재설정을 진행해 주세요.")}>비밀번호 재설정</button>
            <span aria-hidden>|</span>
            <button type="button" onClick={() => setMessage("mynameis 아이디는 가입할 때 사용한 이메일 주소예요.")}>아이디 찾기</button>
          </div>
        </div>
      ) : (
        <button className="mode-toggle" type="button" onClick={() => { setMode("login"); setMessage(""); }}>이미 계정이 있나요? 로그인</button>
      )}
      {variant === "inline" && <div className="inline-socials">
        <button type="button" className="mini-social kakao kakao-image-button" aria-label="카카오 로그인" onClick={() => socialLogin("kakao")} disabled={!!loading}><Image src="/kakao-login.png" alt="" width={72} height={36} /></button>
        <button type="button" className="mini-social google google-image-button" onClick={() => socialLogin("google")} disabled={!!loading}><span className="google-icon-crop" aria-hidden><Image src="/google-login.png" alt="" width={27} height={27} /></span><span>Google 로그인</span></button>
      </div>}
    </section>
  );
}
