"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function AppShell({ header, children }: { header: ReactNode; children: ReactNode }) {
  const pathname = usePathname();
  const isShared = pathname.startsWith("/share/");
  const isLogin = pathname === "/login";

  return (
    <>
      {!isShared && !isLogin && header}
      <main className={isShared ? "public-shell" : "app-shell"}>{children}</main>
    </>
  );
}
