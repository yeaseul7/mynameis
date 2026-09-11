"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", icon: "⌂", label: "홈" },
  { href: "/#friends", icon: "♧", label: "친구" },
  { href: "/#my-pets", icon: "🐾", label: "내 새꾸" },
  { href: "/login", icon: "●", label: "마이" },
];

export function BottomNavigation() {
  const pathname = usePathname();
  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {items.map((item) => (
        <Link key={item.label} href={item.href} aria-current={pathname === item.href ? "page" : undefined}>
          <span aria-hidden>{item.icon}</span>{item.label}
        </Link>
      ))}
    </nav>
  );
}
