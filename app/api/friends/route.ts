import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { createServerSupabaseClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

function normalizeInviteCode(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return "";
  if (raw.startsWith("MNS-")) return raw;
  return `MNS-${raw.replace(/^MNS/, "").replace(/[^A-Z0-9]/g, "")}`;
}

function mapFriendDog(row: {
  id: string;
  name: string;
  breed: string;
  dog_images?: Array<{ id?: string; storage_key?: string; image_url: string | null; sort_order: number; is_primary: boolean }>;
}) {
  return {
    id: row.id,
    name: row.name,
    breed: row.breed,
    photos: [...(row.dog_images ?? [])]
      .filter((photo) => Boolean(photo.image_url))
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((photo) => ({
        id: photo.id,
        storageKey: photo.storage_key,
        url: photo.image_url as string,
        sortOrder: photo.sort_order,
        isPrimary: photo.is_primary,
      })),
  };
}

function createProfileToken() {
  return `pet_p_${randomBytes(9).toString("base64url")}`;
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const adminSupabase = createSupabaseAdminClient();
    const { data, error } = await adminSupabase
      .from("dog_friends")
      .select("friend_dog:dogs!dog_friends_friend_dog_id_fkey(id,name,breed,dog_images(id,storage_key,image_url,sort_order,is_primary))")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const friends = ((data ?? []) as unknown as Array<{ friend_dog: ReturnType<typeof mapFriendDog> | ReturnType<typeof mapFriendDog>[] | null }>)
      .map((row) => Array.isArray(row.friend_dog) ? row.friend_dog[0] : row.friend_dog)
      .filter(Boolean)
      .map((dog) => mapFriendDog(dog as Parameters<typeof mapFriendDog>[0]));

    return NextResponse.json({ friends });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "친구 목록을 불러오지 못했어요." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const dogId = String(body?.dogId ?? "");
    if (!dogId) return NextResponse.json({ message: "친구 정보를 확인해 주세요." }, { status: 400 });

    const adminSupabase = createSupabaseAdminClient();
    const { data: friend, error: friendError } = await adminSupabase
      .from("dog_friends")
      .select("friend_dog_id")
      .eq("owner_id", user.id)
      .eq("friend_dog_id", dogId)
      .maybeSingle();
    if (friendError) throw friendError;
    if (!friend) return NextResponse.json({ message: "등록된 친구가 아니에요." }, { status: 404 });

    const { data: dog, error: dogError } = await adminSupabase
      .from("dogs")
      .select("id,owner_id")
      .eq("id", dogId)
      .maybeSingle();
    if (dogError) throw dogError;
    if (!dog) return NextResponse.json({ message: "친구 정보를 찾지 못했어요." }, { status: 404 });

    const { data: existing, error: existingError } = await adminSupabase
      .from("dog_public_links")
      .select("token")
      .eq("dog_id", dog.id)
      .eq("type", "PROFILE")
      .eq("is_active", true)
      .is("revoked_at", null)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existing) return NextResponse.json({ token: existing.token });

    let lastError: unknown;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const { data: created, error } = await adminSupabase
        .from("dog_public_links")
        .insert({
          dog_id: dog.id,
          owner_id: dog.owner_id,
          type: "PROFILE",
          token: createProfileToken(),
        })
        .select("token")
        .single();
      if (!error && created) return NextResponse.json({ token: created.token });
      lastError = error;
      if (error?.code !== "23505") break;
    }

    throw lastError ?? new Error("Friend profile link creation failed");
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "친구 공유 링크를 준비하지 못했어요." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => null);
    const inviteCode = normalizeInviteCode(body?.inviteCode);
    if (!/^MNS-[A-Z0-9]{6}$/.test(inviteCode)) {
      return NextResponse.json({ message: "초대코드 형식을 확인해 주세요." }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();
    const { data: myDog, error: myDogError } = await supabase
      .from("dogs")
      .select("id")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (myDogError) throw myDogError;
    if (!myDog) return NextResponse.json({ message: "먼저 내 새꾸를 등록해 주세요." }, { status: 400 });

    const adminSupabase = createSupabaseAdminClient();
    const { data: friendDog, error: friendDogError } = await adminSupabase
      .from("dogs")
      .select("id,name,owner_id")
      .eq("invite_code", inviteCode)
      .maybeSingle();
    if (friendDogError) throw friendDogError;
    if (!friendDog) return NextResponse.json({ message: "초대코드와 일치하는 친구를 찾지 못했어요." }, { status: 404 });
    if (friendDog.owner_id === user.id) return NextResponse.json({ message: "내 새꾸의 초대코드는 친구로 추가할 수 없어요." }, { status: 400 });

    const { error } = await adminSupabase.from("dog_friends").upsert([
      {
        owner_id: user.id,
        dog_id: myDog.id,
        friend_dog_id: friendDog.id,
      },
      {
        owner_id: friendDog.owner_id,
        dog_id: friendDog.id,
        friend_dog_id: myDog.id,
      },
    ], { onConflict: "owner_id,friend_dog_id" });
    if (error) throw error;

    return NextResponse.json({ name: friendDog.name });
  } catch (error) {
    console.error(error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === "42P01") {
      return NextResponse.json({ message: "친구 테이블이 아직 준비되지 않았어요. Supabase 마이그레이션을 적용해 주세요." }, { status: 500 });
    }
    return NextResponse.json({ message: "친구를 추가하는 중 문제가 발생했어요." }, { status: 500 });
  }
}
