import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PetRegistrationForm } from "@/components/pet-registration-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "우리 아이 등록", robots: { index: false, follow: false } };

export default async function NewPetPage() {
  const { data: { user } } = await (await createServerSupabaseClient()).auth.getUser();
  if (!user) redirect("/login");
  return <div className="pet-registration-page"><PetRegistrationForm userId={user.id} /></div>;
}
