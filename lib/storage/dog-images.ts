import type { SupabaseClient } from "@supabase/supabase-js";

const DOG_IMAGES_BUCKET = "dog-images";

export type UploadedDogImage = {
  storageKey: string;
  publicUrl: string;
};

export async function uploadDogImage(
  supabase: SupabaseClient,
  input: { userId: string; dogId: string; file: File },
): Promise<UploadedDogImage> {
  const extension = input.file.name.split(".").pop()?.toLowerCase() || "jpg";
  const storageKey = `${input.userId}/${input.dogId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from(DOG_IMAGES_BUCKET).upload(storageKey, input.file, {
    contentType: input.file.type,
    cacheControl: "31536000",
  });
  if (error) throw error;

  const { data } = supabase.storage.from(DOG_IMAGES_BUCKET).getPublicUrl(storageKey);
  return { storageKey, publicUrl: data.publicUrl };
}

export async function deleteDogImages(supabase: SupabaseClient, storageKeys: string[]) {
  if (!storageKeys.length) return;
  const { error } = await supabase.storage.from(DOG_IMAGES_BUCKET).remove(storageKeys);
  if (error) throw error;
}
