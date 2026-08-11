"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function UserMenu({ email }: { email: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function logout() {
    setLoading(true);
    await createBrowserSupabaseClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="user-menu">
      <span className="login-dot" aria-hidden="true" />
      <span className="user-email" title={email}>{email}</span>
      <button className="header-logout" type="button" onClick={logout} disabled={loading}>
        {loading ? "처리 중" : "로그아웃"}
      </button>
    </div>
  );
}
