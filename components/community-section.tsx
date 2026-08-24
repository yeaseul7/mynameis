"use client";

import Link from "next/link";
import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { RiChat3Line, RiEditLine, RiHeartFill, RiHeartLine, RiSearchLine, RiShareForwardLine } from "react-icons/ri";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { invokeFunction } from "@/lib/supabase/functions";
import { CopyAlert } from "@/components/copy-alert";

const PAGE_SIZE = 2;
export type CommunityPostSummary = { id: string; slug: string; title: string; author_name: string; author_avatar_url: string; content: string | null; content_format?: "PLAIN_TEXT" | "RICH_HTML"; cover_image_url: string | null; visibility: "PUBLIC" | "MEMBERS"; liked: boolean; like_count: number; comment_count: number; share_count: number; published_at: string | null; created_at: string; locked: boolean };

async function getPosts(cursor: number, sort: "latest" | "popular", search: string) {
  return invokeFunction<{ posts: CommunityPostSummary[]; nextCursor: number | null }>("community", { action: "list", cursor, limit: PAGE_SIZE, sort, search });
}

function FeedSkeleton() {
  return <div className="community-feed-skeleton" aria-hidden="true">{Array.from({ length: PAGE_SIZE }, (_, index) => <article className="community-feed-card" key={index}><div className="community-feed-copy"><span className="skeleton-pill" /><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-card community-feed-skeleton-image" /></div><div className="community-stats"><span className="skeleton-line" /><span className="skeleton-line" /></div></article>)}</div>;
}

function CommunityFeedContent({ post, imageLineCount = 0 }: { post: CommunityPostSummary; imageLineCount?: number }) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const richRoot = content.querySelector<HTMLElement>(".community-rich-content");
    const blocks = richRoot ? Array.from(richRoot.children) as HTMLElement[] : Array.from(content.children) as HTMLElement[];
    blocks.forEach((block) => { block.classList.remove("community-feed-preview-clamped"); block.style.removeProperty("display"); block.style.removeProperty("-webkit-line-clamp"); });
    if (expanded) { setOverflowing(false); return; }

    let remainingLines = Math.max(0, 5 - imageLineCount);
    let hasOverflow = false;
    blocks.forEach((block) => {
      if (block.tagName === "FIGURE") {
        if (remainingLines > 0) remainingLines -= 1;
        else { block.style.display = "none"; hasOverflow = true; }
        return;
      }
      if (remainingLines <= 0) { block.style.display = "none"; hasOverflow = true; return; }
      const lineHeight = Number.parseFloat(getComputedStyle(block).lineHeight) || 26;
      const naturalLines = Math.max(1, Math.ceil(block.scrollHeight / lineHeight));
      if (naturalLines > remainingLines) {
        block.classList.add("community-feed-preview-clamped");
        block.style.setProperty("-webkit-line-clamp", String(remainingLines));
        hasOverflow = true;
        remainingLines = 0;
      } else remainingLines -= naturalLines;
    });
    setOverflowing(hasOverflow);
  }, [expanded, imageLineCount, post.content]);

  const rich = post.content_format === "RICH_HTML";
  return <div className={`community-feed-body${expanded ? " is-expanded" : " is-collapsed"}`}>
    <div ref={contentRef} className="community-feed-content">{rich ? <div className="community-rich-content" dangerouslySetInnerHTML={{ __html: post.content ?? "" }} /> : <div className="community-feed-plain-text">{post.content}</div>}</div>
    {overflowing && !expanded && <button type="button" className="community-feed-more" onClick={(event) => { event.stopPropagation(); setExpanded(true); }} aria-expanded="false">더보기</button>}
  </div>;
}

export function CommunitySection() {
  const [posts, setPosts] = useState<CommunityPostSummary[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [sort, setSort] = useState<"latest" | "popular">("latest");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<number | null>(0);
  const [copyMessage, setCopyMessage] = useState("");
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const copyTimerRef = useRef<number | null>(null);
  const likingRef = useRef(new Set<string>());

  const loadPosts = useCallback(async (cursor: number, append: boolean) => {
    append ? setLoadingMore(true) : setLoading(true);
    try {
      const data = await getPosts(cursor, sort, search);
      setPosts((current) => append ? [...current, ...data.posts.filter((post) => !current.some((item) => item.id === post.id))] : data.posts);
      setNextCursor(data.nextCursor);
    } catch (error) { console.error(error); }
    finally { append ? setLoadingMore(false) : setLoading(false); }
  }, [search, sort]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    void loadPosts(0, false);
  }, [loadPosts]);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    void supabase.auth.getUser().then(({ data }) => setLoggedIn(Boolean(data.user)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setLoggedIn(Boolean(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || nextCursor === null) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loading && !loadingMore && nextCursor !== null) void loadPosts(nextCursor, true);
    }, { rootMargin: "500px 0px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadPosts, loading, loadingMore, nextCursor]);

  async function share(post: CommunityPostSummary) {
    const url = `${window.location.origin}/community/${encodeURIComponent(post.slug)}`;
    const previousCount = post.share_count;
    try {
      await navigator.clipboard.writeText(url);
      setCopyMessage("게시글 URL을 복사했어요.");
      if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
      copyTimerRef.current = window.setTimeout(() => setCopyMessage(""), 1800);
    } catch { return; }
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, share_count: previousCount + 1 } : item));
    try {
      const data = await invokeFunction<{ shareCount: number }>("community", { action: "share", postId: post.id });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, share_count: data.shareCount } : item));
    } catch { /* URL 복사는 성공했으므로 화면의 공유 반응은 유지한다. */ }
  }

  async function toggleLike(post: CommunityPostSummary) {
    if (!loggedIn) {
      const { data } = await createBrowserSupabaseClient().auth.getUser();
      if (!data.user) { window.location.href = "/login"; return; }
      setLoggedIn(true);
    }
    if (likingRef.current.has(post.id)) return;
    likingRef.current.add(post.id);
    const previousLiked = post.liked;
    const previousCount = post.like_count;
    setPosts((current) => current.map((item) => item.id === post.id ? { ...item, liked: !previousLiked, like_count: Math.max(0, previousCount + (previousLiked ? -1 : 1)) } : item));
    try {
      const data = await invokeFunction<{ liked: boolean; likeCount: number }>("community", { action: "like", postId: post.id });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, liked: data.liked, like_count: data.likeCount } : item));
    } catch {
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, liked: previousLiked, like_count: previousCount } : item));
    } finally { likingRef.current.delete(post.id); }
  }

  function openPost(post: CommunityPostSummary, target: EventTarget | null) {
    if (target instanceof Element && target.closest("a,button,input")) return;
    if (window.getSelection()?.toString()) return;
    window.location.href = `/community/${encodeURIComponent(post.slug)}`;
  }

  return <section className="home-section community-section community-feed-section" aria-labelledby="community-title" aria-busy={loading || loadingMore}>
    <CopyAlert message={copyMessage} />
    <div className="section-heading"><h1 id="community-title">도담도담</h1><div className="community-heading-actions"><label className="community-feed-search"><RiSearchLine aria-hidden="true" /><input type="search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} maxLength={50} placeholder="제목, 유저 이름 검색" aria-label="제목 또는 유저 이름 검색" /></label><div className="community-feed-sort" role="group" aria-label="게시글 정렬"><button type="button" className={sort === "latest" ? "active" : ""} onClick={() => setSort("latest")}>최신순</button><button type="button" className={sort === "popular" ? "active" : ""} onClick={() => setSort("popular")}>인기순</button></div>{loggedIn && <Link className="community-write-button" href="/community/new"><RiEditLine />글쓰기</Link>}</div></div>
    {loading ? <FeedSkeleton /> : posts.length === 0 ? <p className="community-empty">{search ? "검색 결과가 없어요." : "아직 등록된 글이 없어요."}</p> : <div className="community-feed">{posts.map((post) => <article className="community-feed-card" key={post.id} onClick={(event) => openPost(post, event.target)}>
      <Link href={`/community/${encodeURIComponent(post.slug)}`} className="community-feed-link">
        <h2>{post.title}</h2>
        <div className="community-feed-meta"><div className="community-feed-author">{post.author_avatar_url ? <img src={post.author_avatar_url} alt="" /> : <span>{post.author_name?.slice(0, 1) || "회"}</span>}<div><strong>{post.author_name || "회원"}</strong><time>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(post.published_at ?? post.created_at))}</time></div></div></div>
      </Link>
      {post.locked ? <p className="community-feed-locked">회원 공개 글입니다. 로그인하면 내용을 볼 수 있어요.</p> : post.content_format === "RICH_HTML" ? <CommunityFeedContent post={post} /> : <>{post.cover_image_url && <div className="community-feed-cover"><Image src={post.cover_image_url} alt="" fill sizes="(max-width: 760px) 100vw, 680px" quality={75} /></div>}<CommunityFeedContent post={post} imageLineCount={post.cover_image_url ? 1 : 0} /></>}
      <div className="community-stats"><button type="button" className={post.liked ? "liked" : ""} onClick={(event) => { event.stopPropagation(); void toggleLike(post); }} aria-label={`${post.title} 좋아요`} aria-pressed={post.liked}>{post.liked ? <RiHeartFill /> : <RiHeartLine />}{post.like_count}</button><button type="button" onClick={(event) => { event.stopPropagation(); window.location.href = `/community/${encodeURIComponent(post.slug)}#comments`; }} aria-label={`${post.title} 댓글 보기`}><RiChat3Line />{post.comment_count}</button><button type="button" onClick={(event) => { event.stopPropagation(); void share(post); }} aria-label={`${post.title} URL 복사`}><RiShareForwardLine />{post.share_count}</button></div>
    </article>)}</div>}
    {loadingMore && <FeedSkeleton />}
    <div ref={loadMoreRef} className="community-feed-sentinel" aria-hidden="true" />
    {!loading && nextCursor === null && posts.length > 0 && <p className="community-feed-end">모든 게시글을 확인했어요.</p>}
  </section>;
}
