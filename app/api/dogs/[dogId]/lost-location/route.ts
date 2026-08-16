import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDogForOwner, saveDogLostLocation } from "@/lib/pets/service";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ dogId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { dogId } = await params;
  const supabase = await createServerSupabaseClient();
  const dog = await getDogForOwner(supabase, user.id, dogId);
  if (!dog) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const care = dog.careProfile;
  return NextResponse.json({
    lostAt: care?.lostAt ?? null,
    lostLocationAddress: care?.lostLocationAddress ?? null,
    lostLocationDistrict: care?.lostLocationDistrict ?? null,
    lostLocationNeighborhood: care?.lostLocationNeighborhood ?? null,
    lostLocationDetail: care?.lostLocationDetail ?? null,
  });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ dogId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { dogId } = await params;
  const supabase = await createServerSupabaseClient();
  const dog = await getDogForOwner(supabase, user.id, dogId);
  if (!dog) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const body = await request.json();
  const lostLocationDistrict = typeof body.lostLocationDistrict === "string" && body.lostLocationDistrict.trim() ? body.lostLocationDistrict.trim() : null;
  const lostLocationNeighborhood = typeof body.lostLocationNeighborhood === "string" && body.lostLocationNeighborhood.trim() ? body.lostLocationNeighborhood.trim() : null;
  const lostLocationDetail = typeof body.lostLocationDetail === "string" && body.lostLocationDetail.trim() ? body.lostLocationDetail.trim() : null;
  const lostLocationAddress = [lostLocationDistrict, lostLocationNeighborhood, lostLocationDetail].filter(Boolean).join(" ") || null;
  const lostAt = typeof body.lostAt === "string" && body.lostAt ? body.lostAt : null;

  await saveDogLostLocation(supabase, {
    ownerId: user.id,
    dogId,
    lostAt,
    lostLocationAddress,
    lostLocationDistrict,
    lostLocationNeighborhood,
    lostLocationDetail,
  });

  return NextResponse.json({ lostAt, lostLocationAddress, lostLocationDistrict, lostLocationNeighborhood, lostLocationDetail });
}
