import { adminClient, errorResponse, handleOptions, HttpError, json, optionalUser } from "../_shared/http.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options;
  try {
    const body = await request.json().catch(() => ({})); const action = String(body.action ?? ""); const slug = String(body.slug ?? ""); const admin = adminClient(); const user = await optionalUser(request);
    const { data: link } = await admin.from("dog_public_links").select("dog_id").eq("token", slug).eq("is_active", true).is("revoked_at", null).maybeSingle(); if (!link) throw new HttpError(404, "Not found");
    if (action === "guestbook-add") {
      if (!user) throw new HttpError(401, "로그인 후 방명록을 남길 수 있어요."); const message = String(body.message ?? "").replace(/\s+/g, " ").trim().slice(0, 180); if (!message) throw new HttpError(400, "메시지를 입력해 주세요.");
      const parentId = body.parentId ? String(body.parentId) : null;
      const first = user.email?.trim().charAt(0); const authorName = first ? `${first}****` : "익****";
      const { data, error } = await admin.from("dog_guestbook_entries").insert({ dog_id: link.dog_id, public_link_token: slug, author_id: user.id, author_name: authorName, message, parent_id: parentId }).select("id,author_name,message,created_at,parent_id").single(); if (error) throw error;
      return json({ entry: { ...data, is_mine: true } }, 201);
    }
    if (action === "guestbook-delete") {
      if (!user) throw new HttpError(401, "로그인 후 삭제할 수 있어요."); const { error } = await admin.from("dog_guestbook_entries").delete().eq("id", String(body.entryId ?? "")).eq("dog_id", link.dog_id).eq("author_id", user.id); if (error) throw error; return json({ ok: true });
    }
    if (action === "found-location") {
      const latitude = Number(body.latitude), longitude = Number(body.longitude), accuracy = Number(body.accuracy);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) throw new HttpError(400, "위치 정보를 확인하지 못했어요.");
      const { data, error } = await admin.rpc("record_dog_found_location", { public_token: slug, found_lat: latitude, found_lng: longitude, found_accuracy: Number.isFinite(accuracy) ? accuracy : null, found_note: typeof body.note === "string" ? body.note.trim().slice(0, 500) : null }); if (error) throw error; return json({ location: data?.[0] ?? null });
    }
    throw new HttpError(400, "지원하지 않는 작업이에요.");
  } catch (error) { return errorResponse(error, "공유 정보를 처리하는 중 문제가 발생했어요."); }
});
