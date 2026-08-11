import type { Metadata, Viewport } from "next";
import { Header } from "@/components/header";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mynameis.life";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "mynameis — 우리 아이의 이름표", template: "%s | mynameis" },
  description: "반려동물의 돌봄·의료·실종 정보를 이름표 링크 하나로 안전하게 공유하세요.",
  applicationName: "mynameis",
  keywords: ["mynameis", "반려동물 이름표", "강아지 QR", "반려동물 프로필", "실종동물"],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName: "mynameis",
    title: "mynameis — 우리 아이의 이름표",
    description: "돌봄부터 실종까지, 우리 아이의 정보를 안전하게 공유하세요.",
    url: "/",
  },
  twitter: { card: "summary_large_image", title: "mynameis", description: "우리 아이의 이름표를 만들어 주세요." },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#FFD966" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AppShell header={<Header />}>{children}</AppShell>
      </body>
    </html>
  );
}
