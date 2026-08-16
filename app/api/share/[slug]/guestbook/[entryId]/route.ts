import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDogPublicLinkByToken } from "@/lib/pets/repository";

export async function DELETE(_: Request, { params }: { params: Promise<{ slug: string; entryId: string }> }) {
  const { slug, entryId } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "로그인 후 삭제할 수 있어요." }, { status: 401 });

  const supabase = await createServerSupabaseClient();
  const publicLink = await getDogPublicLinkByToken(supabase, slug);
  if (!publicLink) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const { error } = await supabase
    .from("dog_guestbook_entries")
    .delete()
    .eq("id", entryId)
    .eq("dog_id", publicLink.dogId)
    .eq("author_id", user.id);

  if (error) return NextResponse.json({ message: "방명록을 삭제하지 못했어요." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
