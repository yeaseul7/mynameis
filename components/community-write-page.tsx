"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { RiArrowLeftLine, RiCloseLine, RiImageAddLine } from "react-icons/ri";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { invokeFunction } from "@/lib/supabase/functions";

export function CommunityWriteSkeleton() {
  return <main className="community-write-page community-write-skeleton" aria-busy="true" aria-label="새 글쓰기 화면을 불러오는 중">
    <section className="community-write-form">
      <header>
        <span className="skeleton-line community-write-skeleton-back" />
        <span className="skeleton-line community-write-skeleton-title" />
        <span className="skeleton-line community-write-skeleton-description" />
      </header>
      <div className="community-write-skeleton-field"><span className="skeleton-line" /><span className="skeleton-card community-write-skeleton-input" /></div>
      <div className="community-write-skeleton-field"><span className="skeleton-line" /><span className="skeleton-card community-write-skeleton-textarea" /></div>
      <div className="community-write-skeleton-field"><span className="skeleton-line" /><div className="community-write-skeleton-images">{Array.from({ length: 5 }, (_, index) => <span className="skeleton-card community-write-skeleton-image" key={index} />)}</div></div>
      <div className="community-write-skeleton-field"><span className="skeleton-line" /><div className="community-write-skeleton-options"><span className="skeleton-card" /><span className="skeleton-card" /></div></div>
      <div className="community-write-skeleton-actions"><span className="skeleton-pill" /><span className="skeleton-pill" /></div>
    </section>
  </main>;
}

export function CommunityWritePage() {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState<Array<{ file: File; preview: string } | null>>(() => Array(5).fill(null));
  const attachmentsRef = useRef(attachments);
  attachmentsRef.current = attachments;

  useEffect(() => () => { attachmentsRef.current.forEach((item) => { if (item) URL.revokeObjectURL(item.preview); }); }, []);

  function selectImage(index: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (file && (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024)) {
      event.target.value = "";
      setMessage("사진은 8MB 이하의 이미지 파일만 등록할 수 있어요.");
      return;
    }
    if (!file) return;
    setMessage("");
    setAttachments((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      if (item) URL.revokeObjectURL(item.preview);
      return { file, preview: URL.createObjectURL(file) };
    }));
    event.target.value = "";
  }

  function removeImage(index: number) {
    setAttachments((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      if (item) URL.revokeObjectURL(item.preview);
      return null;
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const values = new FormData(event.currentTarget);
    setSaving(true);
    setMessage("");
    const uploadedPaths: string[] = [];
    try {
      const files = attachments.flatMap((item) => item ? [item.file] : []);
      const imageUrls: string[] = [];
      if (files.length) {
        const supabase = createBrowserSupabaseClient();
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error("로그인이 필요해요.");
        for (const file of files) {
          const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
          const uploadedPath = `${auth.user.id}/${crypto.randomUUID()}.${extension}`;
          const { error } = await supabase.storage.from("community-images").upload(uploadedPath, file, { contentType: file.type, upsert: false });
          if (error) throw error;
          uploadedPaths.push(uploadedPath);
          imageUrls.push(supabase.storage.from("community-images").getPublicUrl(uploadedPath).data.publicUrl);
        }
      }
      const post = await invokeFunction<{ slug: string }>("community", {
        action: "create",
        title: String(values.get("title") ?? ""),
        content: String(values.get("content") ?? ""),
        visibility: String(values.get("visibility") ?? "PUBLIC"),
        imageUrls,
      });
      location.replace(`/community/${post.slug}`);
    } catch (error) {
      if (uploadedPaths.length) await createBrowserSupabaseClient().storage.from("community-images").remove(uploadedPaths);
      setMessage(error instanceof Error ? error.message : "글을 등록하지 못했어요.");
      setSaving(false);
    }
  }

  return <main className="community-write-page"><form className="community-write-form" onSubmit={submit}>
    <header><a href="/ongijonggi"><RiArrowLeftLine />도담도담으로</a><h1>새 글 쓰기</h1><p>반려생활 이야기를 이웃들과 나눠보세요.</p></header>
    <label>제목<input name="title" maxLength={120} placeholder="제목을 입력해 주세요." required autoFocus /></label>
    <label>내용<textarea name="content" maxLength={50000} rows={16} placeholder="반려생활 이야기를 들려주세요." required /></label>
    <div className="community-attachment-field"><div><strong>첨부파일</strong><small>최대 5장 · JPG, PNG, WEBP · 장당 8MB</small></div><div className="community-image-pickers">{attachments.map((item, index) => <div className={`community-image-picker${item ? " has-preview" : ""}`} key={index}>{item ? <><img src={item.preview} alt={`첨부 이미지 ${index + 1} 미리보기`} /><button type="button" onClick={() => removeImage(index)} aria-label={`첨부 이미지 ${index + 1} 삭제`}><RiCloseLine /></button></> : <span><RiImageAddLine /><b>{index + 1}</b></span>}<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(event) => selectImage(index, event)} aria-label={`첨부 이미지 ${index + 1} 선택`} /></div>)}</div></div>
    <fieldset className="community-visibility-field"><legend>공개 범위</legend><div className="community-visibility-options"><label><input type="radio" name="visibility" value="PUBLIC" defaultChecked /><span>전체 공개<small>누구나 볼 수 있어요</small></span></label><label><input type="radio" name="visibility" value="MEMBERS" /><span>회원 공개<small>로그인한 회원만 볼 수 있어요</small></span></label></div></fieldset>
    {message && <p className="community-write-error" role="alert">{message}</p>}
    <div className="community-write-actions"><a href="/ongijonggi">취소</a><button type="submit" disabled={saving}>{saving ? "등록 중..." : "등록하기"}</button></div>
  </form></main>;
}
