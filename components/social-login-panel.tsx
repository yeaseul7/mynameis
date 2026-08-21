"use client";

import { FormEvent, useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { RiKakaoTalkFill } from "react-icons/ri";
import { sendPasswordResetEmail, signInWithEmail, signInWithProvider, signUpWithEmail } from "@/lib/auth/client";

type Provider = "kakao" | "google";

export function SocialLoginPanel() {
  const [loading, setLoading] = useState<Provider | "email" | null>(null);
  const [message, setMessage] = useState("");
  const [resetMode, setResetMode] = useState(false);
  const [signupMode, setSignupMode] = useState(false);

  async function login(provider: Provider) {
    setLoading(provider);
    setMessage("");
    const { error } = await signInWithProvider(provider);
    if (error) {
      setMessage("로그인을 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setLoading(null);
    }
  }

  async function emailLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading === "email") return;
    setLoading("email");
    setMessage("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");

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
    if (signupMode && password !== confirmPassword) {
      setMessage("비밀번호가 서로 일치하지 않아요.");
      setLoading(null);
      return;
    }

    try {
      const result = signupMode
        ? await signUpWithEmail(email, password)
        : await signInWithEmail(email, password);
      const { error } = result;
      if (error) {
        setMessage(error.message.toLowerCase().includes("invalid login credentials")
          ? "이메일 또는 비밀번호가 올바르지 않아요."
          : "로그인하지 못했어요. 잠시 후 다시 시도해 주세요.");
        return;
      }
      if (signupMode && !result.data.session) {
        setMessage("가입 확인 이메일을 보냈어요. 이메일 인증 후 로그인해 주세요.");
        setSignupMode(false);
        return;
      }
      location.replace("/");
    } catch {
      setMessage("로그인하지 못했어요. 네트워크 연결을 확인해 주세요.");
    } finally {
      setLoading(null);
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading === "email") return;
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessage("올바른 이메일 주소를 입력해 주세요.");
      return;
    }
    setLoading("email");
    setMessage("");
    try {
      const { error } = await sendPasswordResetEmail(email);
      setMessage(error
        ? "재설정 메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요."
        : "가입 여부와 관계없이 재설정 가능한 계정이면 이메일을 보내드렸어요.");
    } catch {
      setMessage("재설정 메일을 보내지 못했어요. 네트워크 연결을 확인해 주세요.");
    } finally {
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
      <div className="login-divider"><span>또는 이메일로</span></div>
      <form className="email-login-form" onSubmit={resetMode ? requestPasswordReset : emailLogin} noValidate>
        <label htmlFor="login-email">이메일</label>
        <input id="login-email" name="email" type="email" inputMode="email" autoComplete="email" placeholder="name@example.com" aria-describedby={message ? "login-message" : undefined} required />
        {!resetMode && <><label htmlFor="login-password">비밀번호</label><input id="login-password" name="password" type="password" inputMode="text" autoComplete={signupMode ? "new-password" : "current-password"} placeholder="6자 이상 입력" minLength={6} aria-describedby={message ? "login-message" : undefined} required /></>}
        {signupMode && <><label htmlFor="login-password-confirm">비밀번호 확인</label><input id="login-password-confirm" name="confirmPassword" type="password" inputMode="text" autoComplete="new-password" placeholder="비밀번호 다시 입력" minLength={6} required /></>}
        <button className="email-login-submit" type="submit" disabled={loading === "email"}>{loading === "email" ? "처리 중..." : resetMode ? "재설정 메일 받기" : signupMode ? "이메일로 회원가입" : "이메일로 로그인"}</button>
      </form>
      {message && <p className="login-message" id="login-message" role="alert">{message}</p>}
      <div className="login-help-links">
        {resetMode || signupMode ? (
          <button type="button" onClick={() => { setResetMode(false); setSignupMode(false); setMessage(""); }}>로그인으로 돌아가기</button>
        ) : <>
          <button type="button" onClick={() => setMessage("이메일 계정은 별도 아이디가 없어요. 사용한 이메일을 확인하거나 Google·카카오 로그인을 시도해 주세요.")}>이메일 찾기</button>
          <span aria-hidden="true">|</span>
          <button type="button" onClick={() => { setResetMode(true); setMessage(""); }}>비밀번호 재설정</button>
          <span aria-hidden="true">|</span>
          <button type="button" onClick={() => { setSignupMode(true); setMessage(""); }}>회원가입</button>
        </>}
      </div>
      <p className="login-terms">계속하면 <a href="/terms">이용약관</a>과 <a href="/privacy">개인정보처리방침</a>에 동의하게 됩니다.</p>
    </section>
  );
}
