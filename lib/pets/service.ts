import type { SupabaseClient } from "@supabase/supabase-js";
import { deleteDogImages, uploadDogImage } from "@/lib/storage/dog-images";
import type { DogCareProfileInput, DogPhoto, DogProfileInput } from "./types";
import { generateInviteCode } from "./invite-code";
import { clearDogLostLocation, deleteDog, deleteDogFoundLocationReports, deleteDogPhotoRows, getDogById, getDogByPublicToken, getDogForOwner, getDogsByOwner, getOrCreateDogPublicLink, insertDog, insertDogPhotos, setPrimaryDogPhoto, updateDog, updateDogLostLocation, upsertDogCareProfile } from "./repository";

export { getDogById, getDogByPublicToken, getDogForOwner, getDogsByOwner, getOrCreateDogPublicLink };

async function insertDogWithInviteCode(supabase: SupabaseClient, ownerId: string, profile: DogProfileInput) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await insertDog(supabase, ownerId, profile, generateInviteCode());
    } catch (error) {
      lastError = error;
      if (typeof error !== "object" || error === null || !("code" in error) || error.code !== "23505") throw error;
    }
  }
  throw lastError ?? new Error("Invite code generation failed");
}

async function addDogPhotos(
  supabase: SupabaseClient,
  input: { ownerId: string; dogId: string; nextSortOrder: number; makeFirstPrimary?: boolean; files: File[] },
) {
  const uploadedKeys: string[] = [];
  try {
    const photoRows = [];
    for (const [index, file] of input.files.entries()) {
      const uploaded = await uploadDogImage(supabase, { userId: input.ownerId, dogId: input.dogId, file });
      uploadedKeys.push(uploaded.storageKey);
      photoRows.push({
        dogId: input.dogId,
        ownerId: input.ownerId,
        storageKey: uploaded.storageKey,
        imageUrl: uploaded.publicUrl,
        sortOrder: input.nextSortOrder + index,
        isPrimary: Boolean(input.makeFirstPrimary) && index === 0,
        originalName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });
    }
    await insertDogPhotos(supabase, photoRows);
  } catch (error) {
    await deleteDogImages(supabase, uploadedKeys);
    throw error;
  }
}

export async function createDogBasicProfile(
  supabase: SupabaseClient,
  input: { ownerId: string; profile: DogProfileInput; files: File[] },
) {
  const dogId = await insertDogWithInviteCode(supabase, input.ownerId, input.profile);
  try {
    await addDogPhotos(supabase, { ownerId: input.ownerId, dogId, nextSortOrder: 0, makeFirstPrimary: true, files: input.files });
    return dogId;
  } catch (error) {
    await deleteDog(supabase, dogId);
    throw error;
  }
}

export async function saveDogBasicProfile(
  supabase: SupabaseClient,
  input: {
    ownerId: string;
    dogId: string;
    profile: DogProfileInput;
    keptPhotos: DogPhoto[];
    deletedPhotos: DogPhoto[];
    files: File[];
  },
) {
  await updateDog(supabase, input.dogId, input.profile);

  if (input.deletedPhotos.length) {
    await deleteDogPhotoRows(supabase, input.deletedPhotos);
    await deleteDogImages(supabase, input.deletedPhotos.map((photo) => photo.storageKey).filter(Boolean) as string[]);
  }

  const deletedPrimary = input.deletedPhotos.some((photo) => photo.isPrimary);
  const nextSortOrder = input.keptPhotos.length
    ? Math.max(...input.keptPhotos.map((photo) => photo.sortOrder)) + 1
    : 0;
  const newPhotoBecomesPrimary = input.files.length > 0 && (deletedPrimary || input.keptPhotos.length === 0);

  await addDogPhotos(supabase, {
    ownerId: input.ownerId,
    dogId: input.dogId,
    nextSortOrder,
    makeFirstPrimary: newPhotoBecomesPrimary,
    files: input.files,
  });

  const needsPrimary = !newPhotoBecomesPrimary && input.keptPhotos.length && !input.keptPhotos.some((photo) => photo.isPrimary);
  const firstPhotoId = input.keptPhotos[0]?.id;
  if (needsPrimary && firstPhotoId) await setPrimaryDogPhoto(supabase, firstPhotoId);
}

export async function saveDogCareProfile(
  supabase: SupabaseClient,
  input: { ownerId: string; dogId: string; careProfile: DogCareProfileInput },
) {
  await upsertDogCareProfile(supabase, input.ownerId, input.dogId, input.careProfile);
}

export async function saveDogLostLocation(
  supabase: SupabaseClient,
  input: {
    ownerId: string;
    dogId: string;
    lostAt: string | null;
    lostLocationAddress: string | null;
    lostLocationDistrict: string | null;
    lostLocationNeighborhood: string | null;
    lostLocationDetail: string | null;
  },
) {
  await updateDogLostLocation(supabase, input.ownerId, input.dogId, input);
}

export async function endDogLostReport(
  supabase: SupabaseClient,
  input: { ownerId: string; dogId: string },
) {
  await clearDogLostLocation(supabase, input.ownerId, input.dogId);
  await deleteDogFoundLocationReports(supabase, input.ownerId, input.dogId);
}

export async function createDogProfile(
  supabase: SupabaseClient,
  input: { ownerId: string; profile: DogProfileInput; careProfile: DogCareProfileInput; files: File[] },
) {
  const dogId = await insertDogWithInviteCode(supabase, input.ownerId, input.profile);
  try {
    await upsertDogCareProfile(supabase, input.ownerId, dogId, input.careProfile);
    await addDogPhotos(supabase, { ownerId: input.ownerId, dogId, nextSortOrder: 0, makeFirstPrimary: true, files: input.files });
    return dogId;
  } catch (error) {
    await deleteDog(supabase, dogId);
    throw error;
  }
}

export async function updateDogProfile(
  supabase: SupabaseClient,
  input: {
    ownerId: string;
    dogId: string;
    profile: DogProfileInput;
    careProfile: DogCareProfileInput;
    keptPhotos: DogPhoto[];
    deletedPhotos: DogPhoto[];
    files: File[];
  },
) {
  await saveDogBasicProfile(supabase, input);
  await upsertDogCareProfile(supabase, input.ownerId, input.dogId, input.careProfile);
}
