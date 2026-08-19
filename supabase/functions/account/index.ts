import { adminClient, errorResponse, handleOptions, json, requireUser } from "../_shared/http.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options;
  try {
    const user = await requireUser(request);
    const admin = adminClient();
    const { data, error } = await admin.storage.from("dog-images").list(user.id, { limit: 1000 });
    if (error) throw error;
    const paths = (data ?? []).map((item) => `${user.id}/${item.name}`);
    if (paths.length) {
      const { error: removeError } = await admin.storage.from("dog-images").remove(paths);
      if (removeError) throw removeError;
    }
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) throw deleteError;
    return json({ ok: true });
  } catch (error) { return errorResponse(error, "계정탈퇴 처리 중 문제가 발생했어요."); }
});
