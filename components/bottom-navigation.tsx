"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { FaPaw } from "react-icons/fa6";
import { RiCommunityLine, RiUser3Line } from "react-icons/ri";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

const items = [
  { href: "/", icon: FaPaw, label: "내 새꾸", active: (path: string) => path === "/" || path.startsWith("/pets/") },
  { href: "/ongijonggi", icon: RiCommunityLine, label: "옹기종기", active: (path: string) => path === "/ongijonggi" },
  { href: "/account", icon: RiUser3Line, label: "계정", active: (path: string) => path === "/account" },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data }) => setAuthenticated(Boolean(data.user)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setAuthenticated(Boolean(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!authenticated) return null;

  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {items.map((item) => {
        const Icon = item.icon;
        const current = item.active(pathname);
        return <Link key={item.label} href={item.href} aria-current={current ? "page" : undefined}><span aria-hidden><Icon /></span>{item.label}</Link>;
      })}
    </nav>
  );
}
