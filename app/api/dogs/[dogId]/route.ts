import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { deleteDogForOwner, getDogForOwner, getDogImageStorageKeys } from "@/lib/pets/repository";
import { deleteDogImages } from "@/lib/storage/dog-images";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ dogId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { dogId } = await params;

  try {
    const supabase = createSupabaseAdminClient();
    const dog = await getDogForOwner(supabase, user.id, dogId);
    if (!dog) return NextResponse.json({ message: "Not found" }, { status: 404 });

    const storageKeys = await getDogImageStorageKeys(supabase, user.id, dogId);
    await deleteDogImages(supabase, storageKeys);
    await deleteDogForOwner(supabase, user.id, dogId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "내새꾸 삭제 중 문제가 발생했어요." }, { status: 500 });
  }
}
