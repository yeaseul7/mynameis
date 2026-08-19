import { adminClient, errorResponse, handleOptions, HttpError, json, requireUser } from "../_shared/http.ts";

const prefixes = { PROFILE: "pet_p", CARE: "pet_c", LOST: "pet_l" } as const;
type LinkType = keyof typeof prefixes;
const token = (type: LinkType) => `${prefixes[type]}_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options;
  try {
    const user = await requireUser(request);
    const body = await request.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const dogId = String(body.dogId ?? "");
    if (!dogId) throw new HttpError(400, "반려견 정보를 확인해 주세요.");
    const admin = adminClient();
    const { data: dog, error: dogError } = await admin.from("dogs").select("id,owner_id").eq("id", dogId).eq("owner_id", user.id).maybeSingle();
    if (dogError) throw dogError;
    if (!dog) throw new HttpError(404, "Not found");

    if (action === "delete") {
      const { data: images, error } = await admin.from("dog_images").select("storage_key").eq("dog_id", dogId).eq("owner_id", user.id);
      if (error) throw error;
      const keys = (images ?? []).map((row) => row.storage_key).filter(Boolean);
      if (keys.length) { const { error: removeError } = await admin.storage.from("dog-images").remove(keys); if (removeError) throw removeError; }
      const { error: deleteError } = await admin.from("dogs").delete().eq("id", dogId).eq("owner_id", user.id);
      if (deleteError) throw deleteError;
      return json({ ok: true });
    }

    if (action === "public-link") {
      const type = body.type as LinkType;
      if (!(type in prefixes)) throw new HttpError(400, "Invalid public link type");
      const { data: existing, error } = await admin.from("dog_public_links").select("token,type").eq("dog_id", dogId).eq("owner_id", user.id).eq("type", type).eq("is_active", true).is("revoked_at", null).maybeSingle();
      if (error) throw error;
      if (existing) return json(existing);
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data, error: createError } = await admin.from("dog_public_links").insert({ dog_id: dogId, owner_id: user.id, type, token: token(type) }).select("token,type").single();
        if (!createError) return json(data);
        if (createError.code !== "23505") throw createError;
      }
      throw new Error("Dog public link generation failed");
    }

    if (action === "lost-location") {
      const empty = { lostAt: null, lostLocationAddress: null, lostLocationDistrict: null, lostLocationNeighborhood: null, lostLocationDetail: null };
      const values = body.endReport === true ? empty : {
        lostAt: typeof body.lostAt === "string" && body.lostAt ? body.lostAt : null,
        lostLocationDistrict: clean(body.lostLocationDistrict), lostLocationNeighborhood: clean(body.lostLocationNeighborhood), lostLocationDetail: clean(body.lostLocationDetail),
        lostLocationAddress: "",
      };
      values.lostLocationAddress = body.endReport === true ? null : [values.lostLocationDistrict, values.lostLocationNeighborhood, values.lostLocationDetail].filter(Boolean).join(" ") || null;
      const { error } = await admin.from("dog_care_profiles").upsert({ dog_id: dogId, owner_id: user.id, lost_at: values.lostAt, lost_location_address: values.lostLocationAddress, lost_location_district: values.lostLocationDistrict, lost_location_neighborhood: values.lostLocationNeighborhood, lost_location_detail: values.lostLocationDetail }, { onConflict: "dog_id" });
      if (error) throw error;
      return json(values);
    }
    throw new HttpError(400, "지원하지 않는 작업이에요.");
  } catch (error) { return errorResponse(error, "반려견 정보를 처리하는 중 문제가 발생했어요."); }
});

function clean(value: unknown) { return typeof value === "string" && value.trim() ? value.trim() : null; }
