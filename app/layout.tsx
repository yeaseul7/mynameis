import type { Metadata, Viewport } from "next";
import { Header } from "@/components/header";
import { AppShell } from "@/components/app-shell";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mynameis.life";
const siteName = "mynameis";
const siteTitle = "mynameis — 반려견 QR 이름표";
const siteDescription = "반려견의 돌봄 정보와 실종 정보를 QR 이름표 링크 하나로 안전하게 준비하고 공유하세요.";
const ogImage = "/og-image-20260816.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: siteTitle, template: `%s | ${siteName}` },
  description: siteDescription,
  applicationName: siteName,
  keywords: ["mynameis", "반려견 QR 이름표", "강아지 QR 이름표", "반려동물 이름표", "강아지 실종 QR", "반려견 돌봄 정보", "반려동물 프로필 공유"],
  alternates: { canonical: "/" },
  manifest: "/site.webmanifest",
  icons: {
    icon: [{ url: "/app-icon.png", type: "image/png" }],
    apple: [{ url: "/app-icon.png", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    siteName,
    title: siteTitle,
    description: siteDescription,
    url: "/",
    images: [{ url: ogImage, width: 1536, height: 1024, alt: "mynameis 우리 아이의 모든 정보, 한 곳에" }],
  },
  twitter: { card: "summary_large_image", title: siteTitle, description: siteDescription, images: [ogImage] },
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
