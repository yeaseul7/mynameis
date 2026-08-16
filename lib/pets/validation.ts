export const MAX_DOG_PHOTOS = 7;
export const MAX_DOG_IMAGE_SIZE = 8 * 1024 * 1024;
export const ACCEPTED_DOG_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function validateDogImageFile(file: File) {
  if (!ACCEPTED_DOG_IMAGE_TYPES.includes(file.type)) return "JPG, PNG, WebP, HEIC 이미지만 등록할 수 있어요.";
  if (file.size > MAX_DOG_IMAGE_SIZE) return "사진 한 장의 크기는 8MB 이하여야 해요.";
  return "";
}

export function validateDogPhotoCount(count: number) {
  return count > MAX_DOG_PHOTOS ? `사진은 최대 ${MAX_DOG_PHOTOS}장까지 등록할 수 있어요.` : "";
}

export function normalizeRegistrationNumber(value: FormDataEntryValue | null) {
  return String(value ?? "").replace(/\D/g, "");
}

export function normalizeInstagramUsername(value: FormDataEntryValue | string | null | undefined) {
  const rawValue = String(value ?? "").trim();
  if (!rawValue) return "";
  const withoutAt = rawValue.replace(/^@+/, "");
  const match = withoutAt.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/@?([^/?#\s]+)/i);
  return (match?.[1] ?? withoutAt).replace(/^@+/, "").replace(/[/?#].*$/, "").replace(/\/+$/, "");
}

export function validateInstagramUsername(value: string) {
  return value && !/^[A-Za-z0-9._]{1,30}$/.test(value) ? "인스타 아이디는 영문, 숫자, 마침표, 밑줄만 입력해 주세요." : "";
}

export function validateRegistrationNumber(value: string) {
  return value && value.length !== 15 ? "동물등록번호는 숫자 15자리로 입력해 주세요." : "";
}

export function validateWeightKg(value: number | null, required = false) {
  if (value === null) return required ? "몸무게를 입력해 주세요." : "";
  return value <= 0 || value > 200 ? "몸무게는 0kg 초과 200kg 이하로 입력해 주세요." : "";
}

export function validateBirthDate(value: string) {
  if (!value) return "생년월일을 입력해 주세요.";
  return new Date(value) > new Date() ? "생년월일은 오늘 이후로 설정할 수 없어요." : "";
}
