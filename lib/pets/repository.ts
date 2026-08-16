import type { SupabaseClient } from "@supabase/supabase-js";
import type { DogCareProfileInput, DogProfile, DogProfileInput, DogPhoto, DogPublicLink, DogPublicLinkType } from "./types";

type DogRow = {
  id: string;
  owner_id: string;
  name: string;
  breed: string;
  birth_date: string | null;
  weight_kg: number | string | null;
  gender: DogProfile["gender"];
  neutering_status: DogProfile["neuteringStatus"];
  animal_registration_no: string | null;
  instagram_username: string | null;
  invite_code: string | null;
  dog_care_profiles?: Array<{
    takes_medication: boolean | null;
    primary_hospital: string | null;
    primary_hospital_address: string | null;
    primary_hospital_phone: string | null;
    emergency_note: string | null;
    emergency_contact_1: string;
    emergency_contact_2: string | null;
    lost_location_address: string | null;
    lost_location_district: string | null;
    lost_location_neighborhood: string | null;
    lost_location_detail: string | null;
    lost_location_lat: number | string | null;
    lost_location_lng: number | string | null;
    lost_at: string | null;
    meals_per_day: number | null;
    marks_indoors: boolean | null;
    fifth_vaccine_done: boolean | null;
    daycare_experience: boolean | null;
    has_allergy: boolean | null;
    handoff_memo: string | null;
  }>;
  dog_images?: Array<{
    id?: string;
    storage_key?: string;
    image_url: string | null;
    sort_order: number;
    is_primary: boolean;
  }>;
};

type DogCareProfileRow = NonNullable<DogRow["dog_care_profiles"]>[number];
type DogPublicLinkRow = {
  dog_id: string;
  owner_id: string;
  type: DogPublicLinkType;
  token: string;
};

const DOG_SELECT = "id,owner_id,name,breed,birth_date,weight_kg,gender,neutering_status,animal_registration_no,instagram_username,invite_code,dog_care_profiles(takes_medication,primary_hospital,primary_hospital_address,primary_hospital_phone,emergency_note,emergency_contact_1,emergency_contact_2,lost_location_address,lost_location_district,lost_location_neighborhood,lost_location_detail,lost_location_lat,lost_location_lng,lost_at,meals_per_day,marks_indoors,fifth_vaccine_done,daycare_experience,has_allergy,handoff_memo),dog_images(id,storage_key,image_url,sort_order,is_primary)";
const DOG_SELECT_BASE = "id,owner_id,name,breed,birth_date,weight_kg,gender,neutering_status,animal_registration_no,instagram_username,invite_code,dog_images(id,storage_key,image_url,sort_order,is_primary)";
const DOG_CARE_SELECT = "takes_medication,primary_hospital,primary_hospital_address,primary_hospital_phone,emergency_note,emergency_contact_1,emergency_contact_2,lost_location_address,lost_location_district,lost_location_neighborhood,lost_location_detail,lost_location_lat,lost_location_lng,lost_at,meals_per_day,marks_indoors,fifth_vaccine_done,daycare_experience,has_allergy,handoff_memo";

function mapDog(row: DogRow): DogProfile {
  const careProfile = row.dog_care_profiles?.[0];
  return {
    id: row.id,
    ownerId: row.owner_id,
    name: row.name,
    breed: row.breed,
    birthDate: row.birth_date,
    weightKg: row.weight_kg == null ? null : Number(row.weight_kg),
    gender: row.gender,
    neuteringStatus: row.neutering_status,
    animalRegistrationNo: row.animal_registration_no,
    instagramUsername: row.instagram_username,
    inviteCode: row.invite_code,
    careProfile: careProfile ? {
      takesMedication: careProfile.takes_medication,
      primaryHospital: careProfile.primary_hospital,
      primaryHospitalAddress: careProfile.primary_hospital_address,
      primaryHospitalPhone: careProfile.primary_hospital_phone,
      emergencyNote: careProfile.emergency_note,
      emergencyContact1: careProfile.emergency_contact_1,
      emergencyContact2: careProfile.emergency_contact_2,
      lostLocationAddress: careProfile.lost_location_address,
      lostLocationDistrict: careProfile.lost_location_district,
      lostLocationNeighborhood: careProfile.lost_location_neighborhood,
      lostLocationDetail: careProfile.lost_location_detail,
      lostLocationLat: careProfile.lost_location_lat == null ? null : Number(careProfile.lost_location_lat),
      lostLocationLng: careProfile.lost_location_lng == null ? null : Number(careProfile.lost_location_lng),
      lostAt: careProfile.lost_at,
      mealsPerDay: careProfile.meals_per_day,
      marksIndoors: careProfile.marks_indoors,
      fifthVaccineDone: careProfile.fifth_vaccine_done,
      daycareExperience: careProfile.daycare_experience,
      hasAllergy: careProfile.has_allergy,
      handoffMemo: careProfile.handoff_memo,
    } : null,
    photos: [...(row.dog_images ?? [])]
      .filter((photo) => Boolean(photo.image_url))
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((photo) => ({
        id: photo.id,
        storageKey: photo.storage_key,
        url: photo.image_url as string,
        sortOrder: photo.sort_order,
        isPrimary: photo.is_primary,
      })),
  };
}

export async function upsertDogCareProfile(
  supabase: SupabaseClient,
  ownerId: string,
  dogId: string,
  input: DogCareProfileInput,
) {
  const { error } = await supabase.from("dog_care_profiles").upsert({
    dog_id: dogId,
    owner_id: ownerId,
    takes_medication: input.takesMedication,
    primary_hospital: input.primaryHospital,
    primary_hospital_address: input.primaryHospitalAddress,
    primary_hospital_phone: input.primaryHospitalPhone,
    emergency_note: input.emergencyNote,
    emergency_contact_1: input.emergencyContact1,
    emergency_contact_2: input.emergencyContact2,
    lost_location_address: input.lostLocationAddress,
    lost_location_district: input.lostLocationDistrict,
    lost_location_neighborhood: input.lostLocationNeighborhood,
    lost_location_detail: input.lostLocationDetail,
    lost_location_lat: input.lostLocationLat,
    lost_location_lng: input.lostLocationLng,
    lost_at: input.lostAt,
    meals_per_day: input.mealsPerDay,
    marks_indoors: input.marksIndoors,
    fifth_vaccine_done: input.fifthVaccineDone,
    daycare_experience: input.daycareExperience,
    has_allergy: input.hasAllergy,
    handoff_memo: input.handoffMemo,
    updated_at: new Date().toISOString(),
  }, { onConflict: "dog_id" });
  if (error) throw error;
}

export async function updateDogLostLocation(
  supabase: SupabaseClient,
  ownerId: string,
  dogId: string,
  input: Pick<DogCareProfileInput, "lostAt" | "lostLocationAddress" | "lostLocationDistrict" | "lostLocationNeighborhood" | "lostLocationDetail">,
) {
  const lostLocationValues = {
    lost_at: input.lostAt,
    lost_location_address: input.lostLocationAddress,
    lost_location_district: input.lostLocationDistrict,
    lost_location_neighborhood: input.lostLocationNeighborhood,
    lost_location_detail: input.lostLocationDetail,
    updated_at: new Date().toISOString(),
  };
  const existing = await supabase.from("dog_care_profiles").select("dog_id").eq("dog_id", dogId).eq("owner_id", ownerId).maybeSingle();
  if (existing.error) throw existing.error;

  if (existing.data) {
    const { error } = await supabase.from("dog_care_profiles").update(lostLocationValues).eq("dog_id", dogId).eq("owner_id", ownerId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("dog_care_profiles").insert({
    dog_id: dogId,
    owner_id: ownerId,
    emergency_contact_1: null,
    ...lostLocationValues,
  });
  if (error) throw error;
}

export async function getDogsByOwner(supabase: SupabaseClient, ownerId: string) {
  const { data, error } = await supabase.from("dogs").select(DOG_SELECT).eq("owner_id", ownerId).order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as DogRow[]).map(mapDog);
}

export async function getDogForOwner(supabase: SupabaseClient, ownerId: string, dogId: string) {
  const { data, error } = await supabase.from("dogs").select(DOG_SELECT_BASE).eq("id", dogId).eq("owner_id", ownerId).single();
  if (error || !data) return null;

  const care = await supabase.from("dog_care_profiles").select(DOG_CARE_SELECT).eq("dog_id", dogId).eq("owner_id", ownerId).maybeSingle();
  if (care.error) throw care.error;
  return mapDog({
    ...(data as DogRow),
    dog_care_profiles: care.data ? [care.data as DogCareProfileRow] : [],
  });
}

export async function getDogById(supabase: SupabaseClient, dogId: string) {
  const { data, error } = await supabase.from("dogs").select(DOG_SELECT_BASE).eq("id", dogId).single();
  if (error || !data) return null;

  const care = await supabase.from("dog_care_profiles").select(DOG_CARE_SELECT).eq("dog_id", dogId).maybeSingle();
  if (care.error) throw care.error;
  return mapDog({
    ...(data as DogRow),
    dog_care_profiles: care.data ? [care.data as DogCareProfileRow] : [],
  });
}

export async function getDogPublicLinkByToken(supabase: SupabaseClient, token: string): Promise<DogPublicLink | null> {
  const { data, error } = await supabase
    .from("dog_public_links")
    .select("dog_id,owner_id,type,token")
    .eq("token", token)
    .eq("is_active", true)
    .is("revoked_at", null)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .single();

  if (error || !data) return null;
  const row = data as DogPublicLinkRow;
  return {
    dogId: row.dog_id,
    ownerId: row.owner_id,
    type: row.type,
    token: row.token,
  };
}

export async function getDogByPublicToken(supabase: SupabaseClient, token: string) {
  const publicLink = await getDogPublicLinkByToken(supabase, token);
  if (!publicLink) return null;
  const dog = await getDogById(supabase, publicLink.dogId);
  if (!dog) return null;
  return { dog, publicLink };
}

export async function getOrCreateDogPublicLink(
  supabase: SupabaseClient,
  input: { ownerId: string; dogId: string; type: DogPublicLinkType; token: string },
): Promise<DogPublicLink> {
  const existing = await supabase
    .from("dog_public_links")
    .select("dog_id,owner_id,type,token")
    .eq("owner_id", input.ownerId)
    .eq("dog_id", input.dogId)
    .eq("type", input.type)
    .eq("is_active", true)
    .is("revoked_at", null)
    .maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) {
    const row = existing.data as DogPublicLinkRow;
    return { dogId: row.dog_id, ownerId: row.owner_id, type: row.type, token: row.token };
  }

  const { data, error } = await supabase
    .from("dog_public_links")
    .insert({
      dog_id: input.dogId,
      owner_id: input.ownerId,
      type: input.type,
      token: input.token,
    })
    .select("dog_id,owner_id,type,token")
    .single();
  if (error || !data) throw error ?? new Error("Dog public link insert failed");

  const row = data as DogPublicLinkRow;
  return { dogId: row.dog_id, ownerId: row.owner_id, type: row.type, token: row.token };
}

export async function insertDog(supabase: SupabaseClient, ownerId: string, input: DogProfileInput, inviteCode: string) {
  const { data, error } = await supabase.from("dogs").insert({
    owner_id: ownerId,
    name: input.name,
    breed: input.breed,
    birth_date: input.birthDate,
    weight_kg: input.weightKg,
    gender: input.gender,
    neutering_status: input.neuteringStatus,
    animal_registration_no: input.animalRegistrationNo,
    instagram_username: input.instagramUsername,
    invite_code: inviteCode,
  }).select("id").single();
  if (error || !data) throw error ?? new Error("Dog insert failed");
  return data.id as string;
}

export async function updateDog(supabase: SupabaseClient, dogId: string, input: DogProfileInput) {
  const { error } = await supabase.from("dogs").update({
    name: input.name,
    breed: input.breed,
    birth_date: input.birthDate,
    weight_kg: input.weightKg,
    gender: input.gender,
    neutering_status: input.neuteringStatus,
    animal_registration_no: input.animalRegistrationNo,
    instagram_username: input.instagramUsername,
    updated_at: new Date().toISOString(),
  }).eq("id", dogId);
  if (error) throw error;
}

export async function deleteDog(supabase: SupabaseClient, dogId: string) {
  const { error } = await supabase.from("dogs").delete().eq("id", dogId);
  if (error) throw error;
}

export async function insertDogPhotos(supabase: SupabaseClient, rows: Array<{
  dogId: string;
  ownerId: string;
  storageKey: string;
  imageUrl: string;
  sortOrder: number;
  isPrimary: boolean;
  originalName: string;
  mimeType: string;
  fileSize: number;
}>) {
  if (!rows.length) return;
  const { error } = await supabase.from("dog_images").insert(rows.map((row) => ({
    dog_id: row.dogId,
    owner_id: row.ownerId,
    storage_key: row.storageKey,
    image_url: row.imageUrl,
    sort_order: row.sortOrder,
    is_primary: row.isPrimary,
    original_name: row.originalName,
    mime_type: row.mimeType,
    file_size: row.fileSize,
  })));
  if (error) throw error;
}

export async function deleteDogPhotoRows(supabase: SupabaseClient, photos: DogPhoto[]) {
  const ids = photos.map((photo) => photo.id).filter(Boolean);
  if (!ids.length) return;
  const { error } = await supabase.from("dog_images").delete().in("id", ids);
  if (error) throw error;
}

export async function setPrimaryDogPhoto(supabase: SupabaseClient, photoId: string) {
  const { error } = await supabase.from("dog_images").update({ is_primary: true }).eq("id", photoId);
  if (error) throw error;
}
