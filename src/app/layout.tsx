import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "mynameis 강아지 월드 MVP",
  description: "실시간 멀티유저 강아지 월드 기술 검증",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
