import type { SupabaseClient, User } from "@supabase/supabase-js";

const BUCKET = "dog-images";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function updateUserAvatar(supabase: SupabaseClient, user: User, file: File) {
  if (!ALLOWED_TYPES.has(file.type)) throw new Error("JPG, PNG, WEBP 이미지만 등록할 수 있어요.");
  if (file.size > MAX_FILE_SIZE) throw new Error("프로필 사진은 5MB 이하로 등록해 주세요.");

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const storageKey = `${user.id}/avatar/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storageKey, file, {
    contentType: file.type,
    cacheControl: "31536000",
  });
  if (uploadError) throw uploadError;

  const avatarUrl = supabase.storage.from(BUCKET).getPublicUrl(storageKey).data.publicUrl;
  const previousKey = typeof user.user_metadata?.avatar_storage_key === "string" ? user.user_metadata.avatar_storage_key : "";
  const { error: updateError } = await supabase.auth.updateUser({
    data: { avatar_url: avatarUrl, avatar_storage_key: storageKey },
  });
  if (updateError) {
    await supabase.storage.from(BUCKET).remove([storageKey]);
    throw updateError;
  }

  if (previousKey && previousKey !== storageKey) await supabase.storage.from(BUCKET).remove([previousKey]);
  return avatarUrl;
}
