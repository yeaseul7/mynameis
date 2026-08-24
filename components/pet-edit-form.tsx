"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaCamera } from "react-icons/fa";
import { HospitalSearchField } from "@/components/hospital-search-field";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { saveDogBasicProfile, saveDogCareProfile, updateDogProfile } from "@/lib/pets/service";
import { ACCEPTED_DOG_IMAGE_TYPES, isDuplicateRegistrationNumberError, MAX_DOG_PHOTOS, normalizeInstagramUsername, normalizeRegistrationNumber, validateBirthDate, validateDogImageFile, validateDogPhotoCount, validateInstagramUsername, validateRegistrationNumber, validateWeightKg } from "@/lib/pets/validation";
import { KOREA_REGION_OPTIONS, KOREA_SIDO_OPTIONS } from "@/lib/regions/korea-administrative-districts";
import type { DogProfile } from "@/lib/dogs";

type ExistingPhoto = { id: string; storageKey: string; url: string; sortOrder: number; isPrimary: boolean };
type EditableDog = Omit<DogProfile, "photos"> & { ownerId: string; photos: ExistingPhoto[] };
type KoreaSido = keyof typeof KOREA_REGION_OPTIONS;

function getTodayParts() {
  const today = new Date();
  return {
    year: String(today.getFullYear()),
    month: String(today.getMonth() + 1),
    day: String(today.getDate()),
  };
}

export function PetEditForm({ dog }: { dog: EditableDog }) {
  const searchParams = useSearchParams();
  const [photos, setPhotos] = useState(dog.photos);
  const [deletedPhotos, setDeletedPhotos] = useState<ExistingPhoto[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(() => searchParams.get("step") === "emergency" ? 2 : 1);
  const [birthYear, setBirthYear] = useState(() => dog.birthDate?.slice(0, 4) ?? "");
  const [birthMonth, setBirthMonth] = useState(() => dog.birthDate?.slice(5, 7).replace(/^0/, "") ?? "");
  const [birthDay, setBirthDay] = useState(() => dog.birthDate?.slice(8, 10).replace(/^0/, "") ?? "");
  const savedResidenceDistrict = dog.residenceDistrict ?? "";
  const savedResidenceSido = KOREA_SIDO_OPTIONS.find((sido) => savedResidenceDistrict.startsWith(`${sido} `));
  const savedResidenceSigungu = savedResidenceSido ? savedResidenceDistrict.replace(`${savedResidenceSido} `, "") : savedResidenceDistrict;
  const [residenceSido, setResidenceSido] = useState<KoreaSido | "">(savedResidenceSido ?? "");
  const [residenceSigungu, setResidenceSigungu] = useState(savedResidenceSigungu);
  const [lostYear, setLostYear] = useState(() => dog.careProfile?.lostAt?.slice(0, 4) ?? getTodayParts().year);
  const [lostMonth, setLostMonth] = useState(() => dog.careProfile?.lostAt?.slice(5, 7).replace(/^0/, "") ?? getTodayParts().month);
  const [lostDay, setLostDay] = useState(() => dog.careProfile?.lostAt?.slice(8, 10).replace(/^0/, "") ?? getTodayParts().day);
  const savedLostDistrict = dog.careProfile?.lostLocationDistrict ?? "";
  const savedLostSido = KOREA_SIDO_OPTIONS.find((sido) => savedLostDistrict.startsWith(`${sido} `));
  const savedLostSigungu = savedLostSido ? savedLostDistrict.replace(`${savedLostSido} `, "") : savedLostDistrict;
  const [lostSido, setLostSido] = useState<KoreaSido | "">(savedLostSido ?? "");
  const [lostSigungu, setLostSigungu] = useState(savedLostSigungu);
  const formRef = useRef<HTMLFormElement>(null);
  const currentYear = new Date().getFullYear();
  const stepTitle = ["기본정보", "긴급정보", "돌봄정보"][step - 1];
  const daysInMonth = birthYear && birthMonth ? new Date(Number(birthYear), Number(birthMonth), 0).getDate() : 31;
  const lostDaysInMonth = lostYear && lostMonth ? new Date(Number(lostYear), Number(lostMonth), 0).getDate() : 31;
  const lostSigunguOptions = lostSido ? KOREA_REGION_OPTIONS[lostSido] : [];
  const residenceSigunguOptions = residenceSido ? KOREA_REGION_OPTIONS[residenceSido] : [];

  useEffect(() => {
    const urls = files.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(URL.revokeObjectURL);
  }, [files]);

  useEffect(() => {
    if (birthDay && Number(birthDay) > daysInMonth) setBirthDay("");
  }, [birthDay, daysInMonth]);

  useEffect(() => {
    if (lostDay && Number(lostDay) > lostDaysInMonth) setLostDay("");
  }, [lostDay, lostDaysInMonth]);

  function selectPhotos(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    const countError = validateDogPhotoCount(photos.length + files.length + selected.length);
    const fileError = selected.map(validateDogImageFile).find(Boolean);
    if (countError) return setError(countError);
    if (fileError) return setError(fileError);
    setError("");
    setFiles((current) => [...current, ...selected]);
  }

  function removeExistingPhoto(photo: ExistingPhoto) {
    setPhotos((current) => current.filter((item) => item.id !== photo.id));
    setDeletedPhotos((current) => [...current, photo]);
  }

  function getProfileInput(form: FormData) {
    const weightKg = Number(form.get("weightKg"));
    const birthDate = birthYear && birthMonth && birthDay ? `${birthYear}-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}` : "";
    return {
      name: String(form.get("name") ?? "").trim(),
      breed: String(form.get("breed") ?? "").trim(),
      residenceDistrict: residenceSido && residenceSigungu ? `${residenceSido} ${residenceSigungu}` : null,
      birthDate,
      weightKg,
      gender: String(form.get("gender")) as DogProfile["gender"],
      neuteringStatus: String(form.get("isNeutered")) as DogProfile["neuteringStatus"],
      animalRegistrationNo: normalizeRegistrationNumber(form.get("registrationNumber")) || null,
      instagramUsername: normalizeInstagramUsername(form.get("instagramUsername")) || null,
    };
  }

  function getCareProfileInput(form: FormData) {
    const takesMedicationValue = String(form.get("takesMedication") ?? "");
    const lostAt = lostYear && lostMonth && lostDay
      ? new Date(`${lostYear}-${lostMonth.padStart(2, "0")}-${lostDay.padStart(2, "0")}T00:00`).toISOString()
      : null;
    const lostLocationDistrict = lostSido && lostSigungu ? `${lostSido} ${lostSigungu}` : null;
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
      lostAt,
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

  async function goToNextStep() {
    if (step === 1 && photos.length + files.length === 0) return setError("사진을 한 장 이상 남겨 주세요.");
    const controls = formRef.current?.querySelectorAll<HTMLElement>(`[data-step="${step}"] input, [data-step="${step}"] select, [data-step="${step}"] textarea`);
    for (const control of Array.from(controls ?? [])) {
      if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
        if (!control.checkValidity()) {
          control.reportValidity();
          return;
        }
      }
    }
    const formElement = formRef.current;
    if (!formElement) return;
    const form = new FormData(formElement);
    const supabase = createBrowserSupabaseClient();
    setSaving(true);
    try {
      if (step === 1) {
        const profile = getProfileInput(form);
        const validationError = validateWeightKg(profile.weightKg, true) || validateBirthDate(profile.birthDate) || validateRegistrationNumber(profile.animalRegistrationNo ?? "") || validateInstagramUsername(profile.instagramUsername ?? "");
        if (validationError) {
          setSaving(false);
          return setError(validationError);
        }
        await saveDogBasicProfile(supabase, { ownerId: dog.ownerId, dogId: dog.id, profile, keptPhotos: photos, deletedPhotos, files });
        setFiles([]);
        setDeletedPhotos([]);
      }
      if (step === 2) {
        const careProfile = getCareProfileInput(form);
        if (!careProfile.emergencyContact1) {
          setSaving(false);
          return setError("긴급 연락처1을 입력해 주세요.");
        }
        await saveDogCareProfile(supabase, { ownerId: dog.ownerId, dogId: dog.id, careProfile });
      }
    } catch (error) {
      setSaving(false);
      if (isDuplicateRegistrationNumberError(error)) return setError("동물등록번호는 중복될 수 없습니다.");
      return setError("현재 단계 정보를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    }
    setSaving(false);
    setError("");
    setStep((current) => Math.min(3, current + 1));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (photos.length + files.length === 0) return setError("사진을 한 장 이상 남겨 주세요.");

    const form = new FormData(event.currentTarget);
    const profile = getProfileInput(form);
    const careProfile = getCareProfileInput(form);
    const validationError = validateWeightKg(profile.weightKg, true) || validateBirthDate(profile.birthDate) || validateRegistrationNumber(profile.animalRegistrationNo ?? "") || validateInstagramUsername(profile.instagramUsername ?? "");
    if (validationError) return setError(validationError);
    if (!careProfile.emergencyContact1 || !careProfile.mealsPerDay || careProfile.walksPerWeek === null || !careProfile.toiletingType || careProfile.marksIndoors === null || careProfile.fifthVaccineDone === null || careProfile.daycareExperience === null || careProfile.hasAllergy === null) return setError("긴급 연락처와 돌봄 필수 정보를 입력해 주세요.");

    setSaving(true);
    setError("");
    const supabase = createBrowserSupabaseClient();
    try {
      await updateDogProfile(supabase, {
        ownerId: dog.ownerId,
        dogId: dog.id,
        profile,
        careProfile,
        keptPhotos: photos,
        deletedPhotos,
        files,
      });
      location.replace("/");
    } catch (error) {
      setError(isDuplicateRegistrationNumberError(error) ? "동물등록번호는 중복될 수 없습니다." : "사진을 수정하지 못했어요. Storage와 dog_images 정책을 확인해 주세요.");
      setSaving(false);
    }
  }

  return (
    <form ref={formRef} className="pet-registration-form pet-edit-form" onSubmit={submit}>
      <div className="registration-progress" aria-label={`총 3단계 중 ${step}단계 ${stepTitle}`}><span>{step} / 3</span><div>{[1, 2, 3].map((item) => <i key={item} className={item <= step ? "active" : ""} />)}</div></div>
      <h1>{dog.name} 정보 수정 <span className="step-title">({stepTitle})</span></h1>
      {error && <p className="form-message" role="alert">{error}</p>}
      <section className="registration-step" data-step="1" hidden={step !== 1}>
      <div className="photo-upload-heading"><b>사진 추가·삭제</b><span>{photos.length + files.length}/{MAX_DOG_PHOTOS}</span></div>
      <div className="photo-header-scroll">
        <input id="edit-pet-photo-upload" className="photo-file-input" type="file" accept={ACCEPTED_DOG_IMAGE_TYPES.join(",")} multiple onChange={selectPhotos} />
        {photos.map((photo, index) => <div className="header-photo-item" key={photo.id}><div className="header-photo-media"><img src={photo.url} alt={`등록된 사진 ${index + 1}`} /></div><span>{photo.isPrimary ? "대표 사진" : `사진 ${index + 1}`}</span><button type="button" aria-label={`${index + 1}번째 사진 삭제`} onClick={() => removeExistingPhoto(photo)}>×</button></div>)}
        {previews.map((preview, index) => <div className="header-photo-item" key={preview}><div className="header-photo-media"><img src={preview} alt={`새 사진 ${index + 1}`} /></div><span>새 사진</span><button type="button" aria-label={`새 사진 ${index + 1} 삭제`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}>×</button></div>)}
        {photos.length + files.length < MAX_DOG_PHOTOS && <label className="photo-empty-slot" htmlFor="edit-pet-photo-upload" aria-label="사진 추가" tabIndex={0}><FaCamera aria-hidden /></label>}
      </div>
      <label><span className="label-text">이름 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></span><input name="name" defaultValue={dog.name} required maxLength={10} /></label>
      <label><span className="label-text">견종 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></span><input name="breed" defaultValue={dog.breed} required maxLength={30} /></label>
      <div className="profile-location-fields">
        <span className="field-label">사는 곳</span>
        <label><span className="sr-only">시·도</span><select value={residenceSido} onChange={(event) => { setResidenceSido(event.target.value as KoreaSido | ""); setResidenceSigungu(""); }}><option value="">시·도 선택</option>{KOREA_SIDO_OPTIONS.map((sido) => <option key={sido} value={sido}>{sido}</option>)}</select></label>
        <label><span className="sr-only">시·군·구</span><select value={residenceSigungu} onChange={(event) => setResidenceSigungu(event.target.value)} disabled={!residenceSido}><option value="">시·군·구 선택</option>{residenceSigunguOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      </div>
      <div className="birth-date-field"><span className="field-label">생년월일 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></span><div>
        <label><select aria-label="출생 연도" value={birthYear} onChange={(event) => setBirthYear(event.target.value)} required><option value="">년도</option>{Array.from({ length: 31 }, (_, index) => currentYear - index).map((year) => <option key={year} value={year}>{year}년</option>)}</select></label>
        <label><select aria-label="출생 월" value={birthMonth} onChange={(event) => setBirthMonth(event.target.value)} required><option value="">월</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{month}월</option>)}</select></label>
        <label><select aria-label="출생 일" value={birthDay} onChange={(event) => setBirthDay(event.target.value)} required><option value="">일</option>{Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}일</option>)}</select></label>
      </div></div>
      <label><span className="label-text">몸무게 (kg) <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></span><input name="weightKg" type="number" inputMode="decimal" min="0.1" max="200" step="0.1" defaultValue={dog.weightKg ?? ""} required /></label>
      <fieldset><legend>성별 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></legend><label><input type="radio" name="gender" value="MALE" defaultChecked={dog.gender === "MALE"} required /> 남아</label><label><input type="radio" name="gender" value="FEMALE" defaultChecked={dog.gender === "FEMALE"} required /> 여아</label></fieldset>
      <fieldset className="three-option-field"><legend>중성화 여부 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></legend><label><input type="radio" name="isNeutered" value="NEUTERED" defaultChecked={dog.neuteringStatus === "NEUTERED"} required /> 했어요</label><label><input type="radio" name="isNeutered" value="NOT_NEUTERED" defaultChecked={dog.neuteringStatus === "NOT_NEUTERED"} required /> 안 했어요</label><label><input type="radio" name="isNeutered" value="UNKNOWN" defaultChecked={dog.neuteringStatus === "UNKNOWN"} required /> 몰라요</label></fieldset>
      <div className="registration-number-field"><div><label htmlFor="edit-animal-registration-number">동물등록번호</label></div><input id="edit-animal-registration-number" name="registrationNumber" inputMode="numeric" pattern="[0-9]{15}" maxLength={15} defaultValue={dog.animalRegistrationNo ?? ""} placeholder="숫자 15자리" /></div>
      <label>인스타 아이디<input name="instagramUsername" inputMode="text" maxLength={31} defaultValue={dog.instagramUsername ?? ""} placeholder="예: mynameis.pet" /></label>
      <div className="step-actions"><button className="button primary" type="button" onClick={goToNextStep}>다음</button></div>
      </section>
      <section className="registration-step" data-step="2" hidden={step !== 2}>
      <p className="info-note">연락처는 화면에 직접 공개되지 않고, 연락 요청을 전달하는 데 사용돼요.</p>
      <label><span className="label-text">긴급 연락처1 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></span><input name="emergencyContact1" type="tel" inputMode="tel" defaultValue={dog.careProfile?.emergencyContact1 ?? ""} required maxLength={30} /></label>
      <label>긴급 연락처2<input name="emergencyContact2" type="tel" inputMode="tel" defaultValue={dog.careProfile?.emergencyContact2 ?? ""} maxLength={30} /></label>
      <fieldset><legend>복용약 여부</legend><label><input type="radio" name="takesMedication" value="YES" defaultChecked={dog.careProfile?.takesMedication === true} /> 있어요</label><label><input type="radio" name="takesMedication" value="NO" defaultChecked={dog.careProfile?.takesMedication === false} /> 없어요</label></fieldset>
      <div className="birth-date-field lost-date-field"><span className="field-label">실종 날짜</span><div>
        <label><select aria-label="실종 연도" value={lostYear} onChange={(event) => setLostYear(event.target.value)}><option value="">년도</option>{Array.from({ length: 31 }, (_, index) => currentYear - index).map((year) => <option key={year} value={year}>{year}년</option>)}</select></label>
        <label><select aria-label="실종 월" value={lostMonth} onChange={(event) => setLostMonth(event.target.value)}><option value="">월</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{month}월</option>)}</select></label>
        <label><select aria-label="실종 일" value={lostDay} onChange={(event) => setLostDay(event.target.value)}><option value="">일</option>{Array.from({ length: lostDaysInMonth }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}일</option>)}</select></label>
      </div></div>
      <div className="lost-location-fields">
        <span className="field-label">실종지 위치</span>
        <label>시도<select value={lostSido} onChange={(event) => { setLostSido(event.target.value as KoreaSido | ""); setLostSigungu(""); }}><option value="">시도</option>{KOREA_SIDO_OPTIONS.map((sido) => <option key={sido} value={sido}>{sido}</option>)}</select></label>
        <label>시/군/구<select value={lostSigungu} onChange={(event) => setLostSigungu(event.target.value)} disabled={!lostSido}><option value="">시/군/구</option>{lostSigunguOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
        <label>읍/면/동<input name="lostLocationNeighborhood" defaultValue={dog.careProfile?.lostLocationNeighborhood ?? ""} placeholder="예: 역삼동" /></label>
        <label>자세한 위치<textarea name="lostLocationDetail" rows={3} defaultValue={dog.careProfile?.lostLocationDetail ?? ""} placeholder="예: 역삼역 3번 출구 근처, 노란 벤치 앞" /></label>
      </div>
      <HospitalSearchField defaultValue={dog.careProfile?.primaryHospital ?? ""} defaultAddress={dog.careProfile?.primaryHospitalAddress ?? ""} defaultPhone={dog.careProfile?.primaryHospitalPhone ?? ""} />
      <label>특이사항<textarea name="emergencyNote" rows={3} defaultValue={dog.careProfile?.emergencyNote ?? ""} /></label>
      <div className="step-actions split"><button className="button step-back" type="button" onClick={() => setStep(1)}>이전</button><span aria-hidden></span><button className="button primary" type="button" onClick={goToNextStep}>다음</button></div>
      </section>
      <section className="registration-step" data-step="3" hidden={step !== 3}>
      <label><span className="label-text">1일 식사 횟수 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></span><input name="mealsPerDay" type="number" inputMode="numeric" min="1" max="10" step="1" defaultValue={dog.careProfile?.mealsPerDay ?? ""} required /></label>
      <label><span className="label-text">일주일 산책 횟수 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></span><input name="walksPerWeek" type="number" inputMode="numeric" min="0" max="70" step="1" defaultValue={dog.careProfile?.walksPerWeek ?? ""} required /></label>
      <fieldset className="three-option-field"><legend>배변 방식 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></legend><label><input type="radio" name="toiletingType" value="INDOOR" defaultChecked={dog.careProfile?.toiletingType === "INDOOR"} required /> 실내</label><label><input type="radio" name="toiletingType" value="OUTDOOR" defaultChecked={dog.careProfile?.toiletingType === "OUTDOOR"} required /> 실외</label><label><input type="radio" name="toiletingType" value="BOTH" defaultChecked={dog.careProfile?.toiletingType === "BOTH"} required /> 둘 다</label></fieldset>
      <fieldset><legend>마킹 여부 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></legend><label><input type="radio" name="marksIndoors" value="YES" defaultChecked={dog.careProfile?.marksIndoors === true} required /> 해요</label><label><input type="radio" name="marksIndoors" value="NO" defaultChecked={dog.careProfile?.marksIndoors === false} required /> 안 해요</label></fieldset>
      <fieldset><legend>5차 필수 접종 여부 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></legend><label><input type="radio" name="fifthVaccineDone" value="YES" defaultChecked={dog.careProfile?.fifthVaccineDone === true} required /> 완료</label><label><input type="radio" name="fifthVaccineDone" value="NO" defaultChecked={dog.careProfile?.fifthVaccineDone === false} required /> 미완료</label></fieldset>
      <fieldset><legend>유치원 경험 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></legend><label><input type="radio" name="daycareExperience" value="YES" defaultChecked={dog.careProfile?.daycareExperience === true} required /> 있어요</label><label><input type="radio" name="daycareExperience" value="NO" defaultChecked={dog.careProfile?.daycareExperience === false} required /> 없어요</label></fieldset>
      <fieldset><legend>알러지 여부 <span className="required-mark" aria-hidden>*</span><span className="sr-only">필수</span></legend><label><input type="radio" name="hasAllergy" value="YES" defaultChecked={dog.careProfile?.hasAllergy === true} required /> 있어요</label><label><input type="radio" name="hasAllergy" value="NO" defaultChecked={dog.careProfile?.hasAllergy === false} required /> 없어요</label></fieldset>
      <label>전달 메모<textarea name="handoffMemo" rows={4} defaultValue={dog.careProfile?.handoffMemo ?? ""} placeholder="성향이나 알러지 종류에 대해 설명을 적어주세요." /></label>
      <div className="step-actions split"><button className="button step-back" type="button" onClick={() => setStep(2)}>이전</button><span aria-hidden></span><button className="button primary" type="submit" disabled={saving}>{saving ? "저장하고 있어요..." : "수정 완료"}</button></div>
      </section>
    </form>
  );
}
