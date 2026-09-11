import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/server";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

async function removeDogImages(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.storage.from("dog-images").list(userId, { limit: 1000 });
  if (error) throw error;

  const paths = data?.map((item) => `${userId}/${item.name}`) ?? [];
  if (paths.length === 0) return;

  const { error: removeError } = await supabase.storage.from("dog-images").remove(paths);
  if (removeError) throw removeError;
}

export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  try {
    const supabase = createSupabaseAdminClient();
    await removeDogImages(supabase, user.id);
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) throw error;

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "계정탈퇴 처리 중 문제가 발생했어요." }, { status: 500 });
  }
}
