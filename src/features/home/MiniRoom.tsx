"use client";

import { CSSProperties, MouseEvent, PointerEvent, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { LiveChat } from "./LiveChat";

export type RoomObject = {
  id: string;
  type: "furniture" | "pet";
  assetKey: string;
  assetUrl: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

type MiniRoomProps = {
  petId: string | null;
  petName: string;
  petImageUrl: string | null;
  senderName: string;
  editable: boolean;
};

const backgrounds = [
  { key: "default", name: "기본", url: "/backgrounds/room-default.png" },
] as const;
const roomCategories = ["배경", "러그", "방석", "밥그릇", "창문", "기타"] as const;
type RoomCategory = (typeof roomCategories)[number];
const windowThemes = [
  { key: "basic", name: "기본" },
] as const;
const catalog = [
  { assetKey: "rug-basic", name: "기본 발바닥 러그", category: "러그", assetUrl: "/room-assets/rug-basic.png", x: 48, y: 91, scale: 0.34 },
  { assetKey: "cushion-basic", name: "기본 체크 방석", category: "방석", assetUrl: "/room-assets/cushion-basic.png", x: 50, y: 82, scale: 0.32 },
  { assetKey: "bowl-basic", name: "기본 2구 식기", category: "밥그릇", assetUrl: "/room-assets/bowl-basic.png", x: 50, y: 88, scale: 0.26 },
  { assetKey: "decor-shelf", name: "장식 선반", category: "기타", assetUrl: "/room-assets/decor-shelf.png", x: 50, y: 38, scale: 0.34 },
  { assetKey: "toy-box", name: "장난감 상자", category: "기타", assetUrl: "/room-assets/toy-box.png", x: 70, y: 84, scale: 0.25 },
  { assetKey: "potted-plant", name: "리본 화분", category: "기타", assetUrl: "/room-assets/potted-plant.png", x: 82, y: 69, scale: 0.2 },
  { assetKey: "plush-bone", name: "폭신 뼈다귀", category: "기타", assetUrl: "/room-assets/plush-bone.png", x: 50, y: 86, scale: 0.22 },
  { assetKey: "window-basic-tall", name: "기본 세로 창문", theme: "basic", category: "창문", assetUrl: "/room-assets/window-basic-tall.png", x: 50, y: 48, scale: 0.52 },
  { assetKey: "window-basic-wide", name: "기본 가로 창문", theme: "basic", category: "창문", assetUrl: "/room-assets/window-basic-wide.png", x: 50, y: 48, scale: 0.7 },
] as const;

const floorSlots = [
  { x: 30, y: 66 }, { x: 50, y: 66 }, { x: 70, y: 66 },
  { x: 20, y: 76 }, { x: 40, y: 76 }, { x: 60, y: 76 }, { x: 80, y: 76 },
  { x: 12, y: 88 }, { x: 30, y: 88 }, { x: 50, y: 88 }, { x: 70, y: 88 }, { x: 88, y: 88 },
  { x: 8, y: 96 }, { x: 26, y: 96 }, { x: 44, y: 96 }, { x: 62, y: 96 }, { x: 80, y: 96 }, { x: 94, y: 96 },
];
const wallSlots = [
  { x: 22, y: 32 }, { x: 40, y: 32 }, { x: 60, y: 32 }, { x: 78, y: 32 },
  { x: 28, y: 48 }, { x: 50, y: 48 }, { x: 72, y: 48 },
];

function initialObjects(petId: string | null, petImageUrl: string | null): RoomObject[] {
  if (!petId) return [];
  return [
    { id: "rug-demo", type: "furniture", ...catalog[0], x: 48, y: 91, scale: 0.34, rotation: 0 },
    { id: "plant-demo", type: "furniture", ...catalog.find((asset) => asset.assetKey === "potted-plant")!, x: 87, y: 69, scale: 0.19, rotation: 0 },
    { id: "pet-demo", type: "pet", assetKey: "pet", assetUrl: petImageUrl ?? "", x: 43, y: 82, scale: 1, rotation: 0 },
  ];
}

export function MiniRoom({ petId, petName, petImageUrl, senderName, editable }: MiniRoomProps) {
  const roomRef = useRef<HTMLDivElement>(null);
  const [objects, setObjects] = useState<RoomObject[]>(() => initialObjects(petId, petImageUrl));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [walking, setWalking] = useState(false);
  const [facing, setFacing] = useState<"left" | "right">("right");
  const walkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [backgroundKey, setBackgroundKey] = useState("default");
  const [activeCategory, setActiveCategory] = useState<RoomCategory>("배경");
  const storageKey = `mynameis-room:${petId ?? "no-pet"}`;
  const backgroundStorageKey = `${storageKey}:background`;

  useEffect(() => {
    let active = true;
    const load = async () => {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try { if (active) setObjects((JSON.parse(saved) as RoomObject[]).filter((item) => item.type === "pet" || catalog.some((asset) => asset.assetKey === item.assetKey))); } catch { /* 기본 배치를 유지한다. */ }
      }
      const savedBackground = localStorage.getItem(backgroundStorageKey);
      if (savedBackground && backgrounds.some((item) => item.key === savedBackground)) setBackgroundKey(savedBackground);
      const supabase = getSupabaseBrowserClient();
      if (!petId || !supabase) return;
      const { data: room } = await supabase.from("mini_rooms").select("id,background_key").eq("pet_id", petId).maybeSingle();
      if (!room) return;
      if (backgrounds.some((item) => item.key === room.background_key)) setBackgroundKey(room.background_key);
      const { data: rows } = await supabase.from("room_items").select("id,object_type,asset_key,asset_url,x,y,scale,rotation").eq("room_id", room.id).order("created_at");
      if (!active || !rows?.length) return;
      setObjects(rows.filter((row) => row.object_type === "pet" || catalog.some((asset) => asset.assetKey === row.asset_key)).map((row) => ({
        id: row.id,
        type: row.object_type as RoomObject["type"],
        assetKey: row.asset_key,
        assetUrl: row.object_type === "pet" ? row.asset_url ?? petImageUrl ?? "" : catalog.find((asset) => asset.assetKey === row.asset_key)?.assetUrl ?? "",
        x: Number(row.x), y: Number(row.y), scale: Number(row.scale), rotation: Number(row.rotation),
      })));
    };
    void load();
    return () => { active = false; };
  }, [backgroundStorageKey, petId, petImageUrl, storageKey]);

  useEffect(() => {
    setObjects((current) => current.map((item) => item.type === "pet" ? { ...item, assetUrl: petImageUrl ?? "" } : item));
  }, [petImageUrl]);

  useEffect(() => () => {
    if (walkTimerRef.current) clearTimeout(walkTimerRef.current);
  }, []);

  function walkPet(event: MouseEvent<HTMLDivElement>) {
    if (editing || event.target !== event.currentTarget || !roomRef.current) return;
    const bounds = roomRef.current.getBoundingClientRect();
    const x = Math.max(7, Math.min(93, ((event.clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(60, Math.min(94, ((event.clientY - bounds.top) / bounds.height) * 100));
    const pet = objects.find((item) => item.type === "pet");
    if (!pet) return;
    const duration = Math.max(450, Math.min(1600, Math.hypot(x - pet.x, y - pet.y) * 22));
    setFacing(x < pet.x ? "left" : "right");
    setWalking(true);
    setObjects((current) => current.map((item) => item.type === "pet" ? { ...item, x, y } : item));
    if (walkTimerRef.current) clearTimeout(walkTimerRef.current);
    walkTimerRef.current = setTimeout(() => setWalking(false), duration);
  }

  function moveObject(event: PointerEvent<HTMLElement>, id: string) {
    if (!editing) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedId(id);
  }

  function dragObject(event: PointerEvent<HTMLElement>, id: string) {
    if (!editing || !event.currentTarget.hasPointerCapture(event.pointerId) || !roomRef.current) return;
    const bounds = roomRef.current.getBoundingClientRect();
    const pointerX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const pointerY = ((event.clientY - bounds.top) / bounds.height) * 100;
    const item = objects.find((object) => object.id === id);
    if (!item) return;
    const category = String(catalog.find((asset) => asset.assetKey === item.assetKey)?.category ?? "기타");
    const wallOnly = category === "창문" || item.assetKey === "decor-shelf";
    const x = Math.max(7, Math.min(93, pointerX));
    const y = wallOnly ? Math.max(18, Math.min(58, pointerY)) : Math.max(60, Math.min(96, pointerY));
    setObjects((current) => current.map((object) => object.id === id ? { ...object, x, y } : object));
  }

  function addObject(asset: (typeof catalog)[number]) {
    const id = `${asset.assetKey}-${Date.now()}`;
    setObjects((current) => [...current, { id, type: "furniture", ...asset, rotation: 0 }]);
    setSelectedId(id);
  }

  function updateSelected(changes: Partial<Pick<RoomObject, "scale" | "rotation">>) {
    setObjects((current) => current.map((item) => item.id === selectedId ? { ...item, ...changes } : item));
  }

  async function saveRoom() {
    localStorage.setItem(storageKey, JSON.stringify(objects));
    localStorage.setItem(backgroundStorageKey, backgroundKey);
    const supabase = getSupabaseBrowserClient();
    if (!petId || !supabase) { setMessage("저장됨"); return; }

    const { data: room, error: roomError } = await supabase.from("mini_rooms").upsert({ pet_id: petId, background_key: backgroundKey }, { onConflict: "pet_id" }).select("id").single();
    if (roomError || !room) { setMessage("저장 실패"); return; }
    const { error: deleteError } = await supabase.from("room_items").delete().eq("room_id", room.id);
    if (deleteError) { setMessage("저장 실패"); return; }
    const rows = objects.map((item) => ({ room_id: room.id, object_type: item.type, asset_key: item.assetKey, asset_url: item.type === "pet" ? item.assetUrl || null : null, x: item.x, y: item.y, scale: item.scale, rotation: item.rotation }));
    const { error } = await supabase.from("room_items").insert(rows);
    setMessage(error ? "저장 실패" : "저장됨");
  }

  const backgroundUrl = backgrounds.find((item) => item.key === backgroundKey)?.url ?? backgrounds[0].url;
  const categoryAssets = catalog.filter((item) => item.category === activeCategory);
  const groupedWindowAssets = windowThemes.map((theme) => ({ ...theme, assets: categoryAssets.filter((asset) => "theme" in asset && asset.theme === theme.key) }));
  const petPosition = objects.find((item) => item.type === "pet");

  return <section className="mini-room-section">
    <div className="mini-room-heading"><div><b>MINI ROOM</b>{message && <span className={`room-status ${message === "저장됨" ? "saved" : ""}`} aria-live="polite">{message}</span>}</div>{editable && <button onClick={() => { setEditing((value) => { const next = !value; if (next) setMessage("편집중"); return next; }); setSelectedId(null); }}>{editing ? "꾸미기 닫기" : "꾸미기"}</button>}</div>
    <div className={`mini-room ${editing ? "editing" : ""}`} ref={roomRef} onClick={walkPet}>
      <img className="mini-room-background" src={backgroundUrl} alt="벽과 바닥으로 구성된 빈 미니룸" draggable={false} />
      {objects.map((item) => {
        const category = catalog.find((asset) => asset.assetKey === item.assetKey)?.category;
        const sizeBoost = category === "러그" ? 1.5 : category === "방석" ? 1.45 : category === "밥그릇" ? 1.55 : item.assetKey === "toy-box" ? 1.5 : 1;
        const displayScale = item.assetKey === "window-basic-wide" ? Math.max(item.scale, 0.7) : item.scale * sizeBoost;
        const baseRotation = item.assetKey === "window-basic-wide" ? -3 : 0;
        const style = { left: `${item.x}%`, top: `${item.y}%`, zIndex: Math.round(item.y * 10), transform: `translate(-50%, -100%) rotate(${baseRotation}deg) scale(${displayScale}) scaleX(${item.rotation === 180 ? -1 : 1})`, "--object-inverse-scale": 1 / displayScale } as CSSProperties & { "--object-inverse-scale": number };
        const selectedObject = editing && selectedId === item.id;
        return <div key={item.id} className={`mini-room-object ${item.rotation === 180 ? "flipped" : ""} ${item.type === "pet" ? `${item.assetUrl ? "mini-room-pet" : "mini-room-pet-fallback"} facing-${facing} ${walking ? "walking" : ""}` : ""} ${selectedObject ? "selected" : ""}`} style={style} onPointerDown={(event) => moveObject(event, item.id)} onPointerMove={(event) => dragObject(event, item.id)} role="button" tabIndex={editing ? 0 : -1} aria-label={`${item.type === "pet" ? petName : item.assetKey} 위치 이동`}>
          {item.type === "pet" && !item.assetUrl ? "🐶" : <img src={item.assetUrl} alt="" draggable={false} />}
          {selectedObject && <div className="object-corner-actions">
            <button className="object-flip" type="button" aria-label="방향 전환" title="방향 전환" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); updateSelected({ rotation: item.rotation === 180 ? 0 : 180 }); }}>↔</button>
            {item.type !== "pet" && <button className="object-delete" type="button" aria-label="오브젝트 삭제" title="삭제" onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); setObjects((current) => current.filter((object) => object.id !== item.id)); setSelectedId(null); }}>×</button>}
          </div>}
        </div>;
      })}
      {!editing && <LiveChat petId={petId} senderName={senderName} petPosition={petPosition ? { x: petPosition.x, y: petPosition.y } : null} />}
    </div>
    {editing && <div className="mini-room-editor">
      <nav className="room-bookmarks" aria-label="꾸미기 카테고리">{roomCategories.map((category) => <button key={category} className={activeCategory === category ? "active" : ""} onClick={() => setActiveCategory(category)}>{category}</button>)}</nav>
      {activeCategory === "배경" ? <div className="room-backgrounds">{backgrounds.map((background) => <button key={background.key} className={backgroundKey === background.key ? "active" : ""} onClick={() => setBackgroundKey(background.key)}><img src={background.url} alt="" /><span>{background.name}</span></button>)}</div> : activeCategory === "창문" ? <div className="window-theme-groups">{groupedWindowAssets.map((theme) => <section key={theme.key}><b>{theme.name} 테마</b><div className="room-catalog">{theme.assets.map((asset) => <button key={asset.assetKey} onClick={() => addObject(asset)}><img src={asset.assetUrl} alt="" /><span>+ {asset.name}</span></button>)}</div></section>)}</div> : categoryAssets.length ? <div className="room-catalog">{categoryAssets.map((asset) => <button key={asset.assetKey} onClick={() => addObject(asset)}><img src={asset.assetUrl} alt="" /><span>+ {asset.name}</span></button>)}</div> : <p className="room-empty">등록된 아이템이 없습니다.</p>}
      <button className="room-save" onClick={() => void saveRoom()}>배치 저장</button>
    </div>}
  </section>;
}
