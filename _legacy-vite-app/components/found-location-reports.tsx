"use client";

import { useEffect, useRef } from "react";

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
        Map: new (container: HTMLElement, options: { center: unknown; level: number }) => unknown;
        LatLng: new (latitude: number, longitude: number) => unknown;
        Marker: new (options: { position: unknown; map?: unknown }) => { setMap: (map: unknown) => void };
        LatLngBounds: new () => { extend: (position: unknown) => void };
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

  useEffect(() => {
    if (!reports.length || !kakaoKey || !mapRef.current) return;

    const renderMap = () => {
      if (!window.kakao?.maps || !mapRef.current) return;
      const first = reports[0];
      const center = new window.kakao.maps.LatLng(first.latitude, first.longitude);
      const map = new window.kakao.maps.Map(mapRef.current, { center, level: reports.length > 1 ? 5 : 3 });
      const limitedMap = map as { setMinLevel?: (level: number) => void; setMaxLevel?: (level: number) => void };
      limitedMap.setMinLevel?.(2);
      limitedMap.setMaxLevel?.(7);
      reports.forEach((report) => {
        const position = new window.kakao!.maps.LatLng(report.latitude, report.longitude);
        new window.kakao!.maps.Marker({ position, map });
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
  }, [kakaoKey, reports]);

  if (!reports.length) return null;

  return (
    <section className="found-report-section" aria-labelledby="found-report-title">
      <h3 className="sr-only" id="found-report-title">실종 제보</h3>
      {kakaoKey ? <div className="found-report-map" ref={mapRef} aria-label="실종 제보 위치 지도" /> : <p className="found-report-map-empty">카카오 지도 키가 없어 목록만 표시돼요.</p>}
      <div className="found-report-list">
        {reports.map((report) => (
          <article key={report.id}>
            <time dateTime={report.createdAt}>{getReportDate(report.createdAt)}</time>
            {report.note ? <p>{report.note}</p> : <p>추가 메모가 없어요.</p>}
          </article>
        ))}
      </div>
    </section>
  );
}
