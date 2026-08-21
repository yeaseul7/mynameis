import { adminClient, errorResponse, handleOptions, HttpError, json, optionalUser, requireUser } from "../_shared/http.ts";

function slugify(title: string) {
  const base = title.normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "").slice(0, 90) || "post";
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function authorName(user: { user_metadata?: Record<string, unknown>; email?: string } | null) {
  return String(user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "회원");
}

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options;
  try {
    const body = await request.json().catch(() => ({}));
    const admin = adminClient();
    const user = await optionalUser(request);

    if (body.action === "list") {
      const limit = Math.min(20, Math.max(1, Number(body.limit) || 12));
      const cursor = Math.max(0, Number(body.cursor) || 0);
      const { data, error } = await admin.from("community_posts").select("id,slug,title,content,cover_image_url,visibility,seo_description,view_count,comment_count,share_count,published_at,created_at,author_id").eq("status", "PUBLISHED").order("published_at", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).range(cursor, cursor + limit);
      if (error) throw error;
      const rows = data ?? [];
      return json({ posts: rows.slice(0, limit).map((post) => ({ ...post, content: post.visibility === "PUBLIC" || user ? post.content : null, locked: post.visibility === "MEMBERS" && !user })), nextCursor: rows.length > limit ? cursor + limit : null });
    }

    if (body.action === "detail") {
      const slug = String(body.slug ?? "");
      const { data: post, error } = await admin.from("community_posts").select("*").eq("slug", slug).eq("status", "PUBLISHED").maybeSingle();
      if (error) throw error; if (!post) throw new HttpError(404, "게시글을 찾지 못했어요.");
      await admin.from("community_posts").update({ view_count: post.view_count + 1 }).eq("id", post.id);
      const locked = post.visibility === "MEMBERS" && !user;
      return json({ post: { ...post, view_count: post.view_count + 1, content: locked ? null : post.content, locked } });
    }

    if (body.action === "create") {
      const current = await requireUser(request);
      const title = String(body.title ?? "").trim(); const content = String(body.content ?? "").trim();
      if (!title || title.length > 120) throw new HttpError(400, "제목은 1~120자로 입력해 주세요.");
      if (!content || content.length > 50000) throw new HttpError(400, "본문은 1~50,000자로 입력해 주세요.");
      const visibility = body.visibility === "MEMBERS" ? "MEMBERS" : "PUBLIC";
      const imageUrls = (Array.isArray(body.imageUrls) ? body.imageUrls : []).map((url: unknown) => String(url).trim()).filter(Boolean);
      if (imageUrls.length > 5) throw new HttpError(400, "첨부파일은 최대 5장까지 등록할 수 있어요.");
      const { data, error } = await admin.from("community_posts").insert({ author_id: current.id, slug: slugify(title), title, content, image_urls: imageUrls, cover_image_url: imageUrls[0] ?? null, visibility, status: "PUBLISHED", seo_title: String(body.seoTitle ?? title).trim().slice(0, 70), seo_description: String(body.seoDescription ?? content.replace(/\s+/g, " ")).trim().slice(0, 160), published_at: new Date().toISOString() }).select("id,slug").single();
      if (error) throw error; return json(data, 201);
    }

    if (body.action === "comments") {
      const postId = String(body.postId ?? "");
      const { data: post } = await admin.from("community_posts").select("visibility,status").eq("id", postId).eq("status", "PUBLISHED").maybeSingle();
      if (!post) throw new HttpError(404, "게시글을 찾지 못했어요.");
      if (post.visibility === "MEMBERS" && !user) throw new HttpError(401, "로그인이 필요해요.");
      const { data, error } = await admin.from("community_comments").select("id,body,author_id,created_at").eq("post_id", postId).is("deleted_at", null).order("created_at");
      if (error) throw error;
      return json({ comments: data ?? [] });
    }

    if (body.action === "comment") {
      const current = await requireUser(request); const postId = String(body.postId ?? ""); const text = String(body.body ?? "").trim();
      if (!text || text.length > 1000) throw new HttpError(400, "댓글은 1~1,000자로 입력해 주세요.");
      const { data: post } = await admin.from("community_posts").select("id,status").eq("id", postId).eq("status", "PUBLISHED").maybeSingle();
      if (!post) throw new HttpError(404, "게시글을 찾지 못했어요.");
      const { data, error } = await admin.from("community_comments").insert({ post_id: postId, author_id: current.id, body: text }).select("id,body,author_id,created_at").single();
      if (error) throw error; return json({ ...data, authorName: authorName(current) }, 201);
    }

    if (body.action === "share") {
      const postId = String(body.postId ?? "");
      const { data: post } = await admin.from("community_posts").select("share_count").eq("id", postId).maybeSingle();
      if (!post) throw new HttpError(404, "게시글을 찾지 못했어요.");
      const shareCount = post.share_count + 1; const { error } = await admin.from("community_posts").update({ share_count: shareCount }).eq("id", postId);
      if (error) throw error; return json({ shareCount });
    }

    throw new HttpError(400, "지원하지 않는 작업이에요.");
  } catch (error) { return errorResponse(error, "커뮤니티 정보를 처리하는 중 문제가 발생했어요."); }
});
