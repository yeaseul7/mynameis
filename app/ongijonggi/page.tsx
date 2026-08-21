import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OngijonggiPage } from "@/components/ongijonggi-page";
import { getCurrentUser } from "@/lib/auth/server";

export const metadata: Metadata = { title: "옹기종기" };

export default async function Page() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <OngijonggiPage />;
}
