import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PetEditForm } from "@/components/pet-edit-form";
import { getCurrentUser } from "@/lib/auth/server";
import { getDogForOwner } from "@/lib/pets/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "반려견 정보 수정", robots: { index: false, follow: false } };

export default async function EditPetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const dog = await getDogForOwner(await createServerSupabaseClient(), user.id, id);
  if (!dog) notFound();

  return (
    <div className="pet-registration-page">
      <PetEditForm dog={{ ...dog, ownerId: dog.ownerId ?? user.id, photos: dog.photos.map((photo) => ({ ...photo, id: photo.id ?? "", storageKey: photo.storageKey ?? "" })) }} />
    </div>
  );
}
