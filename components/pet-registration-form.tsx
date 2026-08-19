"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaCamera } from "react-icons/fa";
import { HospitalSearchField } from "@/components/hospital-search-field";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { createDogBasicProfile, saveDogCareProfile } from "@/lib/pets/service";
import { ACCEPTED_DOG_IMAGE_TYPES, MAX_DOG_PHOTOS, normalizeInstagramUsername, normalizeRegistrationNumber, validateBirthDate, validateDogImageFile, validateDogPhotoCount, validateInstagramUsername, validateRegistrationNumber, validateWeightKg } from "@/lib/pets/validation";
import { KOREA_REGION_OPTIONS, KOREA_SIDO_OPTIONS } from "@/lib/regions/korea-administrative-districts";
import type { DogProfile } from "@/lib/dogs";

type KoreaSido = keyof typeof KOREA_REGION_OPTIONS;

export function PetRegistrationForm({ userId }: { userId: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dogId, setDogId] = useState<string | null>(null);
  const [birthYear, setBirthYear] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [residenceSido, setResidenceSido] = useState<KoreaSido | "">("");
  const [residenceSigungu, setResidenceSigungu] = useState("");
  const [step, setStep] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const creatingDogPromiseRef = useRef<Promise<string> | null>(null);
  const router = useRouter();
  const currentYear = new Date().getFullYear();
  const stepTitle = ["기본정보", "긴급정보", "돌봄정보"][step - 1];
  const daysInMonth = birthYear && birthMonth ? new Date(Number(birthYear), Number(birthMonth), 0).getDate() : 31;
  const residenceSigunguOptions = residenceSido ? KOREA_REGION_OPTIONS[residenceSido] : [];

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
    const countError = validateDogPhotoCount(combined.length);
    const fileError = selected.map(validateDogImageFile).find(Boolean);
    if (countError) return setError(countError);
    if (fileError) return setError(fileError);
    setError("");
    setFiles(combined);
  }

  function removePhoto(index: number) {
    setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
  }

  function getProfileInput(form: FormData) {
    const birthDate = birthYear && birthMonth && birthDay ? `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}` : "";
    const weightValue = String(form.get("weightKg") ?? "").trim();
    return {
      name: String(form.get("name") ?? "").trim(),
      breed: String(form.get("breed") ?? "").trim(),
      residenceDistrict: residenceSido && residenceSigungu ? `${residenceSido} ${residenceSigungu}` : null,
      birthDate,
      weightKg: weightValue ? Number(weightValue) : null,
      gender: String(form.get("gender")) as DogProfile["gender"],
      neuteringStatus: String(form.get("isNeutered") ?? "UNKNOWN") as DogProfile["neuteringStatus"],
      animalRegistrationNo: normalizeRegistrationNumber(form.get("registrationNumber")) || null,
      instagramUsername: normalizeInstagramUsername(form.get("instagramUsername")) || null,
    };
  }

  function getCareProfileInput(form: FormData) {
    const takesMedicationValue = String(form.get("takesMedication") ?? "");
    const lostLocationDistrict = String(form.get("lostLocationDistrict") ?? "").trim() || null;
    const lostLocationNeighborhood = String(form.get("lostLocationNeighborhood") ?? "").trim() || null;
    const lostLocationDetail = String(form.get("lostLocationDetail") ?? "").trim() || null;
    const lostLocationAddress = [lostLocationDistrict, lostLocationNeighborhood, lostLocationDetail].filter(Boolean).join(" ") || null;
    return {
      takesMedication: takesMedicationValue ? takesMedicationValue === "YES" : null,
      primaryHospital: String(form.get("primaryHospital") ?? "").trim() || null,
      primaryHospitalAddress: String(form.get("primaryHospitalAddress") ?? "").trim() || null,
      primaryHospitalPhone: String(form.get("primaryHospitalPhone") ?? "").trim() || null,
      emergencyNote: String(form.get("emergencyNote") ?? "").trim() || null,
      emergencyContact1: String(form.get("emergencyContact1") ?? "").trim(),
      emergencyContact2: String(form.get("emergencyContact2") ?? "").trim() || null,
      lostLocationAddress,
      lostLocationDistrict,
      lostLocationNeighborhood,
      lostLocationDetail,
      lostLocationLat: null,
      lostLocationLng: null,
      lostAt: String(form.get("lostAt") ?? "").trim() ? new Date(String(form.get("lostAt"))).toISOString() : null,
      mealsPerDay: String(form.get("mealsPerDay") ?? "").trim() ? Number(form.get("mealsPerDay")) : null,
      walksPerWeek: String(form.get("walksPerWeek") ?? "").trim() ? Number(form.get("walksPerWeek")) : null,
      toiletingType: String(form.get("toiletingType") ?? "") as "INDOOR" | "OUTDOOR" | "BOTH" || null,
      marksIndoors: String(form.get("marksIndoors") ?? "") ? String(form.get("marksIndoors")) === "YES" : null,
      fifthVaccineDone: String(form.get("fifthVaccineDone") ?? "") ? String(form.get("fifthVaccineDone")) === "YES" : null,
      daycareExperience: String(form.get("daycareExperience") ?? "") ? String(form.get("daycareExperience")) === "YES" : null,
      hasAllergy: String(form.get("hasAllergy") ?? "") ? String(form.get("hasAllergy")) === "YES" : null,
      handoffMemo: String(form.get("handoffMemo") ?? "").trim() || null,
    };
  }

  async function ensureDogProfileCreated(profile: ReturnType<typeof getProfileInput>) {
    if (dogId) return dogId;
    if (!creatingDogPromiseRef.current) {
      const supabase = createBrowserSupabaseClient();
      creatingDogPromiseRef.current = createDogBasicProfile(supabase, { ownerId: userId, profile, files });
    }

    try {
      const createdDogId = await creatingDogPromiseRef.current;
      setDogId(createdDogId);
      setFiles([]);
      return createdDogId;
    } catch (error) {
      creatingDogPromiseRef.current = null;
      throw error;
    }
  }

  async function goToNextStep() {
    if (uploading) return;
    if (step === 1 && !dogId && files.length === 0) return setError("우리 아이 사진을 한 장 이상 등록해 주세요.");
    const controls = formRef.current?.querySelectorAll<HTMLElement>(`[data-step="${step}"] input, [data-step="${step}"] select, [data-step="${step}"] textarea`);
    for (const control of Array.from(controls ?? [])) {
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
        if (!control.checkValidity()) {
          control.reportValidity();
          return;
        }
      }
    }
    const form = new FormData(formRef.current ?? undefined);
    setUploading(true);
    try {
      if (step === 1) {
        const profile = getProfileInput(form);
        const validationError = validateWeightKg(profile.weightKg) || validateBirthDate(profile.birthDate) || validateRegistrationNumber(profile.animalRegistrationNo ?? "") || validateInstagramUsername(profile.instagramUsername ?? "");
        if (validationError) {
          setUploading(false);
          return setError(validationError);
        }
        await ensureDogProfileCreated(profile);
      }
      if (step === 2) {
        const currentDogId = dogId;
        if (!currentDogId) throw new Error("Dog profile is not created yet");
        const careProfile = getCareProfileInput(form);
        if (!careProfile.emergencyContact1) {
          setUploading(false);
          return setError("긴급 연락처1을 입력해 주세요.");
        }
        await saveDogCareProfile(createBrowserSupabaseClient(), { ownerId: userId, dogId: currentDogId, careProfile });
      }
    } catch {
      setUploading(false);
      return setError("현재 단계 정보를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
    setUploading(false);
    setError("");
    setStep((current) => Math.min(3, current + 1));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (uploading) return;
    if (!dogId && files.length === 0) return setError("우리 아이 사진을 한 장 이상 등록해 주세요.");

    const form = new FormData(event.currentTarget);
    const profile = getProfileInput(form);
    const careProfile = getCareProfileInput(form);
    if (!profile.name || !profile.breed || !profile.birthDate || !profile.gender) return setError("사진과 기본정보를 모두 입력해 주세요.");
    if (!careProfile.emergencyContact1 || !careProfile.mealsPerDay || careProfile.walksPerWeek === null || !careProfile.toiletingType || careProfile.marksIndoors === null || careProfile.fifthVaccineDone === null || careProfile.daycareExperience === null || careProfile.hasAllergy === null) return setError("긴급 연락처와 돌봄 필수 정보를 입력해 주세요.");
    const validationError = validateWeightKg(profile.weightKg) || validateBirthDate(profile.birthDate) || validateRegistrationNumber(profile.animalRegistrationNo ?? "") || validateInstagramUsername(profile.instagramUsername ?? "");
    if (validationError) return setError(validationError);

    setUploading(true);
    setError("");
    try {
      const currentDogId = await ensureDogProfileCreated(profile);
      await saveDogCareProfile(createBrowserSupabaseClient(), { ownerId: userId, dogId: currentDogId, careProfile });
      router.push("/");
      router.refresh();
    } catch {
      setError("사진 업로드에 실패했어요. 잠시 후 다시 시도해 주세요.");
      setUploading(false);
    }
  }

  return (
    <form ref={formRef} className="pet-registration-form" onSubmit={submit}>
      <div className="registration-progress" aria-label={`총 3단계 중 ${step}단계 ${stepTitle}`}><span>{step} / 3</span><div>{[1, 2, 3].map((item) => <i key={item} className={item <= step ? "active" : ""} />)}</div></div>
      <h1>우리 아이 등록 <span className="step-title">({stepTitle})</span></h1>
      {error && <p className="form-message" role="alert">{error}</p>}
      <section className="registration-step" data-step="1" hidden={step !== 1}>
      <div className="photo-upload-heading"><b>대표 사진을 첫 번째로 선택해 주세요. 최대 7장까지 등록할 수 있어요.</b><span>{files.length}/{MAX_DOG_PHOTOS}</span></div>
      <div className="photo-header-scroll" style={{ display: "flex", flexDirection: "row", flexWrap: "nowrap" }}>
        <input id="pet-photo-upload" className="photo-file-input" type="file" accept={ACCEPTED_DOG_IMAGE_TYPES.join(",")} multiple onChange={selectPhotos} />
        {previews.map((preview, index) => (
          <div className="header-photo-item" key={previews[index]}>
            <div className="header-photo-media"><img src={previews[index]} alt={`선택한 사진 ${index + 1}`} /></div>
            <span>{index === 0 ? "대표 사진" : `사진 ${index + 1}`}</span>
            <button type="button" aria-label={`${index + 1}번째 사진 삭제`} onClick={() => removePhoto(index)}>×</button>
          </div>
        ))}
        {files.length < MAX_DOG_PHOTOS && <label className="photo-empty-slot" htmlFor="pet-photo-upload" aria-label="사진 추가" tabIndex={0}><FaCamera aria-hidden /></label>}
      </div>
      <label><span className="label-text">이름 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></span><input name="name" placeholder="예: 얼리" required maxLength={20} /></label>
      <label><span className="label-text">견종 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></span><input name="breed" placeholder="예: 포메라니안" required maxLength={30} /></label>
      <div className="profile-location-fields">
        <span className="field-label">사는 곳</span>
        <label>시·도<select value={residenceSido} onChange={(event) => { setResidenceSido(event.target.value as KoreaSido | ""); setResidenceSigungu(""); }}><option value="">시·도 선택</option>{KOREA_SIDO_OPTIONS.map((sido) => <option key={sido} value={sido}>{sido}</option>)}</select></label>
        <label>시·군·구<select value={residenceSigungu} onChange={(event) => setResidenceSigungu(event.target.value)} disabled={!residenceSido}><option value="">시·군·구 선택</option>{residenceSigunguOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      <div className="birth-date-field"><span className="field-label">생년월일 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></span><div>
        <label><select aria-label="출생 연도" value={birthYear} onChange={(event) => setBirthYear(event.target.value)} required><option value="">년도</option>{Array.from({ length: 31 }, (_, index) => currentYear - index).map((year) => <option key={year} value={year}>{year}년</option>)}</select></label>
        <label><select aria-label="출생 월" value={birthMonth} onChange={(event) => setBirthMonth(event.target.value)} required><option value="">월</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{month}월</option>)}</select></label>
        <label><select aria-label="출생 일" value={birthDay} onChange={(event) => setBirthDay(event.target.value)} required><option value="">일</option>{Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}일</option>)}</select></label>
      </div></div>
      <fieldset><legend>성별 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></legend><label><input type="radio" name="gender" value="MALE" required /> 남아</label><label><input type="radio" name="gender" value="FEMALE" required /> 여아</label></fieldset>
      <label>몸무게 (kg)<input name="weightKg" type="number" inputMode="decimal" min="0.1" max="200" step="0.1" placeholder="예: 3.8" /></label>
      <fieldset className="three-option-field"><legend>중성화 여부</legend><label><input type="radio" name="isNeutered" value="NEUTERED" /> 했어요</label><label><input type="radio" name="isNeutered" value="NOT_NEUTERED" /> 안 했어요</label><label><input type="radio" name="isNeutered" value="UNKNOWN" /> 몰라요</label></fieldset>
      <div className="registration-number-field">
        <div><label htmlFor="animal-registration-number">동물등록번호</label><a href="https://www.animal.go.kr/front/awtis/mypage/registAnimalList.do?menuNo=2000000019" target="_blank" rel="noopener noreferrer">동물등록번호를 몰라요? 조회하기 ↗</a></div>
        <input id="animal-registration-number" name="registrationNumber" inputMode="numeric" pattern="[0-9]{15}" maxLength={15} placeholder="숫자 15자리" />
      </div>
      <label>인스타 아이디<input name="instagramUsername" inputMode="text" maxLength={31} placeholder="예: mynameis.pet" /></label>
      <div className="step-actions"><button className="button primary" type="button" onClick={goToNextStep} disabled={uploading}>{uploading ? "저장 중..." : "다음"}</button></div>
      </section>
      <section className="registration-step" data-step="2" hidden={step !== 2}>
      <p className="info-note">연락처는 화면에 직접 공개되지 않고, 연락 요청을 전달하는 데 사용돼요.</p>
      <label><span className="label-text">긴급 연락처1 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></span><input name="emergencyContact1" type="tel" inputMode="tel" placeholder="예: 010-1234-5678" required maxLength={30} /></label>
      <label>긴급 연락처2<input name="emergencyContact2" type="tel" inputMode="tel" placeholder="예: 010-9876-5432" maxLength={30} /></label>
      <fieldset><legend>복용약 여부</legend><label><input type="radio" name="takesMedication" value="YES" /> 있어요</label><label><input type="radio" name="takesMedication" value="NO" /> 없어요</label></fieldset>
      <HospitalSearchField />
      <label>특이사항<textarea name="emergencyNote" rows={3} placeholder="예: 낯선 사람을 무서워해요." /></label>
      <div className="step-actions split"><button className="button step-back" type="button" onClick={() => setStep(1)} disabled={uploading}>이전</button><span aria-hidden></span><button className="button primary" type="button" onClick={goToNextStep} disabled={uploading}>{uploading ? "저장 중..." : "다음"}</button></div>
      </section>
      <section className="registration-step" data-step="3" hidden={step !== 3}>
      <p className="step-description">하루 루틴과 돌봄 시 꼭 알아야 할 내용을 입력해 주세요.</p>
      <label><span className="label-text">1일 식사 횟수 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></span><input name="mealsPerDay" type="number" inputMode="numeric" min="1" max="10" step="1" placeholder="예: 2" required /></label>
      <label><span className="label-text">일주일 산책 횟수 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></span><input name="walksPerWeek" type="number" inputMode="numeric" min="0" max="70" step="1" placeholder="예: 7" required /></label>
      <fieldset className="three-option-field"><legend>배변 방식 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></legend><label><input type="radio" name="toiletingType" value="INDOOR" required /> 실내</label><label><input type="radio" name="toiletingType" value="OUTDOOR" required /> 실외</label><label><input type="radio" name="toiletingType" value="BOTH" required /> 둘 다</label></fieldset>
      <fieldset><legend>마킹 여부 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></legend><label><input type="radio" name="marksIndoors" value="YES" required /> 해요</label><label><input type="radio" name="marksIndoors" value="NO" required /> 안 해요</label></fieldset>
      <fieldset><legend>5차 필수 접종 여부 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></legend><label><input type="radio" name="fifthVaccineDone" value="YES" required /> 완료</label><label><input type="radio" name="fifthVaccineDone" value="NO" required /> 미완료</label></fieldset>
      <fieldset><legend>유치원 경험 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></legend><label><input type="radio" name="daycareExperience" value="YES" required /> 있어요</label><label><input type="radio" name="daycareExperience" value="NO" required /> 없어요</label></fieldset>
      <fieldset><legend>알러지 여부 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></legend><label><input type="radio" name="hasAllergy" value="YES" required /> 있어요</label><label><input type="radio" name="hasAllergy" value="NO" required /> 없어요</label></fieldset>
      <label>전달 메모<textarea name="handoffMemo" rows={4} placeholder="성향이나 알러지 종류에 대해 설명을 적어주세요." /></label>
      <div className="step-actions split"><button className="button step-back" type="button" onClick={() => setStep(2)} disabled={uploading}>이전</button><span aria-hidden></span><button className="button primary" type="submit" disabled={uploading}>{uploading ? "사진을 올리고 있어요..." : "이름표 만들기"}</button></div>
      </section>
    </form>
  );
}
