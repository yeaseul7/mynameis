"use client";

import Link from "next/link";
import { CSSProperties, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { MiniRoom } from "./MiniRoom";
import { LoginModal } from "@/components/LoginModal";

type Tab = "home" | "profile" | "diary" | "photos";
type AlbumImage = { id: string; image_url: string; sort_order: number };
type PhotoAlbum = { id: string; diary_id: string | null; caption: string; created_at: string; photo_album_images: AlbumImage[] };
type DiaryEntry = { id: string; date: string; text: string; images: AlbumImage[] };
type GuestEntry = { id: number; name: string; text: string };
type Todo = { id?: string; todo_date: string; title: string; completed: boolean };
type Pet = { id: string; name: string; breed: string | null; birth_date: string | null; weight_kg: number | null; gender: "MALE" | "FEMALE" | "UNKNOWN"; neutering_status: "NEUTERED" | "NOT_NEUTERED" | "UNKNOWN"; animal_registration_no: string | null; profile_image_url: string | null };
type DogRow = Omit<Pet, "profile_image_url"> & { dog_images?: { image_url: string; is_primary: boolean; sort_order: number }[] };
type NewDog = Omit<Pet, "id" | "profile_image_url"> & { image: File | null };

const initialDiary: DiaryEntry[] = [];
const initialGuests: GuestEntry[] = [];
const today = toDateKey(new Date());
const defaultThemeColor = "#7653a8";
const themeColors = [{ name: "핑크", value: "#e66f9a" }, { name: "파랑", value: "#4f8fc9" }, { name: "초록", value: "#57956a" }, { name: "보라", value: "#7653a8" }, { name: "노랑", value: "#d2a72e" }, { name: "검정", value: "#333333" }];

export function MiniHome() {
  const [tab, setTab] = useState<Tab>("home");
  const [diary, setDiary] = useState<DiaryEntry[]>(initialDiary);
  const [guests, setGuests] = useState<GuestEntry[]>(initialGuests);
  const [diaryText, setDiaryText] = useState("");
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [guestText, setGuestText] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [nickname, setNickname] = useState("");
  const [ownerBio, setOwnerBio] = useState("");
  const [ownerImage, setOwnerImage] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState(defaultThemeColor);
  const [pet, setPet] = useState<Pet | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [selectedDate, setSelectedDate] = useState(today);
  const [todoTitle, setTodoTitle] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(startOfMonth(new Date()));
  const [loginOpen, setLoginOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const loadDiaryAndAlbums = useCallback(async (id: string) => {
    const supabase = getSupabaseBrowserClient(); if (!supabase) return;
    const [{ data: entries }, { data: albumRows }] = await Promise.all([
      supabase.from("diary_entries").select("id,content,created_at,photo_albums(photo_album_images(id,image_url,sort_order))").eq("owner_id", id).order("created_at", { ascending: false }),
      supabase.from("photo_albums").select("id,diary_id,caption,created_at,photo_album_images(id,image_url,sort_order)").eq("owner_id", id).order("created_at", { ascending: false }),
    ]);
    const mapped = ((entries ?? []) as unknown as { id: string; content: string; created_at: string; photo_albums?: { photo_album_images?: AlbumImage[] }[] }[]).map((entry) => ({ id: entry.id, text: entry.content, date: new Intl.DateTimeFormat("ko-KR").format(new Date(entry.created_at)), images: [...(entry.photo_albums?.[0]?.photo_album_images ?? [])].sort((a, b) => a.sort_order - b.sort_order) }));
    setDiary(mapped); setAlbums(((albumRows ?? []) as unknown as PhotoAlbum[]).map((album) => ({ ...album, photo_album_images: [...(album.photo_album_images ?? [])].sort((a, b) => a.sort_order - b.sort_order) })));
  }, []);

  const loadTodos = useCallback(async (id: string | null, month: Date) => {
    const start = toDateKey(startOfMonth(month));
    const end = toDateKey(new Date(month.getFullYear(), month.getMonth() + 1, 0));
    const supabase = getSupabaseBrowserClient();
    if (id && supabase) {
      const { data } = await supabase.from("daily_todos").select("id,todo_date,title,completed").gte("todo_date", start).lte("todo_date", end).order("todo_date");
      setTodos((data as Todo[] | null) ?? []);
    } else {
      const local = safeRead<Todo[]>("mynameis-todos", []);
      setTodos(local.filter((item) => item.todo_date >= start && item.todo_date <= end));
    }
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      setUserId(id);
      setUserEmail(session?.user.email ?? null);
      if (!id) { setAuthLoading(false); return; }
      window.setTimeout(() => {
        void supabase.from("dogs").select("id,name,breed,birth_date,weight_kg,gender,neutering_status,animal_registration_no,dog_images(image_url,is_primary,sort_order)").eq("owner_id", id).order("created_at").then(({ data: dogs }) => {
          const user = session?.user;
          setNickname(String(user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? ""));
          setOwnerImage(String(user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? "") || null);
          setThemeColor(String(user?.user_metadata?.theme_color ?? defaultThemeColor));
          const petList = ((dogs as DogRow[] | null) ?? []).map(mapDog); const featuredId = localStorage.getItem(`mynameis-featured-pet:${id}`); setPets(petList); setPet(featuredId === "owner" ? null : petList.find((item) => item.id === featuredId) ?? petList[0] ?? null);
          void loadTodos(id, calendarMonth);
          void loadDiaryAndAlbums(id);
          setAuthLoading(false);
        });
      }, 0);
    });
    return () => listener.subscription.unsubscribe();
  }, [calendarMonth, loadDiaryAndAlbums, loadTodos]);

  useEffect(() => {
    setDiary(safeRead("mynameis-diary", initialDiary));
    setGuests(safeRead("mynameis-guests", initialGuests));
    const supabase = getSupabaseBrowserClient();
    if (!supabase) { void loadTodos(null, calendarMonth); setAuthLoading(false); return; }
    void supabase.auth.getSession().then(async ({ data }) => {
      const id = data.session?.user.id ?? null;
      setUserId(id);
      setUserEmail(data.session?.user.email ?? null);
      if (!id) { void loadTodos(null, calendarMonth); setAuthLoading(false); return; }
      const user = data.session?.user;
      setNickname(String(user?.user_metadata?.name ?? user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? ""));
      setOwnerImage(String(user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture ?? "") || null);
      setThemeColor(String(user?.user_metadata?.theme_color ?? defaultThemeColor));
      const { data: dogs } = await supabase.from("dogs").select("id,name,breed,birth_date,weight_kg,gender,neutering_status,animal_registration_no,dog_images(image_url,is_primary,sort_order)").eq("owner_id", id).order("created_at");
      const petList = ((dogs as DogRow[] | null) ?? []).map(mapDog); const featuredId = localStorage.getItem(`mynameis-featured-pet:${id}`); setPets(petList); setPet(featuredId === "owner" ? null : petList.find((item) => item.id === featuredId) ?? petList[0] ?? null);
      void loadTodos(id, calendarMonth);
      void loadDiaryAndAlbums(id);
      setAuthLoading(false);
    });
  // 초기 세션만 로드한다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setTodoTitle("");
  }, [selectedDate]);

  async function saveTodo(event: FormEvent) {
    event.preventDefault();
    const title = todoTitle.trim();
    if (!title) return;
    if (todos.filter((todo) => todo.todo_date === selectedDate).length >= 5) return;
    const supabase = getSupabaseBrowserClient();
    if (userId && supabase) {
      await supabase.from("daily_todos").insert({ user_id: userId, todo_date: selectedDate, title });
    } else {
      const local = safeRead<Todo[]>("mynameis-todos", []);
      local.push({ id: crypto.randomUUID(), todo_date: selectedDate, title, completed: false });
      localStorage.setItem("mynameis-todos", JSON.stringify(local));
    }
    setTodoTitle("");
    await loadTodos(userId, calendarMonth);
  }

  async function toggleTodo(item: Todo) {
    const supabase = getSupabaseBrowserClient();
    if (userId && supabase && item.id) await supabase.from("daily_todos").update({ completed: !item.completed }).eq("id", item.id).eq("user_id", userId);
    else {
      const local = safeRead<Todo[]>("mynameis-todos", []).map((todo) => todo.id === item.id || (!item.id && todo.todo_date === item.todo_date && todo.title === item.title) ? { ...todo, completed: !todo.completed } : todo);
      localStorage.setItem("mynameis-todos", JSON.stringify(local));
    }
    await loadTodos(userId, calendarMonth);
  }

  async function addPet(input: NewDog) {
    const supabase = getSupabaseBrowserClient();
    if (userId && supabase) {
      const { image, ...dogInput } = input;
      const { data, error } = await supabase.from("dogs").insert({ owner_id: userId, ...dogInput, breed: dogInput.breed || "미등록" }).select("id,name,breed,birth_date,weight_kg,gender,neutering_status,animal_registration_no").single();
      if (error) throw error;
      let imageUrl: string | null = null;
      if (image) {
        const extension = image.name.split(".").pop()?.toLowerCase() || "jpg";
        const storageKey = `${userId}/${data.id}/${crypto.randomUUID()}.${extension}`;
        const upload = await supabase.storage.from("dog-images").upload(storageKey, image, { contentType: image.type });
        if (upload.error) { await supabase.from("dogs").delete().eq("id", data.id); throw upload.error; }
        imageUrl = supabase.storage.from("dog-images").getPublicUrl(storageKey).data.publicUrl;
        const imageInsert = await supabase.from("dog_images").insert({ dog_id: data.id, owner_id: userId, storage_key: storageKey, image_url: imageUrl, sort_order: 0, is_primary: true, original_name: image.name, mime_type: image.type, file_size: image.size });
        if (imageInsert.error) throw imageInsert.error;
      }
      setPets((current) => [...current, { ...(data as Omit<Pet, "profile_image_url">), profile_image_url: imageUrl }]);
      return;
    }
    throw new Error("로그인이 필요합니다.");
  }

  async function uploadAlbumImages(albumId: string, files: File[]) {
    const supabase = getSupabaseBrowserClient(); if (!supabase || !userId) throw new Error("로그인이 필요합니다.");
    const rows: { album_id: string; owner_id: string; storage_key: string; image_url: string; sort_order: number }[] = [];
    for (const [index, file] of files.entries()) { const ext = file.name.split(".").pop()?.toLowerCase() || "jpg"; const key = `${userId}/${albumId}/${crypto.randomUUID()}.${ext}`; const uploaded = await supabase.storage.from("diary-images").upload(key, file, { contentType: file.type }); if (uploaded.error) throw uploaded.error; rows.push({ album_id: albumId, owner_id: userId, storage_key: key, image_url: supabase.storage.from("diary-images").getPublicUrl(key).data.publicUrl, sort_order: index }); }
    if (rows.length) { const { error } = await supabase.from("photo_album_images").insert(rows); if (error) throw error; }
  }

  async function addDiary(files: File[]) { const content = diaryText.trim(); if (!content || content.length > 3000 || files.length > 5) return; const supabase = getSupabaseBrowserClient(); if (!userId || !supabase) return; const { data: entry, error } = await supabase.from("diary_entries").insert({ owner_id: userId, content }).select("id").single(); if (error) throw error; if (files.length) { const { data: album, error: albumError } = await supabase.from("photo_albums").insert({ owner_id: userId, diary_id: entry.id, caption: content }).select("id").single(); if (albumError) throw albumError; await uploadAlbumImages(album.id, files); } setDiaryText(""); await loadDiaryAndAlbums(userId); }
  function addGuest(event: FormEvent) { event.preventDefault(); const name = nickname.slice(0, 20); const text = guestText.trim().slice(0, 100); if (!text) return; const next = [{ id: Date.now(), name, text }, ...guests]; setGuests(next); localStorage.setItem("mynameis-guests", JSON.stringify(next)); setGuestText(""); }

  async function setFeaturedPet(nextPet: Pet | null) {
    if (!userId) return;
    localStorage.setItem(`mynameis-featured-pet:${userId}`, nextPet?.id ?? "owner");
    setPet(nextPet);
  }

  async function changeThemeColor(color: string) { const supabase = getSupabaseBrowserClient(); if (!supabase || !userId) return; const { error } = await supabase.auth.updateUser({ data: { theme_color: color } }); if (error) throw error; setThemeColor(color); }
  async function logoutUser() { await getSupabaseBrowserClient()?.auth.signOut(); window.location.reload(); }

  const petName = pet?.name ?? "";
  const displayNickname = nickname.replace(/네$/, "");
  const worldHref = pet ? `/world?petId=${encodeURIComponent(pet.id)}&petName=${encodeURIComponent(petName)}` : "#";

  return <main className="mini-page" style={{ "--theme-color": themeColor } as CSSProperties}><section className="mini-shell">
    <div className="mini-counter"><span><em>TODAY</em><b>–</b></span><span><em>TOTAL</em><strong>–</strong></span></div><header className="mini-title"><b>{displayNickname ? `${displayNickname}의 멍디어리` : "멍디어리"}</b>{userId && <button className="mini-title-logout" onClick={() => void logoutUser()}>로그아웃</button>}</header>
    <div className="binder-rings" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</div>
    <aside className="mini-profile"><div className={`dog-photo ${pet?.profile_image_url || ownerImage ? "" : "empty"}`}>{(pet?.profile_image_url ?? ownerImage) ? <img src={(pet?.profile_image_url ?? ownerImage)!} alt={pet ? `${petName} 프로필` : `${displayNickname} 프로필`} /> : <span className="profile-empty">{pet ? "강아지 사진 없음" : "사용자 사진 없음"}</span>}</div>
      <TodoPanel todos={todos} selectedDate={selectedDate} todoTitle={todoTitle} month={calendarMonth} onSelect={setSelectedDate} onTitle={setTodoTitle} onSave={saveTodo} onToggle={toggleTodo} onMonth={async (month) => { setCalendarMonth(month); await loadTodos(userId, month); }} />
    </aside>
    <section className="mini-content">{authLoading ? <section className="content-block private-profile">불러오는 중…</section> : <>{tab === "home" && <HomeContent diary={diary} guests={guests} guestText={guestText} setGuestText={setGuestText} addGuest={addGuest} pet={pet} petName={petName} nickname={nickname} editable={!pet || Boolean(userId)} onRefreshDiary={() => userId ? void loadDiaryAndAlbums(userId) : undefined} onRefreshGuests={() => setGuests(safeRead("mynameis-guests", []))} />}{tab === "profile" && (userId ? <ProfileContent pets={pets} featuredPet={pet} nickname={displayNickname} bio={ownerBio} ownerImage={ownerImage} email={userEmail} userId={userId} themeColor={themeColor} onThemeColor={changeThemeColor} onProfileChange={(nextName, nextImage) => { setNickname(nextName); setOwnerImage(nextImage); }} onAddPet={addPet} onFeaturedPet={setFeaturedPet} /> : <PrivateProfileGate onLogin={() => setLoginOpen(true)} />)}{tab === "diary" && (userId ? <DiaryContent diary={diary} text={diaryText} setText={setDiaryText} addDiary={addDiary} /> : <PrivateProfileGate onLogin={() => setLoginOpen(true)} />)}{tab === "photos" && (userId ? <PhotosContent albums={albums} /> : <PrivateProfileGate onLogin={() => setLoginOpen(true)} />)}</>}</section>
    <nav className="mini-tabs">{(["home", "profile", "diary", "photos"] as Tab[]).map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => setTab(item)}>{{ home: "홈", profile: "프로필", diary: "다이어리", photos: "사진첩" }[item]}</button>)}{pet && <Link className="park-tab" href={worldHref}>공원 입장</Link>}</nav>
  </section><LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} /></main>;
}

function TodoPanel({ todos, selectedDate, todoTitle, month, onSelect, onTitle, onSave, onToggle, onMonth }: { todos: Todo[]; selectedDate: string; todoTitle: string; month: Date; onSelect: (date: string) => void; onTitle: (text: string) => void; onSave: (event: FormEvent) => void; onToggle: (todo: Todo) => void; onMonth: (month: Date) => void }) {
  const days = useMemo(() => calendarDays(month), [month]); const selectedTodos = todos.filter((todo) => todo.todo_date === selectedDate); const [editing, setEditing] = useState(false); const isFull = selectedTodos.length >= 5;
  useEffect(() => setEditing(false), [selectedDate]);
  return <div className="todo-panel">
    <div className="calendar-head"><button onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button><strong>{month.getFullYear()}. {month.getMonth() + 1}</strong><button onClick={() => onMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button></div>
    <div className="mini-calendar"><div>일</div><div>월</div><div>화</div><div>수</div><div>목</div><div>금</div><div>토</div>{days.map((day, index) => day ? <button key={day} className={selectedDate === day ? "selected" : ""} onClick={() => onSelect(day)}>{todos.some((todo) => todo.todo_date === day) && <i>🐾</i>}<span>{Number(day.slice(-2))}</span></button> : <span key={`blank-${index}`} />)}</div>
    <div className="todo-title"><b>🐾 {formatTodoDate(selectedDate)} TODO <small>{selectedTodos.length}/5</small></b><button aria-label="TODO 입력 열기" disabled={isFull} onClick={() => setEditing((open) => !open)}>{editing ? "×" : "+"}</button></div>{editing && <form onSubmit={(event) => { onSave(event); setEditing(false); }}><input autoFocus value={todoTitle} onChange={(event) => onTitle(event.target.value)} maxLength={100} placeholder="오늘 할 일 한 가지" /><button>저장</button></form>}<div className="todo-list">{selectedTodos.map((todo, index) => <button key={todo.id ?? `${todo.todo_date}-${index}`} className={`todo-current ${todo.completed ? "done" : ""}`} onClick={() => onToggle(todo)}><span className="todo-checkbox" aria-hidden="true">{todo.completed ? "✓" : ""}</span><span>{todo.title}</span></button>)}</div>
  </div>;
}

function HomeContent({ diary, guests, guestText, setGuestText, addGuest, pet, petName, nickname, editable, onRefreshDiary, onRefreshGuests }: { diary: DiaryEntry[]; guests: GuestEntry[]; guestText: string; setGuestText: (v: string) => void; addGuest: (e: FormEvent) => void; pet: Pet | null; petName: string; nickname: string; editable: boolean; onRefreshDiary: () => void; onRefreshGuests: () => void }) { return <><section className="content-block playground-block"><MiniRoom petId={pet?.id ?? null} petName={petName} petImageUrl={pet?.profile_image_url ?? null} senderName={nickname} editable={editable} /></section><section className="home-feed-grid"><section className="content-block recent-diary"><div className="section-title"><b>최근 다이어리</b><button className="feed-refresh" onClick={onRefreshDiary}>새로고침</button></div><div className="recent-title-list">{diary.length ? diary.slice(0, 4).map((entry) => <p key={entry.id}>{entry.text}</p>) : <p>작성된 다이어리가 없습니다.</p>}</div></section><Guestbook guests={guests} text={guestText} setText={setGuestText} onSubmit={addGuest} onRefresh={onRefreshGuests} /></section></>; }
function PrivateProfileGate({ onLogin }: { onLogin: () => void }) { return <section className="content-block private-profile"><span>🔒</span><b>내 프로필은 로그인 후 확인할 수 있습니다.</b><button onClick={onLogin}>로그인</button></section>; }
function ProfileContent({ pets, featuredPet, nickname, bio, ownerImage, email, userId, themeColor, onThemeColor, onProfileChange, onAddPet, onFeaturedPet }: { pets: Pet[]; featuredPet: Pet | null; nickname: string; bio: string; ownerImage: string | null; email: string | null; userId: string; themeColor: string; onThemeColor: (color: string) => Promise<void>; onProfileChange: (nickname: string, image: string | null) => void; onAddPet: (input: NewDog) => Promise<void>; onFeaturedPet: (pet: Pet | null) => Promise<void> }) {
  const [adding, setAdding] = useState(false); const [settings, setSettings] = useState(false); const [editingName, setEditingName] = useState(false); const [confirmWithdraw, setConfirmWithdraw] = useState(false); const [uploadingPhoto, setUploadingPhoto] = useState(false); const [dogForm, setDogForm] = useState({ name: "", breed: "", birth_date: "", weight_kg: "", gender: "" as Pet["gender"] | "", neutering_status: "" as Pet["neutering_status"] | "", animal_registration_no: "" }); const [dogImage, setDogImage] = useState<File | null>(null); const [editNickname, setEditNickname] = useState(nickname); const [message, setMessage] = useState("");
  const dogImagePreview = useMemo(() => dogImage ? URL.createObjectURL(dogImage) : null, [dogImage]);
  useEffect(() => () => { if (dogImagePreview) URL.revokeObjectURL(dogImagePreview); }, [dogImagePreview]);
  async function saveNickname(event: FormEvent) { event.preventDefault(); const clean = editNickname.trim(); if (!clean) return; const supabase = getSupabaseBrowserClient(); const { error } = await supabase?.auth.updateUser({ data: { name: clean } }) ?? { error: new Error("로그인 정보가 없습니다.") }; if (error) { setMessage(error.message); return; } onProfileChange(clean, ownerImage); setEditingName(false); }
  async function changePhoto(file?: File) { if (!file) return; if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setMessage("5MB 이하 JPG, PNG, WEBP 이미지만 가능합니다."); return; } const supabase = getSupabaseBrowserClient(); if (!supabase) return; setMessage(""); setUploadingPhoto(true); try { const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"; const path = `${userId}/avatar/${crypto.randomUUID()}.${ext}`; const upload = await supabase.storage.from("dog-images").upload(path, file, { contentType: file.type }); if (upload.error) { setMessage(upload.error.message); return; } const imageUrl = supabase.storage.from("dog-images").getPublicUrl(path).data.publicUrl; const { error } = await supabase.auth.updateUser({ data: { avatar_url: imageUrl, avatar_storage_key: path } }); if (error) { setMessage(error.message); return; } onProfileChange(nickname, imageUrl); } finally { setUploadingPhoto(false); } }
  async function logout() { await getSupabaseBrowserClient()?.auth.signOut(); window.location.reload(); }
  async function withdraw() { const supabase = getSupabaseBrowserClient(); const session = (await supabase?.auth.getSession())?.data.session; if (!session) return; const response = await fetch("/api/account", { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } }); const result = await response.json(); if (!response.ok) { setMessage(result.error || "탈퇴하지 못했습니다."); return; } await supabase?.auth.signOut(); window.location.href = "/"; }
  return <section className="content-block profile-detail">
    <article className="owner-card"><div className="owner-avatar">{uploadingPhoto ? <span className="owner-photo-spinner" aria-label="프로필 사진 업로드 중" /> : ownerImage ? <img src={ownerImage} alt={`${nickname} 프로필`} /> : "👤"}<label className={`owner-photo-edit${uploadingPhoto ? " disabled" : ""}`} aria-label="프로필 사진 변경"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4.5 7.6 7H5a2 2 0 0 0-2 2v8.5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2.6L15 4.5H9Z"/><circle cx="12" cy="13" r="3.4"/></svg><input disabled={uploadingPhoto} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void changePhoto(event.target.files?.[0])} /></label></div><div><small>OWNER PROFILE</small>{editingName ? <form className="owner-name-form" onSubmit={saveNickname}><input autoFocus required maxLength={30} value={editNickname} onChange={(event) => setEditNickname(event.target.value)} /><button>저장</button></form> : <h2>{nickname}<button className="owner-name-edit" aria-label="닉네임 변경" onClick={() => setEditingName(true)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 16.8-.8 4 4-.8L18.6 8.6l-3.2-3.2L4 16.8Z"/><path d="m13.9 6.9 3.2 3.2"/></svg></button></h2>}<div className="owner-theme-colors" aria-label="메인 색상 선택">{themeColors.map((color) => <button key={color.value} type="button" className={themeColor === color.value ? "active" : ""} style={{ "--swatch-color": color.value } as CSSProperties} aria-label={color.name} title={color.name} onClick={() => void onThemeColor(color.value)} />)}</div><p>{bio}</p></div><button className="owner-gear" aria-label="계정 설정" onClick={() => setSettings(true)}>⚙</button></article>
    {settings && <div className="owner-settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettings(false); }}><section className="owner-settings-modal" role="dialog" aria-modal="true"><button className="owner-settings-close" onClick={() => setSettings(false)}>×</button><h3>계정 설정</h3><p>{email}</p>{confirmWithdraw ? <div className="withdraw-confirm"><b>회원 정보와 강아지 데이터가 모두 삭제됩니다.</b><button className="withdraw-button" onClick={() => void withdraw()}>회원탈퇴 확인</button><button onClick={() => setConfirmWithdraw(false)}>취소</button></div> : <div className="owner-account-actions"><button onClick={() => void logout()}>로그아웃</button><button className="withdraw-button" onClick={() => setConfirmWithdraw(true)}>회원탈퇴</button></div>}</section></div>}
    <div className="pet-list-head"><b>MY DOG</b><button onClick={() => setAdding((open) => !open)}>{adding ? "× 닫기" : "+ 강아지 추가"}</button></div>
    {adding && <form className="profile-card pet-add-card" onSubmit={async (event) => { event.preventDefault(); const name = dogForm.name.trim(); if (!name) { setMessage("이름을 입력해 주세요."); return; } try { await onAddPet({ name, breed: dogForm.breed.trim() || null, birth_date: dogForm.birth_date || null, weight_kg: dogForm.weight_kg ? Number(dogForm.weight_kg) : null, gender: dogForm.gender || "UNKNOWN", neutering_status: dogForm.neutering_status || "UNKNOWN", animal_registration_no: dogForm.animal_registration_no.trim() || null, image: dogImage }); setDogForm({ name: "", breed: "", birth_date: "", weight_kg: "", gender: "", neutering_status: "", animal_registration_no: "" }); setDogImage(null); setAdding(false); setMessage("강아지를 추가했습니다."); } catch (error) { setMessage(error instanceof Error ? error.message : "추가하지 못했습니다."); } }}><label className="pet-add-photo">{dogImagePreview ? <img src={dogImagePreview} alt="추가할 강아지 미리보기" /> : <span>사진 선택</span>}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setDogImage(event.target.files?.[0] ?? null)} /></label><dl><dt>이름 *</dt><dd><input required maxLength={30} value={dogForm.name} onChange={(event) => setDogForm({ ...dogForm, name: event.target.value })} /></dd><dt>견종</dt><dd><input maxLength={100} value={dogForm.breed} onChange={(event) => setDogForm({ ...dogForm, breed: event.target.value })} /></dd><dt>생일</dt><dd><input type="date" max={today} value={dogForm.birth_date} onChange={(event) => setDogForm({ ...dogForm, birth_date: event.target.value })} /></dd><dt>몸무게</dt><dd><input aria-label="몸무게(kg)" type="number" min="0.1" max="999" step="0.1" placeholder="kg" value={dogForm.weight_kg} onChange={(event) => setDogForm({ ...dogForm, weight_kg: event.target.value })} /></dd><dt>성별</dt><dd><select value={dogForm.gender} onChange={(event) => setDogForm({ ...dogForm, gender: event.target.value as Pet["gender"] })}><option value="">선택 안 함</option><option value="MALE">수컷</option><option value="FEMALE">암컷</option><option value="UNKNOWN">모름</option></select></dd><dt>중성화</dt><dd><select value={dogForm.neutering_status} onChange={(event) => setDogForm({ ...dogForm, neutering_status: event.target.value as Pet["neutering_status"] })}><option value="">선택 안 함</option><option value="NEUTERED">완료</option><option value="NOT_NEUTERED">미완료</option><option value="UNKNOWN">모름</option></select></dd><dt>등록번호</dt><dd><input maxLength={50} value={dogForm.animal_registration_no} onChange={(event) => setDogForm({ ...dogForm, animal_registration_no: event.target.value })} /></dd></dl><button className="pet-add-submit">추가하기</button></form>}
    {pets.length ? <div className="pet-profile-list">{pets.map((pet) => <article className={`profile-card ${featuredPet?.id === pet.id ? "featured" : ""}`} key={pet.id}><button className="pet-feature-toggle" disabled={featuredPet?.id === pet.id} onClick={async () => { try { await onFeaturedPet(pet); setMessage(""); } catch { setMessage("대표 강아지를 변경하지 못했습니다."); } }}>{featuredPet?.id === pet.id ? "대표 설정" : "대표로 설정"}</button><div>{pet.profile_image_url ? <img src={pet.profile_image_url} alt={`${pet.name} 프로필`} /> : <span>사진 없음</span>}</div><dl><dt>이름</dt><dd>{pet.name}</dd><dt>견종</dt><dd>{pet.breed || "미등록"}</dd><dt>생일</dt><dd>{pet.birth_date || "미등록"}</dd><dt>몸무게</dt><dd>{pet.weight_kg ? `${pet.weight_kg}kg` : "미등록"}</dd><dt>성별</dt><dd>{genderLabel(pet.gender)}</dd><dt>중성화</dt><dd>{neuteringLabel(pet.neutering_status)}</dd><dt>등록번호</dt><dd>{pet.animal_registration_no || "미등록"}</dd></dl></article>)}</div> : <p className="empty-pet">등록된 강아지가 없습니다.</p>}
  </section>;
}
function DiaryContent({ diary, text, setText, addDiary }: { diary: DiaryEntry[]; text: string; setText: (v: string) => void; addDiary: (files: File[]) => Promise<void> }) {
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);

  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);

  return <section className="content-block"><div className="section-title"><b>DIARY</b><span>하루 기록</span></div><form className="diary-form" onSubmit={async (event) => { event.preventDefault(); setSaving(true); setError(""); try { await addDiary(files); setFiles([]); } catch (reason) { setError(reason instanceof Error ? reason.message : "저장하지 못했습니다."); } finally { setSaving(false); } }}><textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={3000} placeholder="오늘의 이야기" /><div className="diary-form-meta"><span>{text.length}/3000</span><label className={`diary-photo-pick${files.length >= 5 ? " disabled" : ""}`}>사진 선택<input disabled={files.length >= 5} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => { const selected = Array.from(event.target.files ?? []); setFiles((current) => [...current, ...selected].slice(0, 5)); event.target.value = ""; }} /></label><span>{files.length}/5장</span></div>{previews.length > 0 && <div className="diary-photo-previews">{previews.map(({ file, url }, index) => <figure key={`${file.name}-${file.lastModified}-${index}`}><img src={url} alt={`${file.name} 미리보기`} /><button type="button" aria-label={`${file.name} 삭제`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}>×</button><figcaption>{file.name}</figcaption></figure>)}</div>}<button disabled={saving || !text.trim()}>{saving ? "올리는 중…" : "기록하기"}</button>{error && <p className="form-error">{error}</p>}</form><div className="diary-list">{diary.map((entry) => <article key={entry.id}><time>{entry.date}</time><p>{entry.text}</p>{entry.images.length > 0 && <div className="diary-entry-images">{entry.images.map((image) => <img key={image.id} src={image.image_url} alt="다이어리 첨부 사진" />)}</div>}</article>)}</div></section>;
}
function PhotosContent({ albums }: { albums: PhotoAlbum[] }) { const diaryAlbums = albums.filter((album) => album.diary_id && album.photo_album_images.length); return <section className="content-block"><div className="section-title"><b>PHOTO ALBUM</b><span>다이어리별 사진</span></div>{diaryAlbums.length ? <div className="photo-album-list">{diaryAlbums.map((album) => <article key={album.id}><header><b>다이어리 사진</b><time>{new Intl.DateTimeFormat("ko-KR").format(new Date(album.created_at))}</time></header>{album.caption && <p>{album.caption}</p>}<div>{album.photo_album_images.map((image) => <img key={image.id} src={image.image_url} alt={album.caption || "다이어리 사진"} />)}</div></article>)}</div> : <p className="empty-pet">다이어리에 첨부된 사진이 없습니다.</p>}</section>; }
function Guestbook({ guests, text, setText, onSubmit, onRefresh }: { guests: GuestEntry[]; text: string; setText: (v: string) => void; onSubmit: (e: FormEvent) => void; onRefresh?: () => void }) { return <section className="content-block recent-guestbook"><div className="section-title"><b>최근 방명록</b>{onRefresh ? <button className="feed-refresh" onClick={onRefresh}>새로고침</button> : <span>한마디 남겨주세요</span>}</div><form className="guest-form" onSubmit={onSubmit}><input value={text} maxLength={100} onChange={(e) => setText(e.target.value)} placeholder="방명록을 남겨주세요 (100자)" /><button>남기기</button></form><div className="recent-title-list">{guests.slice(0, 4).map((entry) => <p key={entry.id}>{entry.text}</p>)}</div></section>; }

function toDateKey(date: Date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, "0"); const day = String(date.getDate()).padStart(2, "0"); return `${year}-${month}-${day}`; }
function formatTodoDate(date: string) { const [year, month, day] = date.split("-"); return `${year.slice(-2)}.${month}.${day}`; }
function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function calendarDays(month: Date) { const blanks = Array<string | null>(new Date(month.getFullYear(), month.getMonth(), 1).getDay()).fill(null); const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); return [...blanks, ...Array.from({ length: count }, (_, i) => toDateKey(new Date(month.getFullYear(), month.getMonth(), i + 1)))]; }
function safeRead<T>(key: string, fallback: T): T { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } }
function mapDog(row: DogRow): Pet { const images = [...(row.dog_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order); return { id: row.id, name: row.name, breed: row.breed, birth_date: row.birth_date, weight_kg: row.weight_kg, gender: row.gender, neutering_status: row.neutering_status, animal_registration_no: row.animal_registration_no, profile_image_url: images[0]?.image_url ?? null }; }
function genderLabel(value: Pet["gender"]) { return value === "MALE" ? "수컷" : value === "FEMALE" ? "암컷" : "모름"; }
function neuteringLabel(value: Pet["neutering_status"]) { return value === "NEUTERED" ? "완료" : value === "NOT_NEUTERED" ? "미완료" : "모름"; }
