import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { createServerSupabaseClient, createSupabaseAdminClient } from "@/lib/supabase/server";

function normalizeInviteCode(value: unknown) {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return "";
  if (raw.startsWith("MNS-")) return raw;
  return `MNS-${raw.replace(/^MNS/, "").replace(/[^A-Z0-9]/g, "")}`;
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
