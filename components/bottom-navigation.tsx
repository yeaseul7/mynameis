"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PiPawPrint, PiUser, PiUsersThree } from "react-icons/pi";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const items = [
  { href: "/", icon: PiPawPrint, label: "내 새꾸", active: (path: string) => path === "/" || path.startsWith("/pets/") },
  { href: "/ongijonggi", icon: PiUsersThree, label: "옹기종기", active: (path: string) => path === "/ongijonggi" || path.startsWith("/community/") },
  { href: "/account", icon: PiUser, label: "계정", active: (path: string) => path === "/account" },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);
  const activeIndex = items.findIndex((item) => item.active(pathname));

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data }) => setAuthenticated(Boolean(data.user)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setAuthenticated(Boolean(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!authenticated) return null;

  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      <i className={`bottom-nav-active bottom-nav-active-${activeIndex}`} aria-hidden="true" />
      {items.map((item) => {
        const Icon = item.icon;
        const current = item.active(pathname);
        return <Link key={item.label} href={item.href} className={item.href === "/ongijonggi" ? "bottom-nav-gathering" : undefined} aria-current={current ? "page" : undefined}><span aria-hidden><Icon /></span>{item.label}</Link>;
      })}
    </nav>
  );
}
