"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { RiChat3Line, RiEyeLine, RiShareForwardLine } from "react-icons/ri";
import { invokeFunction } from "@/lib/supabase/functions";

type Post = { id: string; title: string; content: string | null; cover_image_url: string | null; image_urls: string[] | null; visibility: "PUBLIC" | "MEMBERS"; seo_title: string | null; seo_description: string | null; view_count: number; comment_count: number; share_count: number; published_at: string | null; created_at: string; locked: boolean };
type Comment = { id: string; body: string; created_at: string };

export function CommunityPostPage({ slug }: { slug: string }) {
  const [post, setPost] = useState<Post | null>(); const [comments, setComments] = useState<Comment[]>([]); const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    invokeFunction<{ post: Post }>("community", { action: "detail", slug }).then(async ({ post: item }) => {
      if (!active) return; setPost(item);
      document.title = item.seo_title || `${item.title} | mynameis`;
      const description = document.querySelector('meta[name="description"]'); if (description) description.setAttribute("content", item.seo_description || item.title);
      const robots = document.querySelector('meta[name="robots"]'); if (robots) robots.setAttribute("content", item.visibility === "PUBLIC" ? "index,follow" : "noindex,nofollow");
      const result = await invokeFunction<{ comments: Comment[] }>("community", { action: "comments", postId: item.id }); if (active) setComments(result.comments);
    }).catch(() => { if (active) setPost(null); });
    return () => { active = false; };
  }, [slug]);

  async function addComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!post) return; const form = event.currentTarget; const body = String(new FormData(form).get("comment") ?? "").trim(); if (!body) return;
    try { const comment = await invokeFunction<Comment>("community", { action: "comment", postId: post.id, body }); setComments((current) => [...current, comment]); setPost({ ...post, comment_count: post.comment_count + 1 }); form.reset(); }
    catch { setMessage("댓글은 로그인한 회원만 작성할 수 있어요."); }
  }

  async function share() { if (!post) return; const url = location.href; if (navigator.share) await navigator.share({ title: post.title, url }).catch(() => undefined); else await navigator.clipboard.writeText(url); const data = await invokeFunction<{ shareCount: number }>("community", { action: "share", postId: post.id }); setPost({ ...post, share_count: data.shareCount }); }

  if (post === undefined) return <div className="dashboard-loading">게시글을 불러오고 있어요.</div>;
  if (post === null) return <div className="route-error">게시글을 찾을 수 없어요.</div>;
  const imageUrls = post.image_urls?.length ? post.image_urls : post.cover_image_url ? [post.cover_image_url] : [];
  return <main className="community-detail-page"><article className="community-detail"><header><span>{post.visibility === "MEMBERS" ? "회원 공개" : "전체 공개"}</span><h1>{post.title}</h1><time>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" }).format(new Date(post.published_at ?? post.created_at))}</time><div><span><RiEyeLine />{post.view_count}</span><span><RiChat3Line />{post.comment_count}</span><button onClick={() => void share()}><RiShareForwardLine />공유 {post.share_count}</button></div></header>{post.locked ? <section className="community-locked"><strong>회원 공개 글이에요.</strong><a href="/login">로그인하고 본문 보기</a></section> : <><div className="community-content">{post.content}</div>{imageUrls.length > 0 && <div className="community-detail-attachments">{imageUrls.map((url, index) => <div className="community-detail-attachment" key={url}><Image src={url} alt={`${post.title} 첨부 사진 ${index + 1}`} fill sizes="(max-width:600px) 44vw, 210px" quality={78} /></div>)}</div>}</>}<section className="community-comments"><h2>댓글 {post.comment_count}</h2>{comments.map((comment) => <article key={comment.id}><p>{comment.body}</p><time>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(comment.created_at))}</time></article>)}{!post.locked && <form onSubmit={addComment}><textarea name="comment" maxLength={1000} placeholder="댓글을 입력해 주세요." required /><button>댓글 등록</button></form>}{message && <p role="alert">{message}</p>}</section></article></main>;
}
