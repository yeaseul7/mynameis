import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getCoordinate(value: unknown) {
  const coordinate = Number(value);
  return Number.isFinite(coordinate) ? coordinate : null;
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const body = await request.json().catch(() => ({}));
  const latitude = getCoordinate(body.latitude);
  const longitude = getCoordinate(body.longitude);
  const accuracy = getCoordinate(body.accuracy);
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 500) : null;

  if (latitude === null || longitude === null || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return NextResponse.json({ message: "위치 정보를 확인하지 못했어요." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.rpc("record_dog_found_location", {
    public_token: slug,
    found_lat: latitude,
    found_lng: longitude,
    found_accuracy: accuracy,
    found_note: note,
  });

  if (error) return NextResponse.json({ message: "현위치를 저장하지 못했어요." }, { status: 500 });
  return NextResponse.json({ location: data?.[0] ?? null });
}
