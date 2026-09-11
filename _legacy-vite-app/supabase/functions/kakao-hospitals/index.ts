import { errorResponse, handleOptions, HttpError, json } from "../_shared/http.ts";

Deno.serve(async (request) => {
  const options = handleOptions(request); if (options) return options;
  try {
    const { query: raw = "" } = await request.json().catch(() => ({}));
    const value = String(raw).trim();
    if (value.length < 2) return json({ documents: [] });
    const key = Deno.env.get("KAKAO_REST_API_KEY");
    if (!key) throw new HttpError(500, "Kakao REST API key is not configured.");
    const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json");
    url.searchParams.set("query", value.includes("병원") ? value : `${value} 동물병원`);
    url.searchParams.set("size", "5");
    const response = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } });
    if (!response.ok) throw new HttpError(response.status, "병원 검색에 실패했어요.");
    const data = await response.json();
    return json({ documents: (data.documents ?? []).map((place: Record<string, string>) => ({
      id: place.id, name: place.place_name, address: place.road_address_name || place.address_name,
      phone: place.phone, url: place.place_url,
    })) });
  } catch (error) { return errorResponse(error, "병원 검색을 불러오지 못했어요."); }
});
