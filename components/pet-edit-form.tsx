"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FaCamera } from "react-icons/fa";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { DogProfile } from "@/lib/dogs";

const MAX_PHOTOS = 6;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

type ExistingPhoto = { id: string; storageKey: string; url: string; sortOrder: number; isPrimary: boolean };
type EditableDog = Omit<DogProfile, "photos"> & { ownerId: string; photos: ExistingPhoto[] };

export function PetEditForm({ dog }: { dog: EditableDog }) {
  const [photos, setPhotos] = useState(dog.photos);
  const [deletedPhotos, setDeletedPhotos] = useState<ExistingPhoto[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (photos.length + files.length + selected.length > MAX_PHOTOS) return setError(`사진은 최대 ${MAX_PHOTOS}장까지 등록할 수 있어요.`);
    if (selected.some((file) => !ACCEPTED_TYPES.includes(file.type))) return setError("JPG, PNG, WebP, HEIC 이미지만 등록할 수 있어요.");
    if (selected.some((file) => file.size > MAX_FILE_SIZE)) return setError("사진 한 장의 크기는 8MB 이하여야 해요.");
    setError("");
    setFiles((current) => [...current, ...selected]);
  }

  function removeExistingPhoto(photo: ExistingPhoto) {
    setPhotos((current) => current.filter((item) => item.id !== photo.id));
    setDeletedPhotos((current) => [...current, photo]);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (photos.length + files.length === 0) return setError("사진을 한 장 이상 남겨 주세요.");

    const form = new FormData(event.currentTarget);
    const weightKg = Number(form.get("weightKg"));
    const registrationNumber = String(form.get("registrationNumber") ?? "").replace(/\D/g, "");
    if (weightKg <= 0 || weightKg > 200) return setError("몸무게는 0kg 초과 200kg 이하로 입력해 주세요.");
    if (registrationNumber && registrationNumber.length !== 15) return setError("동물등록번호는 숫자 15자리로 입력해 주세요.");

    setSaving(true);
    setError("");
    const supabase = createBrowserSupabaseClient();
    const { error: updateError } = await supabase.from("dogs").update({
      name: String(form.get("name") ?? "").trim(), breed: String(form.get("breed") ?? "").trim(),
      birth_date: String(form.get("birthDate") ?? ""), weight_kg: weightKg,
      gender: String(form.get("gender")), neutering_status: String(form.get("isNeutered")),
      animal_registration_no: registrationNumber || null, updated_at: new Date().toISOString(),
    }).eq("id", dog.id);

    if (updateError) {
      setError("정보를 수정하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setSaving(false);
      return;
    }

    try {
      if (deletedPhotos.length) {
        const { error: deleteRowsError } = await supabase.from("dog_images").delete().in("id", deletedPhotos.map((photo) => photo.id));
        if (deleteRowsError) throw deleteRowsError;
        const { error: deleteFilesError } = await supabase.storage.from("dog-images").remove(deletedPhotos.map((photo) => photo.storageKey));
        if (deleteFilesError) throw deleteFilesError;
      }

      const uploadedPaths: string[] = [];
      const newRows = [];
      for (const [index, file] of files.entries()) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${dog.ownerId}/${dog.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("dog-images").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        const { data: publicData } = supabase.storage.from("dog-images").getPublicUrl(path);
        newRows.push({ dog_id: dog.id, owner_id: dog.ownerId, storage_key: path, image_url: publicData.publicUrl, sort_order: photos.length + index, is_primary: photos.length === 0 && index === 0, original_name: file.name, mime_type: file.type, file_size: file.size });
      }
      if (newRows.length) {
        const { error: insertError } = await supabase.from("dog_images").insert(newRows);
        if (insertError) {
          await supabase.storage.from("dog-images").remove(uploadedPaths);
          throw insertError;
        }
      }

      if (photos.length && !photos.some((photo) => photo.isPrimary)) {
        const { error: primaryError } = await supabase.from("dog_images").update({ is_primary: true }).eq("id", photos[0].id);
        if (primaryError) throw primaryError;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("사진을 수정하지 못했어요. Storage와 dog_images 정책을 확인해 주세요.");
      setSaving(false);
    }
  }

  return (
    <form className="pet-registration-form" onSubmit={submit}>
      <h1>{dog.name} 정보 수정</h1>
      <div className="photo-upload-heading"><b>사진 추가·삭제</b><span>{photos.length + files.length}/{MAX_PHOTOS}</span></div>
      <div className="photo-header-scroll">
        <input id="edit-pet-photo-upload" className="photo-file-input" type="file" accept={ACCEPTED_TYPES.join(",")} multiple onChange={selectPhotos} />
        {photos.map((photo, index) => <div className="header-photo-item" key={photo.id}><div className="header-photo-media"><img src={photo.url} alt={`등록된 사진 ${index + 1}`} /></div><span>{photo.isPrimary ? "대표 사진" : `사진 ${index + 1}`}</span><button type="button" aria-label={`${index + 1}번째 사진 삭제`} onClick={() => removeExistingPhoto(photo)}>×</button></div>)}
        {previews.map((preview, index) => <div className="header-photo-item" key={preview}><div className="header-photo-media"><img src={preview} alt={`새 사진 ${index + 1}`} /></div><span>새 사진</span><button type="button" aria-label={`새 사진 ${index + 1} 삭제`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}>×</button></div>)}
        {photos.length + files.length < MAX_PHOTOS && <label className="photo-empty-slot" htmlFor="edit-pet-photo-upload" aria-label="사진 추가" tabIndex={0}><FaCamera aria-hidden /></label>}
      </div>
      <label>이름<input name="name" defaultValue={dog.name} required maxLength={20} /></label>
      <label>견종<input name="breed" defaultValue={dog.breed} required maxLength={30} /></label>
      <label>생년월일<input name="birthDate" type="date" defaultValue={dog.birthDate ?? ""} max={new Date().toISOString().slice(0, 10)} required /></label>
      <label>몸무게 (kg)<input name="weightKg" type="number" inputMode="decimal" min="0.1" max="200" step="0.1" defaultValue={dog.weightKg ?? ""} required /></label>
      <fieldset><legend>성별</legend><label><input type="radio" name="gender" value="MALE" defaultChecked={dog.gender === "MALE"} required /> 남아</label><label><input type="radio" name="gender" value="FEMALE" defaultChecked={dog.gender === "FEMALE"} required /> 여아</label></fieldset>
      <fieldset><legend>중성화 여부</legend><label><input type="radio" name="isNeutered" value="NEUTERED" defaultChecked={dog.neuteringStatus === "NEUTERED"} required /> 했어요</label><label><input type="radio" name="isNeutered" value="NOT_NEUTERED" defaultChecked={dog.neuteringStatus === "NOT_NEUTERED"} required /> 안 했어요</label><label><input type="radio" name="isNeutered" value="UNKNOWN" defaultChecked={dog.neuteringStatus === "UNKNOWN"} required /> 몰라요</label></fieldset>
      <div className="registration-number-field"><div><label htmlFor="edit-animal-registration-number">동물등록번호 <small className="optional-label">선택</small></label></div><input id="edit-animal-registration-number" name="registrationNumber" inputMode="numeric" pattern="[0-9]{15}" maxLength={15} defaultValue={dog.animalRegistrationNo ?? ""} placeholder="숫자 15자리" /></div>
      {error && <p className="form-message" role="alert">{error}</p>}
      <button className="button primary" type="submit" disabled={saving}>{saving ? "저장하고 있어요..." : "수정 완료"}</button>
    </form>
  );
}
