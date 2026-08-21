import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CommunityWritePage } from "@/components/community-write-page";
import { getCurrentUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "도담도담 글쓰기" };

export default async function Page() {
  if (!await getCurrentUser()) redirect("/login");
  return <CommunityWritePage />;
}
