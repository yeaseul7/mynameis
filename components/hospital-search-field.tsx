"use client";

import { useState } from "react";
import { invokeFunction } from "@/lib/supabase/functions";

type HospitalResult = {
  id: string;
  name: string;
  address: string;
  phone: string;
  url: string;
};

export function HospitalSearchField({
  defaultValue = "",
  defaultAddress = "",
  defaultPhone = "",
}: {
  defaultValue?: string;
  defaultAddress?: string;
  defaultPhone?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [address, setAddress] = useState(defaultAddress);
  const [phone, setPhone] = useState(defaultPhone);
  const [results, setResults] = useState<HospitalResult[]>([]);
  const [message, setMessage] = useState("");
  const [searching, setSearching] = useState(false);

  async function searchHospitals() {
    const query = value.trim();
    if (query.length < 2) {
      setMessage("병원명이나 지역을 2자 이상 입력해 주세요.");
      setResults([]);
      return;
    }

    setSearching(true);
    setMessage("");
    try {
      const data = await invokeFunction<{ documents?: HospitalResult[] }>("kakao-hospitals", { query });
      const documents = data.documents ?? [];
      setResults(documents);
      setMessage(documents.length ? "" : "검색 결과가 없어요. 지역명과 함께 다시 검색해 보세요.");
    } catch {
      setResults([]);
      setMessage("병원 검색을 불러오지 못했어요. 직접 입력해 주세요.");
    } finally {
      setSearching(false);
    }
  }

  function selectHospital(hospital: HospitalResult) {
    setValue(hospital.name);
    setAddress(hospital.address);
    setPhone(hospital.phone);
    setResults([]);
    setMessage("");
  }

  return (
    <div className="hospital-search-field">
      <label>
        주치 병원
        <span>
          <input name="primaryHospital" value={value} onChange={(event) => { setValue(event.target.value); setAddress(""); setPhone(""); }} placeholder="예: 강남 동물병원" maxLength={100} />
          <button type="button" onClick={searchHospitals} disabled={searching}>{searching ? "검색 중" : "검색"}</button>
        </span>
      </label>
      <input type="hidden" name="primaryHospitalAddress" value={address} />
      <input type="hidden" name="primaryHospitalPhone" value={phone} />
      {message && <p>{message}</p>}
      {results.length > 0 && (
        <div className="hospital-results">
          {results.map((hospital) => (
            <button type="button" key={hospital.id} onClick={() => selectHospital(hospital)}>
              <strong>{hospital.name}</strong>
              {hospital.address && <span>{hospital.address}</span>}
              {hospital.phone && <small>{hospital.phone}</small>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
