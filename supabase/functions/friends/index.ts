import { adminClient, errorResponse, handleOptions, HttpError, json, requireUser } from "../_shared/http.ts";

function normalize(value: unknown) { const raw = String(value ?? "").trim().toUpperCase(); return raw.startsWith("MNS-") ? raw : `MNS-${raw.replace(/^MNS/, "").replace(/[^A-Z0-9]/g, "")}`; }
function mapDog(row: any) { return { id: row.id, name: row.name, breed: row.breed, photos: [...(row.dog_images ?? [])].filter((p) => p.image_url).sort((a, b) => a.sort_order - b.sort_order).map((p) => ({ id: p.id, storageKey: p.storage_key, url: p.image_url, sortOrder: p.sort_order, isPrimary: p.is_primary })) }; }

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options;
  try {
    const user = await requireUser(request); const body = await request.json().catch(() => ({})); const admin = adminClient();
    if (body.action === "list") {
      const { data, error } = await admin.from("dog_friends").select("friend_dog:dogs!dog_friends_friend_dog_id_fkey(id,name,breed,dog_images(id,storage_key,image_url,sort_order,is_primary))").eq("owner_id", user.id).order("created_at", { ascending: false });
      if (error) throw error;
      return json({ friends: (data ?? []).map((r: any) => Array.isArray(r.friend_dog) ? r.friend_dog[0] : r.friend_dog).filter(Boolean).map(mapDog) });
    }
    if (body.action === "profile-link") {
      const dogId = String(body.dogId ?? "");
      const { data: friend } = await admin.from("dog_friends").select("friend_dog_id").eq("owner_id", user.id).eq("friend_dog_id", dogId).maybeSingle();
      if (!friend) throw new HttpError(404, "등록된 친구가 아니에요.");
      const { data: dog } = await admin.from("dogs").select("id,owner_id").eq("id", dogId).maybeSingle(); if (!dog) throw new HttpError(404, "친구 정보를 찾지 못했어요.");
      const { data: existing } = await admin.from("dog_public_links").select("token").eq("dog_id", dogId).eq("type", "PROFILE").eq("is_active", true).is("revoked_at", null).maybeSingle();
      if (existing) return json(existing);
      const value = `pet_p_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;
      const { data, error } = await admin.from("dog_public_links").insert({ dog_id: dogId, owner_id: dog.owner_id, type: "PROFILE", token: value }).select("token").single(); if (error) throw error;
      return json(data);
    }
    if (body.action === "add") {
      const inviteCode = normalize(body.inviteCode); if (!/^MNS-[A-Z0-9]{6}$/.test(inviteCode)) throw new HttpError(400, "초대코드 형식을 확인해 주세요.");
      const { data: myDog } = await admin.from("dogs").select("id").eq("owner_id", user.id).order("created_at").limit(1).maybeSingle(); if (!myDog) throw new HttpError(400, "먼저 내 새꾸를 등록해 주세요.");
      const { data: friendDog } = await admin.from("dogs").select("id,name,owner_id").eq("invite_code", inviteCode).maybeSingle(); if (!friendDog) throw new HttpError(404, "초대코드와 일치하는 친구를 찾지 못했어요."); if (friendDog.owner_id === user.id) throw new HttpError(400, "내 새꾸의 초대코드는 친구로 추가할 수 없어요.");
      const { error } = await admin.from("dog_friends").upsert([{ owner_id: user.id, dog_id: myDog.id, friend_dog_id: friendDog.id }, { owner_id: friendDog.owner_id, dog_id: friendDog.id, friend_dog_id: myDog.id }], { onConflict: "owner_id,friend_dog_id" }); if (error) throw error;
      return json({ name: friendDog.name });
    }
    throw new HttpError(400, "지원하지 않는 작업이에요.");
  } catch (error) { return errorResponse(error, "친구 정보를 처리하는 중 문제가 발생했어요."); }
});
