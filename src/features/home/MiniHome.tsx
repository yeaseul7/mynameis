"use client";

import Link from "next/link";
import { CSSProperties, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { MiniRoom } from "./MiniRoom";
import { LoginModal } from "@/components/LoginModal";

type Tab = "home" | "profile" | "diary" | "photos";
type AlbumImage = { id: string; image_url: string; sort_order: number };
type PhotoAlbum = { id: string; diary_id: string | null; caption: string; created_at: string; photo_album_images: AlbumImage[] };
type DiaryEntry = { id: string; date: string; dateKey: string; text: string; images: AlbumImage[] };
type DiaryComment = { id: string; diary_id: string; author_id: string; author_name: string; parent_id: string | null; content: string; created_at: string };
type GuestEntry = { id: number; name: string; text: string };
type Todo = { id?: string; todo_date: string; title: string; completed: boolean };
const dogAvatars = [
  { key: "maltese", name: "말티즈", url: "/dog-avatars/maltese.png" },
  { key: "poodle", name: "푸들", url: "/dog-avatars/poodle.png" },
  { key: "pomeranian", name: "포메라니안", url: "/dog-avatars/pomeranian.png" },
  { key: "bichon", name: "비숑", url: "/dog-avatars/bichon.png" },
  { key: "shih-tzu", name: "시츄", url: "/dog-avatars/shih-tzu.png" },
] as const;
type DogAvatarKey = (typeof dogAvatars)[number]["key"];
type Pet = { id: string; name: string; breed: string | null; birth_date: string | null; weight_kg: number | null; gender: "MALE" | "FEMALE" | "UNKNOWN"; neutering_status: "NEUTERED" | "NOT_NEUTERED" | "UNKNOWN"; animal_registration_no: string | null; avatar_key: DogAvatarKey; profile_image_url: string | null };
type DogRow = Omit<Pet, "profile_image_url"> & { dog_images?: { image_url: string; is_primary: boolean; sort_order: number }[] };
type NewDog = Omit<Pet, "id" | "profile_image_url" | "avatar_key"> & { image: File | null };

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
  const [selectedDiaryId, setSelectedDiaryId] = useState<string | null>(null);
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
    const normalizedAlbums = ((albumRows ?? []) as unknown as PhotoAlbum[]).map((album) => ({ ...album, photo_album_images: [...(album.photo_album_images ?? [])].sort((a, b) => a.sort_order - b.sort_order) }));
    const mapped = ((entries ?? []) as unknown as { id: string; content: string; created_at: string }[]).map((entry) => ({ id: entry.id, text: entry.content, date: toDateKey(new Date(entry.created_at)).replaceAll("-", "."), dateKey: toDateKey(new Date(entry.created_at)), images: normalizedAlbums.filter((album) => album.diary_id === entry.id).flatMap((album) => album.photo_album_images).sort((a, b) => a.sort_order - b.sort_order) }));
    setDiary(mapped); setAlbums(normalizedAlbums);
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
        void supabase.from("dogs").select("id,name,breed,birth_date,weight_kg,gender,neutering_status,animal_registration_no,avatar_key,dog_images(image_url,is_primary,sort_order)").eq("owner_id", id).order("created_at").then(({ data: dogs }) => {
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
      const { data: dogs } = await supabase.from("dogs").select("id,name,breed,birth_date,weight_kg,gender,neutering_status,animal_registration_no,avatar_key,dog_images(image_url,is_primary,sort_order)").eq("owner_id", id).order("created_at");
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
      const { data, error } = await supabase.from("dogs").insert({ owner_id: userId, ...dogInput, breed: dogInput.breed || "미등록", avatar_key: "maltese" }).select("id,name,breed,birth_date,weight_kg,gender,neutering_status,animal_registration_no,avatar_key").single();
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

  async function setDogAvatar(dogId: string, avatarKey: DogAvatarKey) {
    const supabase = getSupabaseBrowserClient();
    if (!userId || !supabase) return;
    const { error } = await supabase.from("dogs").update({ avatar_key: avatarKey }).eq("id", dogId).eq("owner_id", userId);
    if (error) throw error;
    setPets((current) => current.map((item) => item.id === dogId ? { ...item, avatar_key: avatarKey } : item));
    setPet((current) => current?.id === dogId ? { ...current, avatar_key: avatarKey } : current);
  }

  async function updatePet(dogId: string, changes: Pick<Pet, "name" | "breed" | "birth_date" | "weight_kg" | "gender" | "neutering_status" | "animal_registration_no">) {
    const supabase = getSupabaseBrowserClient();
    if (!userId || !supabase) return;
    const { error } = await supabase.from("dogs").update(changes).eq("id", dogId).eq("owner_id", userId);
    if (error) throw error;
    setPets((current) => current.map((item) => item.id === dogId ? { ...item, ...changes } : item));
    setPet((current) => current?.id === dogId ? { ...current, ...changes } : current);
  }

  async function changeThemeColor(color: string) { const supabase = getSupabaseBrowserClient(); if (!supabase || !userId) return; const { error } = await supabase.auth.updateUser({ data: { theme_color: color } }); if (error) throw error; setThemeColor(color); }
  async function logoutUser() { await getSupabaseBrowserClient()?.auth.signOut(); window.location.reload(); }

  const petName = pet?.name ?? "";
  const displayNickname = nickname.replace(/네$/, "");
  const worldHref = pet ? `/world?petId=${encodeURIComponent(pet.id)}&petName=${encodeURIComponent(petName)}` : "#";

  return <main className="mini-page" style={{ "--theme-color": themeColor } as CSSProperties}><section className="mini-shell">
    <div className="mini-counter"><span><em>TODAY</em><b>–</b></span><span><em>TOTAL</em><strong>–</strong></span></div><header className="mini-title"><b>{displayNickname ? `${displayNickname}의 멍디어리` : "멍디어리"}</b>{!authLoading && (userId ? <button className="mini-title-logout" onClick={() => void logoutUser()}>로그아웃</button> : <button className="mini-title-logout" onClick={() => setLoginOpen(true)}>로그인</button>)}</header>
    <div className="binder-rings" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <i key={index} />)}</div>
    <aside className="mini-profile"><div className={`dog-photo ${pet?.profile_image_url || ownerImage ? "" : "empty"}`}>{(pet?.profile_image_url ?? ownerImage) ? <img src={(pet?.profile_image_url ?? ownerImage)!} alt={pet ? `${petName} 프로필` : `${displayNickname} 프로필`} /> : <span className="profile-empty">{pet ? "강아지 사진 없음" : "사용자 사진 없음"}</span>}</div>
      <TodoPanel todos={todos} selectedDate={selectedDate} todoTitle={todoTitle} month={calendarMonth} onSelect={setSelectedDate} onTitle={setTodoTitle} onSave={saveTodo} onToggle={toggleTodo} onMonth={async (month) => { setCalendarMonth(month); await loadTodos(userId, month); }} />
    </aside>
    <section className="mini-content">{authLoading ? <section className="content-block private-profile">불러오는 중…</section> : <>{tab === "home" && <HomeContent diary={diary} guests={guests} guestText={guestText} setGuestText={setGuestText} addGuest={addGuest} pet={pet} petName={petName} nickname={nickname} editable={!pet || Boolean(userId)} onRefreshDiary={() => userId ? void loadDiaryAndAlbums(userId) : undefined} onRefreshGuests={() => setGuests(safeRead("mynameis-guests", []))} />}{tab === "profile" && (userId ? <ProfileContent pets={pets} featuredPet={pet} nickname={displayNickname} bio={ownerBio} ownerImage={ownerImage} email={userEmail} userId={userId} themeColor={themeColor} onThemeColor={changeThemeColor} onProfileChange={(nextName, nextImage) => { setNickname(nextName); setOwnerImage(nextImage); }} onAddPet={addPet} onFeaturedPet={setFeaturedPet} onDogAvatar={setDogAvatar} onUpdatePet={updatePet} /> : <PrivateProfileGate onLogin={() => setLoginOpen(true)} />)}{tab === "diary" && (userId ? <DiaryContent diary={diary} text={diaryText} setText={setDiaryText} addDiary={addDiary} selectedEntryId={selectedDiaryId} onSelectEntry={setSelectedDiaryId} userId={userId} nickname={displayNickname} /> : <PrivateProfileGate onLogin={() => setLoginOpen(true)} />)}{tab === "photos" && (userId ? <PhotosContent albums={albums} onOpenDiary={(diaryId) => { setSelectedDiaryId(diaryId); setTab("diary"); }} /> : <PrivateProfileGate onLogin={() => setLoginOpen(true)} />)}</>}</section>
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

function HomeContent({ diary, guests, guestText, setGuestText, addGuest, pet, petName, nickname, editable, onRefreshDiary, onRefreshGuests }: { diary: DiaryEntry[]; guests: GuestEntry[]; guestText: string; setGuestText: (v: string) => void; addGuest: (e: FormEvent) => void; pet: Pet | null; petName: string; nickname: string; editable: boolean; onRefreshDiary: () => void; onRefreshGuests: () => void }) { return <><section className="content-block playground-block"><MiniRoom petId={pet?.id ?? null} petName={petName} petImageUrl={pet?.profile_image_url ?? null} petAvatarKey={pet?.avatar_key ?? "maltese"} senderName={nickname} editable={editable} /></section><section className="home-feed-grid"><section className="content-block recent-diary"><div className="section-title"><b>최근 다이어리</b><button className="feed-refresh" onClick={onRefreshDiary}>새로고침</button></div><div className="recent-title-list">{diary.length ? diary.slice(0, 4).map((entry) => <p key={entry.id}>{entry.text}</p>) : <p>작성된 다이어리가 없습니다.</p>}</div></section><Guestbook guests={guests} text={guestText} setText={setGuestText} onSubmit={addGuest} onRefresh={onRefreshGuests} /></section></>; }
function PrivateProfileGate({ onLogin }: { onLogin: () => void }) { return <section className="content-block private-profile"><span>🔒</span><b>내 프로필은 로그인 후 확인할 수 있습니다.</b><button onClick={onLogin}>로그인</button></section>; }
function ProfileContent({ pets, featuredPet, nickname, bio, ownerImage, email, userId, themeColor, onThemeColor, onProfileChange, onAddPet, onFeaturedPet, onDogAvatar, onUpdatePet }: { pets: Pet[]; featuredPet: Pet | null; nickname: string; bio: string; ownerImage: string | null; email: string | null; userId: string; themeColor: string; onThemeColor: (color: string) => Promise<void>; onProfileChange: (nickname: string, image: string | null) => void; onAddPet: (input: NewDog) => Promise<void>; onFeaturedPet: (pet: Pet | null) => Promise<void>; onDogAvatar: (dogId: string, avatarKey: DogAvatarKey) => Promise<void>; onUpdatePet: (dogId: string, changes: Pick<Pet, "name" | "breed" | "birth_date" | "weight_kg" | "gender" | "neutering_status" | "animal_registration_no">) => Promise<void> }) {
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
    {pets.length ? <div className="pet-profile-list">{pets.map((pet) => <PetProfileCard key={pet.id} pet={pet} featured={featuredPet?.id === pet.id} onFeaturedPet={onFeaturedPet} onDogAvatar={onDogAvatar} onUpdatePet={onUpdatePet} onMessage={setMessage} />)}</div> : <p className="empty-pet">등록된 강아지가 없습니다.</p>}
  </section>;
}

function PetProfileCard({ pet, featured, onFeaturedPet, onDogAvatar, onUpdatePet, onMessage }: { pet: Pet; featured: boolean; onFeaturedPet: (pet: Pet | null) => Promise<void>; onDogAvatar: (dogId: string, avatarKey: DogAvatarKey) => Promise<void>; onUpdatePet: (dogId: string, changes: Pick<Pet, "name" | "breed" | "birth_date" | "weight_kg" | "gender" | "neutering_status" | "animal_registration_no">) => Promise<void>; onMessage: (message: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: pet.name, breed: pet.breed ?? "", birth_date: pet.birth_date ?? "", weight_kg: pet.weight_kg?.toString() ?? "", gender: pet.gender, neutering_status: pet.neutering_status, animal_registration_no: pet.animal_registration_no ?? "" });

  useEffect(() => setForm({ name: pet.name, breed: pet.breed ?? "", birth_date: pet.birth_date ?? "", weight_kg: pet.weight_kg?.toString() ?? "", gender: pet.gender, neutering_status: pet.neutering_status, animal_registration_no: pet.animal_registration_no ?? "" }), [pet]);

  async function save(event: FormEvent) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) { onMessage("이름을 입력해 주세요."); return; }
    setSaving(true);
    try {
      await onUpdatePet(pet.id, { name, breed: form.breed.trim() || null, birth_date: form.birth_date || null, weight_kg: form.weight_kg ? Number(form.weight_kg) : null, gender: form.gender, neutering_status: form.neutering_status, animal_registration_no: form.animal_registration_no.trim() || null });
      setEditing(false); onMessage("강아지 프로필을 수정했습니다.");
    } catch { onMessage("강아지 프로필을 수정하지 못했습니다."); }
    finally { setSaving(false); }
  }

  return <article className={`profile-card ${featured ? "featured" : ""}`}>
    <div className="pet-card-actions"><button className="pet-feature-toggle" disabled={featured} onClick={async () => { try { await onFeaturedPet(pet); onMessage(""); } catch { onMessage("대표 강아지를 변경하지 못했습니다."); } }}>{featured ? "대표 설정" : "대표로 설정"}</button><button className="pet-edit-toggle" onClick={() => setEditing((value) => !value)}>{editing ? "취소" : "수정"}</button></div>
    <div>{pet.profile_image_url ? <img src={pet.profile_image_url} alt={`${pet.name} 프로필`} /> : <span>사진 없음</span>}</div>
    {editing ? <form className="pet-edit-form" onSubmit={save}><label>이름 *<input required maxLength={30} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>견종<input maxLength={100} value={form.breed} onChange={(event) => setForm({ ...form, breed: event.target.value })} /></label><label>생일<input type="date" max={today} value={form.birth_date} onChange={(event) => setForm({ ...form, birth_date: event.target.value })} /></label><label>몸무게<input type="number" min="0.1" max="999" step="0.1" value={form.weight_kg} onChange={(event) => setForm({ ...form, weight_kg: event.target.value })} /></label><label>성별<select value={form.gender} onChange={(event) => setForm({ ...form, gender: event.target.value as Pet["gender"] })}><option value="MALE">수컷</option><option value="FEMALE">암컷</option><option value="UNKNOWN">모름</option></select></label><label>중성화<select value={form.neutering_status} onChange={(event) => setForm({ ...form, neutering_status: event.target.value as Pet["neutering_status"] })}><option value="NEUTERED">완료</option><option value="NOT_NEUTERED">미완료</option><option value="UNKNOWN">모름</option></select></label><label>등록번호<input maxLength={50} value={form.animal_registration_no} onChange={(event) => setForm({ ...form, animal_registration_no: event.target.value })} /></label><button disabled={saving}>{saving ? "저장 중…" : "저장"}</button></form> : <dl><dt>이름</dt><dd>{pet.name}</dd><dt>견종</dt><dd>{pet.breed || "미등록"}</dd><dt>생일</dt><dd>{pet.birth_date || "미등록"}</dd><dt>몸무게</dt><dd>{pet.weight_kg ? `${pet.weight_kg}kg` : "미등록"}</dd><dt>성별</dt><dd>{genderLabel(pet.gender)}</dd><dt>중성화</dt><dd>{neuteringLabel(pet.neutering_status)}</dd><dt>등록번호</dt><dd>{pet.animal_registration_no || "미등록"}</dd></dl>}
    <fieldset className="dog-avatar-picker"><legend>강아지 캐릭터</legend>{dogAvatars.map((avatar) => <button key={avatar.key} type="button" className={pet.avatar_key === avatar.key ? "active" : ""} aria-label={`${avatar.name} 캐릭터 선택`} aria-pressed={pet.avatar_key === avatar.key} onClick={async () => { try { await onDogAvatar(pet.id, avatar.key); onMessage("캐릭터를 저장했습니다."); } catch { onMessage("캐릭터를 저장하지 못했습니다."); } }}><img src={avatar.url} alt="" draggable={false} /><small>{avatar.name}</small></button>)}</fieldset>
  </article>;
}

function DiaryContent({ diary, text, setText, addDiary, selectedEntryId, onSelectEntry, userId, nickname }: { diary: DiaryEntry[]; text: string; setText: (v: string) => void; addDiary: (files: File[]) => Promise<void>; selectedEntryId: string | null; onSelectEntry: (id: string | null) => void; userId: string; nickname: string }) {
  const [files, setFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPhotos, setShowPhotos] = useState(false);
  const [view, setView] = useState<"list" | "calendar">("list");
  const [page, setPage] = useState(1);
  const [diaryMonth, setDiaryMonth] = useState(startOfMonth(new Date()));
  const [selectedDiaryDate, setSelectedDiaryDate] = useState(today);
  const previews = useMemo(() => files.map((file) => ({ file, url: URL.createObjectURL(file) })), [files]);
  const pageCount = Math.max(1, Math.ceil(diary.length / 5));
  const pagedDiary = diary.slice((page - 1) * 5, page * 5);
  const diaryCalendarDays = useMemo(() => calendarDays(diaryMonth), [diaryMonth]);
  const selectedDiary = diary.filter((entry) => entry.dateKey === selectedDiaryDate);
  const selectedEntry = diary.find((entry) => entry.id === selectedEntryId) ?? null;

  useEffect(() => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)), [previews]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  if (selectedEntry) return <section className="content-block diary-detail-page"><div className="section-title"><b>DIARY DETAIL</b><button className="diary-detail-back" type="button" onClick={() => onSelectEntry(null)}>← 목록으로</button></div><article className="diary-detail"><time>{selectedEntry.date}</time><p>{selectedEntry.text}</p>{selectedEntry.images.length > 0 && <div className="diary-entry-images">{selectedEntry.images.map((image) => <img key={image.id} src={image.image_url} alt="다이어리 첨부 사진" />)}</div>}</article><DiaryComments diaryId={selectedEntry.id} userId={userId} nickname={nickname} /></section>;

  return <div className="diary-page">
    <section className="content-block diary-compose"><div className="section-title"><b>DIARY WRITE</b><span>오늘의 기록 작성</span></div><form className="diary-form" onSubmit={async (event) => { event.preventDefault(); setSaving(true); setError(""); try { await addDiary(files); setFiles([]); } catch (reason) { setError(reason instanceof Error ? reason.message : "저장하지 못했습니다."); } finally { setSaving(false); } }}><textarea value={text} onChange={(event) => setText(event.target.value)} maxLength={3000} placeholder="오늘의 이야기" /><div className="diary-form-footer"><button className="diary-photo-toggle" type="button" aria-expanded={showPhotos} onClick={() => setShowPhotos((open) => !open)}>사진 추가 <span aria-hidden="true">{showPhotos ? "⌃" : "⌄"}</span></button><div className="diary-save-stack"><span>{text.length}/3000</span><button disabled={saving || !text.trim()}>{saving ? "올리는 중…" : "기록하기"}</button></div></div>{showPhotos && <div className="diary-photo-previews">{Array.from({ length: 5 }, (_, index) => { const preview = previews[index]; return preview ? <figure key={`${preview.file.name}-${preview.file.lastModified}-${index}`}><img src={preview.url} alt={`${preview.file.name} 미리보기`} /><button type="button" aria-label={`${preview.file.name} 삭제`} onClick={() => setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index))}>×</button><figcaption>{preview.file.name}</figcaption></figure> : <label className="diary-photo-slot" key={`empty-${index}`}><span aria-hidden="true">＋</span><b>사진 선택</b><input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => { const selected = Array.from(event.target.files ?? []); setFiles((current) => [...current, ...selected].slice(0, 5)); event.target.value = ""; }} /></label>; })}</div>}{error && <p className="form-error">{error}</p>}</form></section>
    <section className="content-block diary-archive">
      <div className="section-title">
        <b>DIARY LIST</b>
        <div className="diary-view-tabs" role="group" aria-label="다이어리 보기 방식">
          <button type="button" className={view === "list" ? "active" : ""} aria-label="목록형으로 보기" title="목록형" aria-pressed={view === "list"} onClick={() => setView("list")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></svg></button>
          <button type="button" className={view === "calendar" ? "active" : ""} aria-label="달력형으로 보기" title="달력형" aria-pressed={view === "calendar"} onClick={() => setView("calendar")}><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2"/></svg></button>
        </div>
      </div>
      {view === "list" ? <>
        <div className="diary-list">{diary.length ? pagedDiary.map((entry) => <article className="diary-list-entry" key={entry.id} role="link" tabIndex={0} aria-label={`${entry.date} 다이어리 상세 보기`} onClick={() => onSelectEntry(entry.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onSelectEntry(entry.id); } }}><time>{entry.images.length > 0 && <svg className="diary-list-photo-indicator" viewBox="0 0 24 24" role="img" aria-label="사진 첨부됨"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="8.5" cy="10" r="1.5"/><path d="m5 17 4.5-4 3 2.5 2.5-2 4 3.5"/></svg>}{entry.date}</time><p>{entry.text.length > 50 ? `${entry.text.slice(0, 50)}...` : entry.text}</p></article>) : <p className="diary-empty">작성된 다이어리가 없습니다.</p>}</div>
        {diary.length > 0 && <nav className="diary-pagination" aria-label="다이어리 페이지"><button type="button" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>‹</button>{Array.from({ length: pageCount }, (_, index) => <button type="button" key={index + 1} className={page === index + 1 ? "active" : ""} aria-current={page === index + 1 ? "page" : undefined} onClick={() => setPage(index + 1)}>{index + 1}</button>)}<button type="button" disabled={page === pageCount} onClick={() => setPage((current) => current + 1)}>›</button></nav>}
      </> : <div className="diary-calendar-view">
        <header><button type="button" onClick={() => setDiaryMonth(new Date(diaryMonth.getFullYear(), diaryMonth.getMonth() - 1, 1))}>‹</button><b>{diaryMonth.getFullYear()}. {diaryMonth.getMonth() + 1}</b><button type="button" onClick={() => setDiaryMonth(new Date(diaryMonth.getFullYear(), diaryMonth.getMonth() + 1, 1))}>›</button></header>
        <div className="diary-calendar"><b>일</b><b>월</b><b>화</b><b>수</b><b>목</b><b>금</b><b>토</b>{diaryCalendarDays.map((day, index) => day ? <button type="button" key={day} className={`${selectedDiaryDate === day ? "selected" : ""} ${diary.some((entry) => entry.dateKey === day) ? "has-entry" : ""}`} onClick={() => setSelectedDiaryDate(day)}><span>{Number(day.slice(-2))}</span>{diary.some((entry) => entry.dateKey === day) && <i aria-label="다이어리 있음">●</i>}</button> : <span key={`blank-${index}`} />)}</div>
        <div className="diary-day-entries"><b>{selectedDiaryDate}</b>{selectedDiary.length ? selectedDiary.map((entry) => <article key={entry.id}><p>{entry.text}</p>{entry.images.length > 0 && <div className="diary-entry-images">{entry.images.map((image) => <img key={image.id} src={image.image_url} alt="다이어리 첨부 사진" />)}</div>}</article>) : <p className="diary-empty">이 날짜에 작성된 다이어리가 없습니다.</p>}</div>
      </div>}
    </section>
  </div>;
}

function DiaryComments({ diaryId, userId, nickname }: { diaryId: string; userId: string; nickname: string }) {
  const [comments, setComments] = useState<DiaryComment[]>([]);
  const [content, setContent] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadComments = useCallback(async () => {
    const supabase = getSupabaseBrowserClient(); if (!supabase) return;
    const { data, error: loadError } = await supabase.from("diary_comments").select("id,diary_id,author_id,author_name,parent_id,content,created_at").eq("diary_id", diaryId).order("created_at", { ascending: true });
    if (loadError) { setError("댓글을 불러오지 못했습니다. 데이터베이스 마이그레이션을 확인해 주세요."); return; }
    setComments((data as DiaryComment[] | null) ?? []);
  }, [diaryId]);

  useEffect(() => { void loadComments(); }, [loadComments]);

  async function submitComment(event: FormEvent, parentId: string | null) {
    event.preventDefault();
    const value = (parentId ? replyContent : content).trim();
    if (!value || value.length > 500) return;
    const supabase = getSupabaseBrowserClient(); if (!supabase) return;
    setSaving(true); setError("");
    const { error: insertError } = await supabase.from("diary_comments").insert({ diary_id: diaryId, author_id: userId, author_name: nickname || "사용자", parent_id: parentId, content: value });
    setSaving(false);
    if (insertError) { setError("댓글을 등록하지 못했습니다."); return; }
    if (parentId) { setReplyContent(""); setReplyTo(null); } else setContent("");
    await loadComments();
  }

  const roots = comments.filter((comment) => !comment.parent_id);
  return <section className="diary-comments" aria-label="댓글"><h3>댓글 <span>{comments.length}</span></h3><form className="diary-comment-form" onSubmit={(event) => void submitComment(event, null)}><input value={content} maxLength={500} placeholder="댓글을 입력하세요" aria-label="댓글 내용" onChange={(event) => setContent(event.target.value)} /><button disabled={saving || !content.trim()}>등록</button></form>{error && <p className="form-error">{error}</p>}<div className="diary-comment-list">{roots.length ? roots.map((comment) => <article key={comment.id} className="diary-comment"><header><b>{comment.author_name}</b><time>{formatCommentDate(comment.created_at)}</time></header><p>{comment.content}</p><button type="button" className="diary-reply-toggle" aria-expanded={replyTo === comment.id} onClick={() => { setReplyTo((current) => current === comment.id ? null : comment.id); setReplyContent(""); }}>답글</button>{replyTo === comment.id && <form className="diary-comment-form diary-reply-form" onSubmit={(event) => void submitComment(event, comment.id)}><input autoFocus value={replyContent} maxLength={500} placeholder="답글을 입력하세요" aria-label={`${comment.author_name}님에게 답글`} onChange={(event) => setReplyContent(event.target.value)} /><button disabled={saving || !replyContent.trim()}>등록</button></form>}{comments.filter((reply) => reply.parent_id === comment.id).map((reply) => <article key={reply.id} className="diary-reply"><header><b>{reply.author_name}</b><time>{formatCommentDate(reply.created_at)}</time></header><p>{reply.content}</p></article>)}</article>) : <p className="diary-comment-empty">첫 댓글을 남겨보세요.</p>}</div></section>;
}

function PhotosContent({ albums, onOpenDiary }: { albums: PhotoAlbum[]; onOpenDiary: (diaryId: string) => void }) { const images = albums.flatMap((album) => album.diary_id ? album.photo_album_images.map((image) => ({ ...image, diaryId: album.diary_id! })) : []); return <section className="content-block"><div className="section-title"><b>PHOTO ALBUM</b></div>{images.length ? <div className="photos-only-grid">{images.map((image) => <button type="button" key={image.id} aria-label="사진이 포함된 다이어리 열기" onClick={() => onOpenDiary(image.diaryId)}><img src={image.image_url} alt="다이어리 사진" /></button>)}</div> : <p className="empty-pet">다이어리에 첨부된 사진이 없습니다.</p>}</section>; }
function Guestbook({ guests, text, setText, onSubmit, onRefresh }: { guests: GuestEntry[]; text: string; setText: (v: string) => void; onSubmit: (e: FormEvent) => void; onRefresh?: () => void }) { return <section className="content-block recent-guestbook"><div className="section-title"><b>최근 방명록</b>{onRefresh ? <button className="feed-refresh" onClick={onRefresh}>새로고침</button> : <span>한마디 남겨주세요</span>}</div><form className="guest-form" onSubmit={onSubmit}><input value={text} maxLength={100} onChange={(e) => setText(e.target.value)} placeholder="방명록을 남겨주세요 (100자)" /><button>남기기</button></form><div className="recent-title-list">{guests.slice(0, 4).map((entry) => <p key={entry.id}>{entry.text}</p>)}</div></section>; }

function toDateKey(date: Date) { const year = date.getFullYear(); const month = String(date.getMonth() + 1).padStart(2, "0"); const day = String(date.getDate()).padStart(2, "0"); return `${year}-${month}-${day}`; }
function formatCommentDate(value: string) { return new Intl.DateTimeFormat("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
function formatTodoDate(date: string) { const [year, month, day] = date.split("-"); return `${year.slice(-2)}.${month}.${day}`; }
function startOfMonth(date: Date) { return new Date(date.getFullYear(), date.getMonth(), 1); }
function calendarDays(month: Date) { const blanks = Array<string | null>(new Date(month.getFullYear(), month.getMonth(), 1).getDay()).fill(null); const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate(); return [...blanks, ...Array.from({ length: count }, (_, i) => toDateKey(new Date(month.getFullYear(), month.getMonth(), i + 1)))]; }
function safeRead<T>(key: string, fallback: T): T { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; } catch { return fallback; } }
function mapDog(row: DogRow): Pet { const images = [...(row.dog_images ?? [])].sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.sort_order - b.sort_order); return { id: row.id, name: row.name, breed: row.breed, birth_date: row.birth_date, weight_kg: row.weight_kg, gender: row.gender, neutering_status: row.neutering_status, animal_registration_no: row.animal_registration_no, avatar_key: dogAvatars.some((avatar) => avatar.key === row.avatar_key) ? row.avatar_key : "maltese", profile_image_url: images[0]?.image_url ?? null }; }
function genderLabel(value: Pet["gender"]) { return value === "MALE" ? "수컷" : value === "FEMALE" ? "암컷" : "모름"; }
function neuteringLabel(value: Pet["neutering_status"]) { return value === "NEUTERED" ? "완료" : value === "NOT_NEUTERED" ? "미완료" : "모름"; }
