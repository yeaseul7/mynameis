"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { UserMenu } from "./user-menu";

export function Header() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="mynameis 홈"><Image className="wordmark-logo" src="/mynameis-logo-240.png" alt="mynameis" width={105} height={36} priority /></Link>
      <nav className={user ? "desktop-user-nav" : "guest-user-nav"} aria-label="사용자 메뉴">
        {user ? <UserMenu email={user.email ?? "사용자"} /> : <Link className="header-login" href="/login">로그인</Link>}
      </nav>
    </header>
  );
}
