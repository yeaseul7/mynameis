"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RiMapPinLine } from "react-icons/ri";
import { invokeFunction } from "@/lib/supabase/functions";
import { CommunitySection } from "@/components/community-section";

type RecentLostDog = { id: string; name: string; breed: string; lostLocation: string; lostAt: string; photoUrl: string | null; token: string };

const LOST_DOGS_PAGE_SIZE = 6;

async function getRecentLostDogs(cursor: number) {
  return invokeFunction<{ dogs: RecentLostDog[]; nextCursor: number | null }>("friends", {
    action: "nearby-lost",
    cursor,
    limit: LOST_DOGS_PAGE_SIZE,
  });
}

export function OngijonggiPage() {
  const [dogs, setDogs] = useState<RecentLostDog[]>([]);
  const [cursor, setCursor] = useState(0);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getRecentLostDogs(cursor)
      .then((data) => {
        if (!active) return;
        setDogs(data.dogs);
        setNextCursor(data.nextCursor);
      })
      .catch((error) => console.error(error))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [cursor]);

  return <div className="logged-home ongijonggi-page">
    {(loading || dogs.length > 0) && <section className="home-section nearby-lost-section recent-lost-section" aria-labelledby="recent-lost-title" aria-busy={loading}>
      <div className="section-heading"><h1 id="recent-lost-title">주인을 찾아주세요</h1></div>
      <div className="nearby-lost-grid">{loading ? Array.from({ length: LOST_DOGS_PAGE_SIZE }, (_, index) => <div className="recent-lost-skeleton skeleton-card" key={index}><div className="skeleton-line" /><div className="skeleton-line" /></div>) : dogs.map((dog) => <Link className="nearby-lost-card" href={`/share/${dog.token}`} key={dog.id}><div className="nearby-lost-photo">{dog.photoUrl ? <Image src={dog.photoUrl} alt={`${dog.name} 사진`} fill sizes="(max-width:760px) 46vw, 240px" quality={66} /> : <span className="nearby-lost-placeholder" aria-hidden>{dog.name.slice(0, 1)}</span>}<b className="nearby-lost-badge">실종</b><div className="nearby-lost-copy"><h3>{dog.name}</h3><p><RiMapPinLine aria-hidden="true" />{dog.lostLocation || "위치 정보 없음"}</p></div></div></Link>)}</div>
      {!loading && <nav className="recent-lost-pagination" aria-label="실종 카드 페이지 이동">
        <button type="button" onClick={() => setCursor(Math.max(0, cursor - LOST_DOGS_PAGE_SIZE))} disabled={loading || cursor === 0}>&lt; 이전</button>
        <button type="button" onClick={() => { if (nextCursor !== null) setCursor(nextCursor); }} disabled={loading || nextCursor === null}>다음 &gt;</button>
      </nav>}
    </section>}
    <CommunitySection />
  </div>;
}
