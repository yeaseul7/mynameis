"use client";

import { FormEvent, useMemo, useState } from "react";
import { KOREA_REGION_OPTIONS, KOREA_SIDO_OPTIONS } from "@/lib/regions/korea-administrative-districts";

type KoreaSido = keyof typeof KOREA_REGION_OPTIONS;

export type LostLocationSnapshot = {
  lostAt: string | null;
  lostLocationAddress: string | null;
  lostLocationDistrict: string | null;
  lostLocationNeighborhood: string | null;
  lostLocationDetail: string | null;
};

function parseSavedDistrict(value: string | null | undefined) {
  const district = value ?? "";
  const sido = KOREA_SIDO_OPTIONS.find((item) => district.startsWith(`${item} `));
  return {
    sido: (sido ?? "") as KoreaSido | "",
    sigungu: sido ? district.replace(`${sido} `, "") : district,
  };
}

function getTodayParts() {
  const today = new Date();
  return {
    year: String(today.getFullYear()),
    month: String(today.getMonth() + 1),
    day: String(today.getDate()),
  };
}

export function LostLocationModal({
  dogId,
  initial,
  onClose,
  onSaved,
}: {
  dogId: string;
  initial: LostLocationSnapshot;
  onClose: () => void;
  onSaved: (value: LostLocationSnapshot) => void;
}) {
  const savedDistrict = parseSavedDistrict(initial.lostLocationDistrict);
  const [lostYear, setLostYear] = useState(() => initial.lostAt?.slice(0, 4) ?? getTodayParts().year);
  const [lostMonth, setLostMonth] = useState(() => initial.lostAt?.slice(5, 7).replace(/^0/, "") ?? getTodayParts().month);
  const [lostDay, setLostDay] = useState(() => initial.lostAt?.slice(8, 10).replace(/^0/, "") ?? getTodayParts().day);
  const [lostSido, setLostSido] = useState<KoreaSido | "">(savedDistrict.sido);
  const [lostSigungu, setLostSigungu] = useState(savedDistrict.sigungu);
  const [lostNeighborhood, setLostNeighborhood] = useState(initial.lostLocationNeighborhood ?? "");
  const [lostDetail, setLostDetail] = useState(initial.lostLocationDetail ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const currentYear = new Date().getFullYear();
  const daysInMonth = lostYear && lostMonth ? new Date(Number(lostYear), Number(lostMonth), 0).getDate() : 31;
  const sigunguOptions = useMemo(() => lostSido ? KOREA_REGION_OPTIONS[lostSido] : [], [lostSido]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lostAt = lostYear && lostMonth && lostDay ? new Date(`${lostYear}-${lostMonth.padStart(2, "0")}-${lostDay.padStart(2, "0")}T00:00`).toISOString() : null;
    const lostLocationDistrict = lostSido && lostSigungu ? `${lostSido} ${lostSigungu}` : null;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/dogs/${dogId}/lost-location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lostAt,
          lostLocationDistrict,
          lostLocationNeighborhood: lostNeighborhood || null,
          lostLocationDetail: lostDetail || null,
        }),
      });
      if (!response.ok) throw new Error("save failed");
      onSaved(await response.json());
      onClose();
    } catch {
      setError("실종 위치와 시간을 저장하지 못했어요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="lost-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="lost-modal" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="lost-location-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="lost-modal-header">
          <h2 id="lost-location-modal-title">실종지 등록</h2>
          <button type="button" aria-label="닫기" onClick={onClose}>×</button>
        </div>
        {error ? <p className="form-message" role="alert">{error}</p> : null}
        <div className="birth-date-field lost-date-field"><span className="field-label">실종 날짜</span><div>
          <label><select aria-label="실종 연도" value={lostYear} onChange={(event) => setLostYear(event.target.value)}><option value="">년도</option>{Array.from({ length: 31 }, (_, index) => currentYear - index).map((year) => <option key={year} value={year}>{year}년</option>)}</select></label>
          <label><select aria-label="실종 월" value={lostMonth} onChange={(event) => setLostMonth(event.target.value)}><option value="">월</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{month}월</option>)}</select></label>
          <label><select aria-label="실종 일" value={lostDay} onChange={(event) => setLostDay(event.target.value)}><option value="">일</option>{Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}일</option>)}</select></label>
        </div></div>
        <div className="lost-location-fields">
          <span className="field-label">실종지 위치</span>
          <label>시도<select value={lostSido} onChange={(event) => { setLostSido(event.target.value as KoreaSido | ""); setLostSigungu(""); }}><option value="">시도</option>{KOREA_SIDO_OPTIONS.map((sido) => <option key={sido} value={sido}>{sido}</option>)}</select></label>
          <label>시/군/구<select value={lostSigungu} onChange={(event) => setLostSigungu(event.target.value)} disabled={!lostSido}><option value="">시/군/구</option>{sigunguOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          <label>읍/면/동<input value={lostNeighborhood} onChange={(event) => setLostNeighborhood(event.target.value)} placeholder="예: 역삼동" /></label>
          <label>자세한 위치<textarea rows={3} value={lostDetail} onChange={(event) => setLostDetail(event.target.value)} placeholder="예: 역삼역 3번 출구 근처, 노란 벤치 앞" /></label>
        </div>
        <div className="lost-modal-actions">
          <button type="button" onClick={onClose}>취소</button>
          <button type="submit" disabled={saving}>{saving ? "저장 중..." : "저장"}</button>
        </div>
      </form>
    </div>
  );
}
