"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { RiChat3Line, RiDeleteBinLine, RiEditLine, RiEyeLine, RiHeartFill, RiHeartLine, RiSendPlaneFill, RiShareForwardLine } from "react-icons/ri";
import { invokeFunction } from "@/lib/supabase/functions";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { CopyAlert } from "@/components/copy-alert";

type Post = { id: string; slug: string; author_id: string; author_name: string; author_avatar_url: string; title: string; content: string | null; content_format: "PLAIN_TEXT" | "RICH_HTML"; visibility: "PUBLIC" | "MEMBERS"; seo_title: string | null; seo_description: string | null; view_count: number; comment_count: number; like_count: number; share_count: number; liked: boolean; published_at: string | null; created_at: string; locked: boolean };
type Comment = { id: string; author_id: string; author_name?: string; author_avatar_url?: string; body: string; liked?: boolean; like_count?: number; created_at: string };

function CommunityPostSkeleton() {
  return <main className="community-detail-page community-detail-skeleton" aria-busy="true" aria-label="게시글을 불러오는 중"><article className="community-detail"><header><span className="skeleton-pill" /><span className="skeleton-line community-detail-skeleton-title" /><div className="community-detail-skeleton-meta"><span className="skeleton-card" /><div><span className="skeleton-line" /><span className="skeleton-line" /></div><div className="community-detail-skeleton-stats"><span className="skeleton-pill" /><span className="skeleton-pill" /><span className="skeleton-pill" /></div></div></header><section className="community-detail-skeleton-body"><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-card" /></section><div className="community-detail-skeleton-actions"><span className="skeleton-pill" /><span className="skeleton-pill" /></div></article></main>;
}

export function CommunityPostPage({ slug }: { slug: string }) {
  const [post, setPost] = useState<Post | null>();
  const [comments, setComments] = useState<Comment[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [currentUserAvatar, setCurrentUserAvatar] = useState("");
  const [currentUserName, setCurrentUserName] = useState("회원");
  const [message, setMessage] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const copyTimerRef = useRef<number | null>(null);
  const likingRef = useRef(false);
  const commentLikingRef = useRef(new Set<string>());

  useEffect(() => {
    let active = true;
    void createBrowserSupabaseClient().auth.getUser().then(({ data }) => { if (!active) return; const current = data.user; setCurrentUserId(current?.id ?? ""); setCurrentUserAvatar(String(current?.user_metadata?.avatar_url ?? current?.user_metadata?.picture ?? "")); setCurrentUserName(String(current?.user_metadata?.name ?? current?.user_metadata?.full_name ?? current?.email?.split("@")[0] ?? "회원")); });
    invokeFunction<{ post: Post }>("community", { action: "detail", slug }).then(async ({ post: item }) => {
      if (!active) return; setPost(item);
      document.title = item.seo_title || `${item.title} | mynameis`;
      document.querySelector('meta[name="description"]')?.setAttribute("content", item.seo_description || item.title);
      document.querySelector('meta[name="robots"]')?.setAttribute("content", item.visibility === "PUBLIC" ? "index,follow" : "noindex,nofollow");
      const result = await invokeFunction<{ comments: Comment[] }>("community", { action: "comments", postId: item.id }); if (active) setComments(result.comments);
    }).catch(() => { if (active) setPost(null); });
    return () => { active = false; };
  }, [slug]);

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!post) return; const form = event.currentTarget; const body = String(new FormData(form).get("comment") ?? "").trim(); if (!body) return;
    try { const comment = await invokeFunction<Comment>("community", { action: "comment", postId: post.id, body }); setComments((current) => [...current, comment]); setPost({ ...post, comment_count: post.comment_count + 1 }); form.reset(); const input = form.elements.namedItem("comment") as HTMLTextAreaElement | null; if (input) input.style.height = ""; }
    catch { setMessage("댓글은 로그인한 회원만 작성할 수 있어요."); }
  }

  async function share() {
    if (!post) return;
    const url = `${window.location.origin}/community/${encodeURIComponent(post.slug ?? slug)}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      setMessage("URL을 복사하지 못했어요. 브라우저의 클립보드 권한을 확인해 주세요.");
      return;
    }
    const optimisticCount = post.share_count + 1;
    setPost((current) => current ? { ...current, share_count: optimisticCount } : current);
    setCopyMessage("게시글 URL을 복사했어요.");
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => setCopyMessage(""), 1800);
    try {
      const data = await invokeFunction<{ shareCount: number }>("community", { action: "share", postId: post.id });
      setPost((current) => current ? { ...current, share_count: data.shareCount } : current);
    } catch { /* 복사는 성공했으므로 성공 안내와 즉시 반응을 유지한다. */ }
  }
  async function toggleLike() {
    if (!post || likingRef.current) return;
    likingRef.current = true;
    const previousLiked = post.liked;
    const previousCount = post.like_count;
    setMessage("");
    setPost((current) => current ? {
      ...current,
      liked: !previousLiked,
      like_count: Math.max(0, previousCount + (previousLiked ? -1 : 1)),
    } : current);
    try {
      const data = await invokeFunction<{ liked: boolean; likeCount: number }>("community", { action: "like", postId: post.id });
      setPost((current) => current ? { ...current, liked: data.liked, like_count: data.likeCount } : current);
    } catch {
      setPost((current) => current ? { ...current, liked: previousLiked, like_count: previousCount } : current);
      setMessage("좋아요는 로그인한 회원만 사용할 수 있어요.");
    } finally {
      likingRef.current = false;
    }
  }
  async function toggleCommentLike(comment: Comment) {
    if (!currentUserId) { location.href = "/login"; return; }
    if (commentLikingRef.current.has(comment.id)) return;
    commentLikingRef.current.add(comment.id);
    const previousLiked = Boolean(comment.liked); const previousCount = comment.like_count ?? 0;
    setComments((current) => current.map((item) => item.id === comment.id ? { ...item, liked: !previousLiked, like_count: Math.max(0, previousCount + (previousLiked ? -1 : 1)) } : item));
    try { const data = await invokeFunction<{ liked: boolean; likeCount: number }>("community", { action: "comment-like", commentId: comment.id }); setComments((current) => current.map((item) => item.id === comment.id ? { ...item, liked: data.liked, like_count: data.likeCount } : item)); }
    catch { setComments((current) => current.map((item) => item.id === comment.id ? { ...item, liked: previousLiked, like_count: previousCount } : item)); }
    finally { commentLikingRef.current.delete(comment.id); }
  }
  async function deleteComment(comment: Comment) {
    if (!window.confirm("이 댓글을 삭제할까요?")) return;
    try { const data = await invokeFunction<{ commentCount: number }>("community", { action: "comment-delete", commentId: comment.id }); setComments((current) => current.filter((item) => item.id !== comment.id)); setPost((current) => current ? { ...current, comment_count: data.commentCount } : current); }
    catch { setMessage("댓글을 삭제하지 못했어요."); }
  }
  async function deletePost() { if (!post || !window.confirm("이 게시글을 삭제할까요? 삭제한 글은 복구할 수 없어요.")) return; setDeleting(true); try { await invokeFunction("community", { action: "delete", slug }); location.replace("/ongijonggi"); } catch (error) { setMessage(error instanceof Error ? error.message : "게시글을 삭제하지 못했어요."); setDeleting(false); } }

  if (post === undefined) return <CommunityPostSkeleton />;
  if (post === null) return <div className="route-error">게시글을 찾을 수 없어요.</div>;
  const isAuthor = Boolean(currentUserId && currentUserId === post.author_id);
  const publishedDate = new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(post.published_at ?? post.created_at));

  return <main className="community-detail-page"><CopyAlert message={copyMessage} /><article className="community-detail">
    <header className="community-detail-header"><div className="community-detail-topline"><span>🐾 {post.visibility === "MEMBERS" ? "회원 공개" : "전체 공개"}</span>{isAuthor && <div className="community-owner-actions"><a href={`/community/${encodeURIComponent(slug)}/edit`}><RiEditLine />수정</a><button type="button" onClick={() => void deletePost()} disabled={deleting}><RiDeleteBinLine />{deleting ? "삭제 중" : "삭제"}</button></div>}</div><h1>{post.title}</h1><div className="community-author-row">{post.author_avatar_url ? <img src={post.author_avatar_url} alt="" /> : <span className="community-author-placeholder">{post.author_name.slice(0, 1)}</span>}<strong>{post.author_name}</strong><i>•</i><time>{publishedDate}</time></div><div className="community-detail-stats"><span><RiEyeLine />{post.view_count}</span><span><RiChat3Line />{post.comment_count}</span><button onClick={() => void share()}><RiShareForwardLine />공유 {post.share_count}</button></div></header>
    {post.locked ? <section className="community-locked"><strong>회원 공개 글이에요.</strong><a href="/login">로그인하고 본문 보기</a></section> : post.content_format === "RICH_HTML" ? <div className="community-content community-rich-content" dangerouslySetInnerHTML={{ __html: post.content ?? "" }} /> : <div className="community-content">{post.content}</div>}
    {!post.locked && <div className="community-post-actions"><button type="button" className={post.liked ? "liked" : ""} onClick={() => void toggleLike()} aria-pressed={post.liked}>{post.liked ? <RiHeartFill /> : <RiHeartLine />}좋아요 {post.like_count}</button><button type="button" onClick={() => void share()}><RiShareForwardLine />공유 {post.share_count}</button></div>}
    <section id="comments" className="community-comments"><h2>댓글 {post.comment_count}</h2>{comments.map((comment) => { const commentAuthorName = comment.author_name?.trim() || "회원"; return <article key={comment.id}><header>{comment.author_avatar_url ? <img src={comment.author_avatar_url} alt="" /> : <span>{commentAuthorName.slice(0, 1)}</span>}<strong>{commentAuthorName}</strong><time dateTime={comment.created_at}>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(comment.created_at))}</time></header><p>{comment.body}</p><div className="community-comment-actions"><button type="button" className={comment.liked ? "liked" : ""} onClick={() => void toggleCommentLike(comment)} aria-pressed={Boolean(comment.liked)}>{comment.liked ? <RiHeartFill /> : <RiHeartLine />}좋아요 {comment.like_count ?? 0}</button>{currentUserId === comment.author_id && <button type="button" onClick={() => void deleteComment(comment)}><RiDeleteBinLine />삭제</button>}</div></article>; })}{!post.locked && <form className="community-comment-composer" onSubmit={addComment}>{currentUserAvatar ? <img src={currentUserAvatar} alt="" /> : <span aria-hidden>{currentUserName.slice(0, 1)}</span>}<textarea name="comment" rows={1} maxLength={1000} placeholder="댓글을 입력해 주세요." aria-label="댓글" onInput={(event) => { const input = event.currentTarget; input.style.height = "0"; input.style.height = `${Math.min(input.scrollHeight, 78)}px`; }} required /><button type="submit" aria-label="댓글 전송"><RiSendPlaneFill /></button></form>}{message && <p role="alert">{message}</p>}</section>
  </article></main>;
}
