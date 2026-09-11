"use client";

import { FormEvent, useEffect, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type LoginModalProps = {
  open: boolean;
  onClose: () => void;
};

export function LoginModal({ open, onClose }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose, open]);

  if (!open) return null;

  async function login(event: FormEvent) {
    event.preventDefault();
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setMessage("로그인 설정을 확인해 주세요."); return; }
    setSending(true);
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setMessage(error ? error.message : "로그인 링크를 이메일로 보냈습니다.");
    setSending(false);
  }

  async function socialLogin(provider: "google" | "kakao") {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { setMessage("로그인 설정을 확인해 주세요."); return; }
    setSending(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: window.location.origin } });
    if (error) { setMessage(error.message); setSending(false); }
  }

  return <div className="login-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-modal-title">
      <button className="login-modal-close" onClick={onClose} aria-label="로그인 창 닫기">×</button>
      <h2 id="login-modal-title">로그인</h2>
      <p>내 프로필과 강아지 정보를 관리하려면 로그인해 주세요.</p>
      <div className="social-login-buttons"><button className="google-login" disabled={sending} onClick={() => void socialLogin("google")}>Google로 로그인</button><button className="kakao-login" disabled={sending} onClick={() => void socialLogin("kakao")}>카카오로 로그인</button></div>
      <div className="login-divider"><span>또는</span></div>
      <form onSubmit={login}><input type="email" required autoFocus value={email} onChange={(event) => setEmail(event.target.value)} placeholder="이메일 주소" /><button disabled={sending}>{sending ? "전송 중" : "로그인 링크 받기"}</button></form>
      <small aria-live="polite">{message}</small>
    </section>
  </div>;
}
