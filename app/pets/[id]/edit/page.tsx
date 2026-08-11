import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PetEditForm } from "@/components/pet-edit-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { DogProfile } from "@/lib/dogs";

export const metadata: Metadata = { title: "반려견 정보 수정", robots: { index: false, follow: false } };

export default async function EditPetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: dog } = await supabase.from("dogs").select("id,owner_id,name,breed,birth_date,weight_kg,gender,neutering_status,animal_registration_no,dog_images(id,storage_key,image_url,sort_order,is_primary)").eq("id", id).eq("owner_id", user.id).single();
  if (!dog) notFound();

  return (
    <div className="pet-registration-page">
      <PetEditForm dog={{
        id: dog.id,
        ownerId: dog.owner_id,
        name: dog.name,
        breed: dog.breed,
        birthDate: dog.birth_date,
        weightKg: dog.weight_kg == null ? null : Number(dog.weight_kg),
        gender: dog.gender as DogProfile["gender"],
        neuteringStatus: dog.neutering_status as DogProfile["neuteringStatus"],
        animalRegistrationNo: dog.animal_registration_no,
        photos: [...(dog.dog_images ?? [])].filter((photo) => Boolean(photo.image_url)).sort((a, b) => a.sort_order - b.sort_order).map((photo) => ({ id: photo.id, storageKey: photo.storage_key, url: photo.image_url as string, sortOrder: photo.sort_order, isPrimary: photo.is_primary })),
      }} />
    </div>
  );
}
