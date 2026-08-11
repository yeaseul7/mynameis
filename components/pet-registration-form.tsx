"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaCamera } from "react-icons/fa";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import type { DogProfile } from "@/lib/dogs";

const MAX_PHOTOS = 6;
const MAX_FILE_SIZE = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export function PetRegistrationForm({ userId }: { userId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [step, setStep] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const daysInMonth = birthYear && birthMonth ? new Date(Number(birthYear), Number(birthMonth), 0).getDate() : 31;

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  useEffect(() => {
    if (birthDay && Number(birthDay) > daysInMonth) setBirthDay("");
  }, [birthDay, daysInMonth]);

  function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const combined = [...files, ...selected];
    event.target.value = "";
    if (combined.length > MAX_PHOTOS) return setError(`사진은 최대 ${MAX_PHOTOS}장까지 등록할 수 있어요.`);
    if (selected.some((file) => !ACCEPTED_TYPES.includes(file.type))) return setError("JPG, PNG, WebP, HEIC 이미지만 등록할 수 있어요.");
    if (selected.some((file) => file.size > MAX_FILE_SIZE)) return setError("사진 한 장의 크기는 8MB 이하여야 해요.");
    setError("");
    setFiles(combined);
  }

  function removePhoto(index: number) {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }

  function goToNextStep() {
    if (step === 1 && files.length === 0) return setError("우리 아이 사진을 한 장 이상 등록해 주세요.");
    const controls = formRef.current?.querySelectorAll<HTMLElement>(`[data-step="${step}"] input, [data-step="${step}"] select`);
    for (const control of Array.from(controls ?? [])) {
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement) {
        if (!control.checkValidity()) {
          control.reportValidity();
          return;
        }
      }
    }
    setError("");
    setStep((current) => Math.min(3, current + 1));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (files.length === 0) return setError("우리 아이 사진을 한 장 이상 등록해 주세요.");

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const breed = String(form.get("breed") ?? "").trim();
    const birthDate = birthYear && birthMonth && birthDay ? `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}` : "";
    const weightValue = String(form.get("weightKg") ?? "").trim();
    const weightKg = weightValue ? Number(weightValue) : null;
    const registrationNumber = String(form.get("registrationNumber") ?? "").replace(/\D/g, "");
    const gender = String(form.get("gender")) as DogProfile["gender"];
    const neuteredValue = String(form.get("isNeutered") ?? "UNKNOWN");
    if (!name || !breed || !birthDate || !gender) return setError("사진과 기본정보를 모두 입력해 주세요.");
    if (weightKg !== null && (weightKg <= 0 || weightKg > 200)) return setError("몸무게는 0kg 초과 200kg 이하로 입력해 주세요.");
    if (new Date(birthDate) > new Date()) return setError("생년월일은 오늘 이후로 설정할 수 없어요.");
    if (registrationNumber && registrationNumber.length !== 15) return setError("동물등록번호는 숫자 15자리로 입력해 주세요.");

    setUploading(true);
    setError("");
    const supabase = createBrowserSupabaseClient();
    const { data: dog, error: dogError } = await supabase.from("dogs").insert({ owner_id: userId, name, breed, birth_date: birthDate, weight_kg: weightKg, gender, neutering_status: neuteredValue, animal_registration_no: registrationNumber || null }).select("id").single();
    if (dogError || !dog) {
      setError("반려동물 정보를 저장하지 못했어요. Supabase 마이그레이션을 확인해 주세요.");
      setUploading(false);
      return;
    }

    const uploadedPaths: string[] = [];
    try {
      const photoRows = [];
      for (const [position, file] of files.entries()) {
        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/${dog.id}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage.from("dog-images").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path);
        const { data: publicData } = supabase.storage.from("dog-images").getPublicUrl(path);
        photoRows.push({ dog_id: dog.id, owner_id: userId, storage_key: path, image_url: publicData.publicUrl, sort_order: position, is_primary: position === 0, original_name: file.name, mime_type: file.type, file_size: file.size });
      }
      const { error: photosError } = await supabase.from("dog_images").insert(photoRows);
      if (photosError) throw photosError;
      router.push("/");
      router.refresh();
    } catch {
      if (uploadedPaths.length) await supabase.storage.from("dog-images").remove(uploadedPaths);
      await supabase.from("dogs").delete().eq("id", dog.id);
      setError("사진 업로드에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setUploading(false);
    }
  }

  return (
    <form ref={formRef} className="pet-registration-form" onSubmit={submit}>
      <div className="registration-progress" aria-label={`총 3단계 중 ${step}단계`}><span>{step} / 3</span><div>{[1, 2, 3].map((item) => <i key={item} className={item <= step ? "active" : ""} />)}</div></div>
      {error && <p className="form-message" role="alert">{error}</p>}
      <section className="registration-step" data-step="1" hidden={step !== 1}>
      <h1>우리 아이를 소개해 주세요</h1>
      <div className="photo-upload-heading"><b>대표 사진을 첫 번째로 선택해 주세요. 최대 6장까지 등록할 수 있어요.</b><span>{files.length}/{MAX_PHOTOS}</span></div>
      <div className="photo-header-scroll" style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap" }}>
        <input id="pet-photo-upload" className="photo-file-input" type="file" accept={ACCEPTED_TYPES.join(",")} multiple onChange={selectPhotos} />
        {previews.map((preview, index) => (
          <div className="header-photo-item" key={previews[index]}>
            <div className="header-photo-media"><img src={previews[index]} alt={`선택한 사진 ${index + 1}`} /></div>
            <span>{index === 0 ? "대표 사진" : `사진 ${index + 1}`}</span>
            <button type="button" aria-label={`${index + 1}번째 사진 삭제`} onClick={() => removePhoto(index)}>×</button>
          </div>
        ))}
        {files.length < MAX_PHOTOS && <label className="photo-empty-slot" htmlFor="pet-photo-upload" aria-label="사진 추가" tabIndex={0}><FaCamera aria-hidden /></label>}
      </div>
      <label>이름<input name="name" placeholder="예: 얼리" required maxLength={20} /></label>
      <label>견종<input name="breed" placeholder="예: 포메라니안" required maxLength={30} /></label>
      <div className="birth-date-field"><span className="field-label">생년월일</span><div>
        <label><select aria-label="출생 연도" value={birthYear} onChange={(event) => setBirthYear(event.target.value)} required><option value="">년도</option>{Array.from({ length: 31 }, (_, index) => currentYear - index).map((year) => <option key={year} value={year}>{year}년</option>)}</select></label>
        <label><select aria-label="출생 월" value={birthMonth} onChange={(event) => setBirthMonth(event.target.value)} required><option value="">월</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{month}월</option>)}</select></label>
        <label><select aria-label="출생 일" value={birthDay} onChange={(event) => setBirthDay(event.target.value)} required><option value="">일</option>{Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}일</option>)}</select></label>
      </div></div>
      <fieldset><legend>성별</legend><label><input type="radio" name="gender" value="MALE" required /> 남아</label><label><input type="radio" name="gender" value="FEMALE" required /> 여아</label></fieldset>
      <div className="step-actions"><button className="button primary" type="button" onClick={goToNextStep}>다음</button></div>
      </section>
      <section className="registration-step" data-step="2" hidden={step !== 2}>
      <h1>조금 더 알려주세요</h1>
      <p className="step-description">몸무게와 중성화 여부는 나중에 입력할 수도 있어요.</p>
      <label>몸무게 (kg) <small className="optional-label">선택</small><input name="weightKg" type="number" inputMode="decimal" min="0.1" max="200" step="0.1" placeholder="예: 3.8" /></label>
      <fieldset><legend>중성화 여부 <small className="optional-label">선택</small></legend><label><input type="radio" name="isNeutered" value="NEUTERED" /> 했어요</label><label><input type="radio" name="isNeutered" value="NOT_NEUTERED" /> 안 했어요</label><label><input type="radio" name="isNeutered" value="UNKNOWN" /> 몰라요</label></fieldset>
      <div className="step-actions split"><button className="button step-back" type="button" onClick={() => setStep(1)}>이전</button><button className="skip-button" type="button" onClick={() => setStep(3)}>건너뛰기</button><button className="button primary" type="button" onClick={goToNextStep}>다음</button></div>
      </section>
      <section className="registration-step" data-step="3" hidden={step !== 3}>
      <h1>등록정보를 확인해 주세요</h1>
      <p className="step-description">동물등록번호가 없다면 건너뛸 수 있어요.</p>
      <div className="registration-number-field">
        <div><label htmlFor="animal-registration-number">동물등록번호 <small className="optional-label">선택</small></label><a href="https://www.animal.go.kr/front/index.do" target="_blank" rel="noopener noreferrer">동물등록번호를 몰라요? 조회하기 ↗</a></div>
        <input id="animal-registration-number" name="registrationNumber" inputMode="numeric" pattern="[0-9]{15}" maxLength={15} placeholder="숫자 15자리" />
      </div>
      <div className="step-actions split"><button className="button step-back" type="button" onClick={() => setStep(2)}>이전</button><button className="skip-button" type="submit" disabled={uploading}>건너뛰기</button><button className="button primary" type="submit" disabled={uploading}>{uploading ? "사진을 올리고 있어요..." : "이름표 만들기"}</button></div>
      </section>
    </form>
  );
}
