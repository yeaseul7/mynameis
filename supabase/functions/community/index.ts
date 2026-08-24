import { adminClient, errorResponse, handleOptions, HttpError, json, optionalUser, requireUser } from "../_shared/http.ts";

function slugify(title: string) {
  const base = title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 90) || "post";
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function authorName(user: { user_metadata?: Record<string, unknown>; email?: string } | null) {
  return String(user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "회원");
}

function escapeAttribute(value: string) { return value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;"); }
function safeUrl(value: string, image = false) {
  try { const url = new URL(value); return url.protocol === "https:" && (!image || url.pathname.includes("/storage/v1/object/public/community-images/")) ? url.toString() : ""; }
  catch { return ""; }
}
function sanitizeRichHtml(value: string) {
  const allowed = new Set(["p", "div", "br", "strong", "b", "em", "i", "u", "s", "ul", "ol", "li", "blockquote", "h2", "h3", "a", "figure", "img"]);
  return value.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style|iframe|object|embed|form|button)[^>]*>[\s\S]*?<\/\1\s*>/gi, "").replace(/<\/?([a-z0-9]+)([^>]*)>/gi, (tag, rawName: string, rawAttrs: string) => {
    const name = rawName.toLowerCase(); if (!allowed.has(name)) return ""; const closing = tag.startsWith("</"); if (closing) return name === "br" || name === "img" ? "" : `</${name}>`;
    if (name === "img") { const src = safeUrl(rawAttrs.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] ?? "", true); const cropX = Math.min(100, Math.max(0, Number(rawAttrs.match(/\bdata-crop-x\s*=\s*["']([\d.]+)["']/i)?.[1] ?? 50))); const cropY = Math.min(100, Math.max(0, Number(rawAttrs.match(/\bdata-crop-y\s*=\s*["']([\d.]+)["']/i)?.[1] ?? 50))); return src ? `<img src="${escapeAttribute(src)}" alt="본문 이미지" data-crop-x="${cropX}" data-crop-y="${cropY}" style="object-position:${cropX}% ${cropY}%">` : ""; }
    if (name === "a") { const href = safeUrl(rawAttrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1] ?? ""); return href ? `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">` : ""; }
    if (name === "figure") {
      const requestedWidth = Number(rawAttrs.match(/\bdata-width\s*=\s*["']([\d.]+)["']/i)?.[1] ?? 55); const width = Math.min(100, Math.max(20, Number.isFinite(requestedWidth) ? requestedWidth : 55));
      const requestedRatio = Number(rawAttrs.match(/\bdata-ratio\s*=\s*["']([\d.]+)["']/i)?.[1] ?? .75); const ratio = Math.min(3, Math.max(.25, Number.isFinite(requestedRatio) ? requestedRatio : .75));
      return `<figure data-width="${width}" data-ratio="${ratio}" style="width:${width}%;aspect-ratio:${ratio}">`;
    }
    if (["p", "div", "h2", "h3", "blockquote"].includes(name)) {
      const alignment = rawAttrs.match(/text-align\s*:\s*(left|center|right)/i)?.[1]?.toLowerCase() ?? rawAttrs.match(/\balign\s*=\s*["']?(left|center|right)/i)?.[1]?.toLowerCase();
      return alignment ? `<${name} data-align="${alignment}" style="text-align:${alignment}">` : `<${name}>`;
    }
    return `<${name}>`;
  });
}
function plainText(value: string) { return value.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim(); }
function isRichContent(format: string | null | undefined, content: string) { return format === "RICH_HTML" || /<(figure|img|p|div|blockquote|ul|ol|h2|h3)(\s|>)/i.test(content); }

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options;
  try {
    const body = await request.json().catch(() => ({}));
    const admin = adminClient();
    const user = await optionalUser(request);

    if (body.action === "list") {
      const limit = Math.min(20, Math.max(1, Number(body.limit) || 12));
      const cursor = Math.max(0, Number(body.cursor) || 0);
      const sort = body.sort === "popular" ? "popular" : "latest";
      const search = String(body.search ?? "").normalize("NFKC").trim().slice(0, 50);
      const columns = "id,slug,title,content,content_format,cover_image_url,visibility,seo_description,like_count,comment_count,share_count,published_at,created_at,author_id";
      let rows;
      if (search) {
        const { data: idRows, error: searchError } = await admin.rpc("search_community_post_ids", { search_term: search, sort_mode: sort, result_offset: cursor, result_limit: limit + 1 });
        if (searchError) throw searchError;
        const ids = (idRows ?? []).map((row: { id: string }) => row.id);
        if (!ids.length) rows = [];
        else {
          const { data, error } = await admin.from("community_posts").select(columns).in("id", ids); if (error) throw error;
          const byId = new Map((data ?? []).map((post) => [post.id, post])); rows = ids.flatMap((id: string) => { const post = byId.get(id); return post ? [post] : []; });
        }
      } else {
        let query = admin.from("community_posts").select(columns).eq("status", "PUBLISHED");
        query = sort === "popular" ? query.order("like_count", { ascending: false }).order("comment_count", { ascending: false }).order("published_at", { ascending: false, nullsFirst: false }) : query.order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false });
        const { data, error } = await query.range(cursor, cursor + limit); if (error) throw error; rows = data ?? [];
      }
      const visibleRows = rows.slice(0, limit);
      const { data: likedRows } = user && visibleRows.length ? await admin.from("community_likes").select("post_id").eq("user_id", user.id).in("post_id", visibleRows.map((post) => post.id)) : { data: [] };
      const likedPostIds = new Set((likedRows ?? []).map((row) => row.post_id));
      const posts = await Promise.all(visibleRows.map(async (post) => {
        const rich = isRichContent(post.content_format, post.content); const locked = post.visibility === "MEMBERS" && !user;
        const { data: authorResult } = await admin.auth.admin.getUserById(post.author_id); const author = authorResult?.user ?? null;
        return { ...post, liked: likedPostIds.has(post.id), author_name: authorName(author), author_avatar_url: String(author?.user_metadata?.avatar_url ?? author?.user_metadata?.picture ?? ""), content_format: rich ? "RICH_HTML" : "PLAIN_TEXT", content: locked ? null : rich ? sanitizeRichHtml(post.content) : post.content, locked };
      }));
      return json({ posts, nextCursor: rows.length > limit ? cursor + limit : null });
    }

    if (body.action === "detail") {
      const slug = String(body.slug ?? "");
      const { data: post, error } = await admin.from("community_posts").select("*").eq("slug", slug).eq("status", "PUBLISHED").maybeSingle();
      if (error) throw error; if (!post) throw new HttpError(404, "게시글을 찾지 못했어요.");
      await admin.from("community_posts").update({ view_count: post.view_count + 1 }).eq("id", post.id);
      const locked = post.visibility === "MEMBERS" && !user;
      const rich = isRichContent(post.content_format, post.content);
      const { data: authorResult } = await admin.auth.admin.getUserById(post.author_id); const author = authorResult?.user ?? null;
      const { data: likedRow } = user ? await admin.from("community_likes").select("post_id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle() : { data: null };
      return json({ post: { ...post, liked: Boolean(likedRow), author_name: authorName(author), author_avatar_url: String(author?.user_metadata?.avatar_url ?? author?.user_metadata?.picture ?? ""), content_format: rich ? "RICH_HTML" : "PLAIN_TEXT", view_count: post.view_count + 1, content: locked ? null : rich ? sanitizeRichHtml(post.content) : post.content, locked } });
    }

    if (body.action === "create") {
      const current = await requireUser(request);
      const title = String(body.title ?? "").trim(); const requestedContent = String(body.content ?? "").trim(); const contentFormat = body.contentFormat === "RICH_HTML" ? "RICH_HTML" : "PLAIN_TEXT"; const content = contentFormat === "RICH_HTML" ? sanitizeRichHtml(requestedContent) : requestedContent;
      if (!title || title.length > 120) throw new HttpError(400, "제목은 1~120자로 입력해 주세요.");
      if (!plainText(content) && !content.includes("<img ")) throw new HttpError(400, "내용을 입력해 주세요.");
      if (content.length > 100000) throw new HttpError(400, "본문이 너무 길어요.");
      const visibility = body.visibility === "MEMBERS" ? "MEMBERS" : "PUBLIC";
      const imageUrls = (Array.isArray(body.imageUrls) ? body.imageUrls : []).map((url: unknown) => String(url).trim()).filter(Boolean);
      if (imageUrls.length > 5) throw new HttpError(400, "첨부파일은 최대 5장까지 등록할 수 있어요.");
      const { data, error } = await admin.from("community_posts").insert({ author_id: current.id, slug: slugify(title), title, content, content_format: contentFormat, image_urls: imageUrls, cover_image_url: imageUrls[0] ?? null, visibility, status: "PUBLISHED", seo_title: String(body.seoTitle ?? title).trim().slice(0, 70), seo_description: String(body.seoDescription ?? plainText(content)).trim().slice(0, 160), published_at: new Date().toISOString() }).select("id,slug").single();
      if (error) throw error; return json(data, 201);
    }

    if (body.action === "edit-detail") {
      const current = await requireUser(request); const slug = String(body.slug ?? "");
      const { data, error } = await admin.from("community_posts").select("*").eq("slug", slug).eq("author_id", current.id).maybeSingle();
      if (error) throw error; if (!data) throw new HttpError(403, "수정 권한이 없어요.");
      const rich = isRichContent(data.content_format, data.content); return json({ post: { ...data, content_format: rich ? "RICH_HTML" : "PLAIN_TEXT", content: rich ? sanitizeRichHtml(data.content) : data.content } });
    }

    if (body.action === "update") {
      const current = await requireUser(request); const slug = String(body.slug ?? ""); const title = String(body.title ?? "").trim(); const requestedContent = String(body.content ?? "").trim(); const content = sanitizeRichHtml(requestedContent);
      if (!title || title.length > 120) throw new HttpError(400, "제목은 1~120자로 입력해 주세요.");
      if ((!plainText(content) && !content.includes("<img ")) || content.length > 100000) throw new HttpError(400, "본문을 확인해 주세요.");
      const imageUrls = (Array.isArray(body.imageUrls) ? body.imageUrls : []).map((url: unknown) => String(url).trim()).filter(Boolean).slice(0, 5); const visibility = body.visibility === "MEMBERS" ? "MEMBERS" : "PUBLIC";
      const { data, error } = await admin.from("community_posts").update({ title, content, content_format: "RICH_HTML", image_urls: imageUrls, cover_image_url: imageUrls[0] ?? null, visibility, seo_title: title.slice(0, 70), seo_description: plainText(content).slice(0, 160), updated_at: new Date().toISOString() }).eq("slug", slug).eq("author_id", current.id).select("id,slug").maybeSingle();
      if (error) throw error; if (!data) throw new HttpError(403, "수정 권한이 없어요."); return json(data);
    }

    if (body.action === "delete") {
      const current = await requireUser(request); const slug = String(body.slug ?? "");
      const { data: post } = await admin.from("community_posts").select("id,image_urls").eq("slug", slug).eq("author_id", current.id).maybeSingle(); if (!post) throw new HttpError(403, "삭제 권한이 없어요.");
      const { error } = await admin.from("community_posts").delete().eq("id", post.id).eq("author_id", current.id); if (error) throw error;
      const paths = (post.image_urls ?? []).flatMap((value: string) => { try { const marker = "/storage/v1/object/public/community-images/"; const url = new URL(value); return url.pathname.includes(marker) ? [decodeURIComponent(url.pathname.split(marker)[1])] : []; } catch { return []; } }); if (paths.length) await admin.storage.from("community-images").remove(paths);
      return json({ deleted: true });
    }

    if (body.action === "comments") {
      const postId = String(body.postId ?? "");
      const { data: post } = await admin.from("community_posts").select("visibility,status").eq("id", postId).eq("status", "PUBLISHED").maybeSingle();
      if (!post) throw new HttpError(404, "게시글을 찾지 못했어요.");
      if (post.visibility === "MEMBERS" && !user) throw new HttpError(401, "로그인이 필요해요.");
      const { data, error } = await admin.from("community_comments").select("id,body,author_id,like_count,created_at").eq("post_id", postId).is("deleted_at", null).order("created_at");
      if (error) throw error;
      const rows = data ?? [];
      const { data: likedRows } = user && rows.length ? await admin.from("community_comment_likes").select("comment_id").eq("user_id", user.id).in("comment_id", rows.map((comment) => comment.id)) : { data: [] };
      const likedIds = new Set((likedRows ?? []).map((row) => row.comment_id));
      const comments = await Promise.all(rows.map(async (comment) => { const { data: authorResult } = await admin.auth.admin.getUserById(comment.author_id); const author = authorResult?.user ?? null; return { ...comment, liked: likedIds.has(comment.id), author_name: authorName(author), author_avatar_url: String(author?.user_metadata?.avatar_url ?? author?.user_metadata?.picture ?? "") }; }));
      return json({ comments });
    }

    if (body.action === "comment") {
      const current = await requireUser(request); const postId = String(body.postId ?? ""); const text = String(body.body ?? "").trim();
      if (!text || text.length > 1000) throw new HttpError(400, "댓글은 1~1,000자로 입력해 주세요.");
      const { data: post } = await admin.from("community_posts").select("id,status").eq("id", postId).eq("status", "PUBLISHED").maybeSingle();
      if (!post) throw new HttpError(404, "게시글을 찾지 못했어요.");
      const { data, error } = await admin.from("community_comments").insert({ post_id: postId, author_id: current.id, body: text }).select("id,body,author_id,like_count,created_at").single();
      if (error) throw error; return json({ ...data, liked: false, author_name: authorName(current), author_avatar_url: String(current.user_metadata?.avatar_url ?? current.user_metadata?.picture ?? "") }, 201);
    }

    if (body.action === "comment-like") {
      const current = await requireUser(request); const commentId = String(body.commentId ?? "");
      const { data: comment } = await admin.from("community_comments").select("id").eq("id", commentId).is("deleted_at", null).maybeSingle(); if (!comment) throw new HttpError(404, "댓글을 찾지 못했어요.");
      const { data: existing } = await admin.from("community_comment_likes").select("comment_id").eq("comment_id", commentId).eq("user_id", current.id).maybeSingle();
      if (existing) { const { error } = await admin.from("community_comment_likes").delete().eq("comment_id", commentId).eq("user_id", current.id); if (error) throw error; }
      else { const { error } = await admin.from("community_comment_likes").insert({ comment_id: commentId, user_id: current.id }); if (error) throw error; }
      const { count } = await admin.from("community_comment_likes").select("comment_id", { count: "exact", head: true }).eq("comment_id", commentId);
      return json({ liked: !existing, likeCount: count ?? 0 });
    }

    if (body.action === "comment-delete") {
      const current = await requireUser(request); const commentId = String(body.commentId ?? "");
      const { data: comment, error } = await admin.from("community_comments").update({ deleted_at: new Date().toISOString() }).eq("id", commentId).eq("author_id", current.id).is("deleted_at", null).select("post_id").maybeSingle();
      if (error) throw error; if (!comment) throw new HttpError(403, "댓글 삭제 권한이 없어요.");
      const { data: post } = await admin.from("community_posts").select("comment_count").eq("id", comment.post_id).single();
      return json({ deleted: true, commentCount: post?.comment_count ?? 0 });
    }

    if (body.action === "share") {
      const postId = String(body.postId ?? "");
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId)) throw new HttpError(400, "올바르지 않은 게시글 ID예요.");
      const { data: post } = await admin.from("community_posts").select("visibility,status").eq("id", postId).eq("status", "PUBLISHED").maybeSingle();
      if (!post) throw new HttpError(404, "게시글을 찾지 못했어요.");
      if (post.visibility === "MEMBERS" && !user) throw new HttpError(401, "로그인이 필요해요.");
      const { data: shareCount, error } = await admin.rpc("increment_community_share_count", { target_post_id: postId });
      if (error) throw error; return json({ shareCount: Number(shareCount) });
    }

    if (body.action === "like") {
      const current = await requireUser(request); const postId = String(body.postId ?? "");
      const { data: post } = await admin.from("community_posts").select("id").eq("id", postId).eq("status", "PUBLISHED").maybeSingle(); if (!post) throw new HttpError(404, "게시글을 찾지 못했어요.");
      const { data: existing } = await admin.from("community_likes").select("post_id").eq("post_id", postId).eq("user_id", current.id).maybeSingle();
      if (existing) { const { error } = await admin.from("community_likes").delete().eq("post_id", postId).eq("user_id", current.id); if (error) throw error; }
      else { const { error } = await admin.from("community_likes").insert({ post_id: postId, user_id: current.id }); if (error) throw error; }
      const { count } = await admin.from("community_likes").select("post_id", { count: "exact", head: true }).eq("post_id", postId);
      return json({ liked: !existing, likeCount: count ?? 0 });
    }

    throw new HttpError(400, "지원하지 않는 작업이에요.");
  } catch (error) { return errorResponse(error, "커뮤니티 정보를 처리하는 중 문제가 발생했어요."); }
});
