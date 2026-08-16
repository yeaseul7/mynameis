import { NextResponse } from "next/server";

type KakaoPlace = {
  id: string;
  place_name: string;
  road_address_name: string;
  address_name: string;
  phone: string;
  place_url: string;
};

export async function GET(request: Request) {
  const restApiKey = process.env.KAKAO_REST_API_KEY;
  if (!restApiKey) {
    return NextResponse.json({ error: "Kakao REST API key is not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const rawQuery = searchParams.get("q")?.trim() ?? "";
  if (rawQuery.length < 2) return NextResponse.json({ documents: [] });

  const query = rawQuery.includes("병원") ? rawQuery : `${rawQuery} 동물병원`;
  const kakaoUrl = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
  kakaoUrl.searchParams.set("query", query);
  kakaoUrl.searchParams.set("size", "5");

  const response = await fetch(kakaoUrl, {
    headers: { Authorization: `KakaoAK ${restApiKey}` },
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Hospital search failed." }, { status: response.status });
  }

  const data = await response.json() as { documents?: KakaoPlace[] };
  return NextResponse.json({
    documents: (data.documents ?? []).map((place) => ({
      id: place.id,
      name: place.place_name,
      address: place.road_address_name || place.address_name,
      phone: place.phone,
      url: place.place_url,
    })),
  });
}
