"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RiChat3Line, RiEditLine, RiEyeLine, RiLayoutGridLine, RiListCheck2, RiShareForwardLine } from "react-icons/ri";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { invokeFunction } from "@/lib/supabase/functions";

export type CommunityPostSummary = { id: string; slug: string; title: string; content: string | null; cover_image_url: string | null; visibility: "PUBLIC" | "MEMBERS"; view_count: number; comment_count: number; share_count: number; published_at: string | null; created_at: string; locked: boolean };

async function getPosts() {
  return invokeFunction<{ posts: CommunityPostSummary[] }>("community", { action: "list", limit: 12 });
}

export function CommunitySection() {
  const [posts, setPosts] = useState<CommunityPostSummary[]>([]);
  const [view, setView] = useState<"card" | "list">("card");
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPosts().then((data) => setPosts(data.posts)).catch((error) => console.error(error)).finally(() => setLoading(false));
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data }) => setLoggedIn(Boolean(data.user)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setLoggedIn(Boolean(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);

  async function share(post: CommunityPostSummary) {
    const url = `${location.origin}/community/${post.slug}`;
    if (navigator.share) await navigator.share({ title: post.title, url }).catch(() => undefined);
    else await navigator.clipboard.writeText(url);
    const data = await invokeFunction<{ shareCount: number }>("community", { action: "share", postId: post.id }).catch(() => null);
    if (data) setPosts((current) => current.map((item) => item.id === post.id ? { ...item, share_count: data.shareCount } : item));
  }

  return <section className="home-section community-section" aria-labelledby="community-title" aria-busy={loading}>
    <div className="section-heading"><div><h1 id="community-title">도담도담</h1><p>반려생활 이야기를 나눠보세요.</p></div><div className="community-heading-actions">{loggedIn && <Link className="community-write-button" href="/community/new"><RiEditLine />글쓰기</Link>}<div className="community-view-toggle" aria-label="게시글 보기 방식"><button className={view === "list" ? "active" : ""} onClick={() => setView("list")} aria-label="목록형"><RiListCheck2 /></button><button className={view === "card" ? "active" : ""} onClick={() => setView("card")} aria-label="카드형"><RiLayoutGridLine /></button></div></div></div>
    {loading ? <div className={`community-posts community-${view} community-skeleton-grid`}>{Array.from({ length: view === "card" ? 3 : 5 }, (_, index) => <article className="community-post community-post-skeleton" key={index}><div className="skeleton-card community-skeleton-cover" /><div className="community-post-copy"><div className="skeleton-line" /><div className="skeleton-line" /><div className="skeleton-line" /></div><div className="community-stats"><span className="skeleton-line" /><span className="skeleton-line" /></div></article>)}</div> : posts.length === 0 ? <p className="community-empty">아직 등록된 글이 없어요.</p> : <div className={`community-posts community-${view}`}>{posts.map((post) => <article className={`community-post ${post.cover_image_url ? "has-image" : "text-only"}`} key={post.id}>
      <Link href={`/community/${post.slug}`} className="community-post-link">
        {view === "card" && post.cover_image_url && <div className="community-cover"><Image src={post.cover_image_url} alt="" fill sizes="(max-width:760px) 46vw, 260px" quality={66} /></div>}
        <div className="community-post-copy"><div className="community-post-labels">{post.visibility === "MEMBERS" && <span>회원 공개</span>}</div><h2>{post.title}</h2>{post.content && <p>{post.content}</p>}<time>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(post.published_at ?? post.created_at))}</time></div>
      </Link>
      <div className="community-stats"><span><RiEyeLine />{post.view_count}</span><span><RiChat3Line />{post.comment_count}</span><button onClick={() => void share(post)} aria-label={`${post.title} 공유`}><RiShareForwardLine />{post.share_count}</button></div>
    </article>)}</div>}
  </section>;
}
