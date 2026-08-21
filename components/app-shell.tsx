"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { BottomNavigation } from "@/components/bottom-navigation";

export function AppShell({ header, children }: { header: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const isShared = pathname.startsWith("/share/");
  const isAuth = pathname === "/login" || pathname === "/reset-password" || pathname === "/auth/callback";

  return (
    <>
      {!isShared && !isAuth && header}
      <main className={isShared ? "public-shell" : "app-shell"}>{children}</main>
      {!isShared && !isAuth && <BottomNavigation />}
    </>
  );
}
