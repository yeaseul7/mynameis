"use client";

import { useEffect, useMemo, useRef } from "react";

export type FoundLocationReport = {
  id: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  note: string | null;
  createdAt: string;
};

declare global {
  interface Window {
    kakao?: {
      maps: {
        load: (callback: () => void) => void;
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => { setMinLevel?: (level: number) => void; setMaxLevel?: (level: number) => void; getCenter: () => { getLat: () => number; getLng: () => number } };
        LatLng: new (latitude: number, longitude: number) => { getLat: () => number; getLng: () => number };
        Marker: new (options: { position: unknown; map?: unknown }) => { setMap: (map: unknown) => void };
        CustomOverlay: new (options: { position: unknown; map?: unknown; content: HTMLElement; yAnchor?: number; zIndex?: number }) => { setMap: (map: unknown) => void };
        LatLngBounds: new () => { extend: (position: unknown) => void };
        event: { addListener: (target: unknown, eventName: string, callback: () => void) => void };
      };
    };
  }
}

function getReportDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function FoundLocationReports({ reports, kakaoKey }: { reports: FoundLocationReport[]; kakaoKey?: string }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const chronologicalReports = useMemo(() => [...reports].sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return (Number.isNaN(aTime) ? 0 : aTime) - (Number.isNaN(bTime) ? 0 : bTime);
  }), [reports]);

  useEffect(() => {
    if (!reports.length || !kakaoKey || !mapRef.current) return;

    const renderMap = () => {
      if (!window.kakao?.maps || !mapRef.current) return;
      const first = chronologicalReports[0];
      const center = new window.kakao.maps.LatLng(first.latitude, first.longitude);
      const map = new window.kakao.maps.Map(mapRef.current, { center, level: chronologicalReports.length > 1 ? 5 : 3 });
      map.setMinLevel?.(2);
      map.setMaxLevel?.(7);
      chronologicalReports.forEach((report, index) => {
        const position = new window.kakao!.maps.LatLng(report.latitude, report.longitude);
        const marker = document.createElement("div");
        marker.className = "found-report-number-marker";
        const markerNumber = document.createElement("span");
        markerNumber.textContent = String(index + 1);
        marker.appendChild(markerNumber);
        marker.setAttribute("aria-label", `${index + 1}번째 위치 공유`);
        new window.kakao!.maps.CustomOverlay({ position, map, content: marker, yAnchor: 1, zIndex: index + 1 });
      });
    };

    if (window.kakao?.maps) {
      window.kakao.maps.load(renderMap);
      return;
    }

    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false`;
    script.async = true;
    script.onload = () => window.kakao?.maps.load(renderMap);
    document.head.appendChild(script);
  }, [chronologicalReports, kakaoKey, reports.length]);

  if (!reports.length) return null;

  return (
    <section className="found-report-section" aria-labelledby="found-report-title">
      <h3 className="sr-only" id="found-report-title">실종 제보</h3>
      {kakaoKey ? <div className="found-report-map" ref={mapRef} aria-label="실종 제보 위치 지도" /> : <p className="found-report-map-empty">카카오 지도 키가 없어 목록만 표시돼요.</p>}
      <div className="found-report-list">
        {chronologicalReports.map((report, index) => (
          <article key={report.id}>
            <span className="found-report-list-number" aria-hidden="true">{index + 1}</span>
            <div>
              <time dateTime={report.createdAt}>{getReportDate(report.createdAt)}</time>
              {report.note ? <p>{report.note}</p> : <p>추가 메모가 없어요.</p>}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
