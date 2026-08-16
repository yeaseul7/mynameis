import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDogForOwner, getOrCreateDogPublicLink } from "@/lib/pets/service";
import type { DogPublicLinkType } from "@/lib/pets/types";

const TYPE_PREFIX: Record<DogPublicLinkType, string> = {
  PROFILE: "pet_p",
  CARE: "pet_c",
  LOST: "pet_l",
};

function getPublicLinkType(value: unknown): DogPublicLinkType | null {
  return value === "PROFILE" || value === "CARE" || value === "LOST" ? value : null;
}

function createToken(type: DogPublicLinkType) {
  return `${TYPE_PREFIX[type]}_${randomBytes(9).toString("base64url")}`;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ dogId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { dogId } = await params;
  const body = await request.json().catch(() => null);
  const type = getPublicLinkType(body?.type);
  if (!type) return NextResponse.json({ message: "Invalid public link type" }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const dog = await getDogForOwner(supabase, user.id, dogId);
  if (!dog) return NextResponse.json({ message: "Not found" }, { status: 404 });

  let lastError: unknown;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const publicLink = await getOrCreateDogPublicLink(supabase, {
        ownerId: user.id,
        dogId,
        type,
        token: createToken(type),
      });
      return NextResponse.json({ token: publicLink.token, type: publicLink.type });
    } catch (error) {
      lastError = error;
      if (typeof error !== "object" || error === null || !("code" in error) || error.code !== "23505") throw error;
    }
  }

  throw lastError ?? new Error("Dog public link generation failed");
}
