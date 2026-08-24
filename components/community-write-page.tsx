"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type MouseEvent } from "react";
import { RiArrowLeftLine, RiBold, RiDoubleQuotesL, RiImageAddLine, RiItalic, RiLink, RiListUnordered, RiUnderline } from "react-icons/ri";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { invokeFunction } from "@/lib/supabase/functions";

type EditorImage = { id: string; file: File; preview: string };

export function CommunityWriteSkeleton() {
  return <main className="community-write-page community-write-skeleton" aria-busy="true" aria-label="새 글쓰기 화면을 불러오는 중"><section className="community-write-form"><header><span className="skeleton-line community-write-skeleton-back" /><span className="skeleton-line community-write-skeleton-title" /><span className="skeleton-line community-write-skeleton-description" /></header><span className="skeleton-card community-write-skeleton-input" /><div className="community-write-skeleton-editor"><span className="skeleton-card" /><span className="skeleton-card community-write-skeleton-textarea" /></div><div className="community-write-skeleton-field"><span className="skeleton-line" /><div className="community-write-skeleton-options"><span className="skeleton-card" /><span className="skeleton-card" /></div></div><div className="community-write-skeleton-actions"><span className="skeleton-pill" /><span className="skeleton-pill" /></div></section></main>;
}

export function CommunityWritePage({ editSlug }: { editSlug?: string }) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<EditorImage[]>([]);
  const selectionRef = useRef<Range | null>(null);

  useEffect(() => () => imagesRef.current.forEach(({ preview }) => URL.revokeObjectURL(preview)), []);
  useEffect(() => {
    if (!editSlug) return;
    invokeFunction<{ post: { title: string; content: string; content_format: string; visibility: "PUBLIC" | "MEMBERS" } }>("community", { action: "edit-detail", slug: editSlug }).then(({ post }) => {
      const editor = editorRef.current; const form = editor?.closest("form"); if (!editor || !form) return;
      const title = form.querySelector<HTMLInputElement>('input[name="title"]'); if (title) title.value = post.title;
      if (post.content_format === "RICH_HTML") editor.innerHTML = post.content; else editor.textContent = post.content;
      form.querySelector<HTMLInputElement>(`input[name="visibility"][value="${post.visibility}"]`)?.click();
      editor.querySelectorAll<HTMLElement>("figure").forEach((figure) => {
        figure.classList.add("community-editor-image"); figure.contentEditable = "false";
        const tools = document.createElement("div"); tools.className = "community-editor-image-tools"; const remove = document.createElement("button"); remove.type = "button"; remove.dataset.removeImage = "remote"; remove.textContent = "삭제"; tools.append(remove);
        const handles = ["top-left", "top-right", "bottom-left", "bottom-right"].map((position) => { const handle = document.createElement("span"); handle.className = `community-editor-image-resize ${position}`; handle.dataset.imageResize = ""; handle.dataset.resizeDirection = position.endsWith("left") ? "left" : "right"; return handle; }); figure.append(tools, ...handles);
      });
    }).catch((error) => setMessage(error instanceof Error ? error.message : "게시글을 불러오지 못했어요."));
  }, [editSlug]);
  useEffect(() => {
    const editor = editorRef.current; const toolbar = editor?.previousElementSibling; if (!editor || !(toolbar instanceof HTMLElement)) return;
    editor.addEventListener("pointerdown", handleEditorPointerDown);
    const group = document.createElement("div"); group.className = "community-editor-align-tools";
    for (const [alignment, label, commandName] of [["left", "왼쪽 정렬", "justifyLeft"], ["center", "가운데 정렬", "justifyCenter"], ["right", "오른쪽 정렬", "justifyRight"]]) {
      const button = document.createElement("button"); button.type = "button"; button.className = `community-align-${alignment}`; button.setAttribute("aria-label", label); button.title = label;
      const icon = document.createElement("i"); button.append(icon); button.addEventListener("mousedown", (event) => event.preventDefault()); button.addEventListener("click", () => command(commandName)); group.append(button);
    }
    const spacer = toolbar.querySelector(":scope > span"); toolbar.insertBefore(group, spacer);
    return () => { editor.removeEventListener("pointerdown", handleEditorPointerDown); group.remove(); };
  }, []);
  function keepSelection(event: MouseEvent<HTMLButtonElement>) { event.preventDefault(); }
  function keepImagesOutsideTextFormatting() {
    const editor = editorRef.current; if (!editor) return;
    editor.querySelectorAll<HTMLElement>("figure.community-editor-image").forEach((figure) => {
      figure.contentEditable = "false";
      figure.style.maxWidth = "100%";
      let wrapper = figure.closest<HTMLElement>("b,strong,i,em,u,s,a");
      while (wrapper && editor.contains(wrapper)) {
        const parent = wrapper.parentNode; if (!parent) break;
        const trailing = wrapper.cloneNode(false) as HTMLElement;
        let sibling = figure.nextSibling; while (sibling) { const next = sibling.nextSibling; trailing.append(sibling); sibling = next; }
        parent.insertBefore(figure, wrapper.nextSibling);
        if (trailing.childNodes.length) parent.insertBefore(trailing, figure.nextSibling);
        if (!wrapper.textContent && !wrapper.querySelector("img")) wrapper.remove();
        wrapper = figure.closest<HTMLElement>("b,strong,i,em,u,s,a");
      }
    });
  }
  function command(name: string, value?: string) {
    const editor = editorRef.current; if (!editor) return;
    const selection = window.getSelection(); const hasEditorSelection = Boolean(selection?.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer));
    if (!hasEditorSelection) editor.focus();
    const figures = Array.from(editor.querySelectorAll<HTMLElement>("figure.community-editor-image"));
    figures.forEach((figure) => { figure.contentEditable = "true"; });
    document.execCommand(name, false, value);
    figures.forEach((figure) => { if (figure.isConnected) figure.contentEditable = "false"; });
    keepImagesOutsideTextFormatting();
  }
  function addLink() { const url = window.prompt("연결할 주소를 입력해 주세요.", "https://"); if (url && /^https?:\/\//i.test(url)) command("createLink", url); }
  function openImagePicker() { const selection = window.getSelection(); selectionRef.current = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null; imageInputRef.current?.click(); }
  function handleEditorClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as Element;
    const selectedFigure = target.closest<HTMLElement>("figure.community-editor-image");
    editorRef.current?.querySelectorAll("figure.community-editor-image").forEach((figure) => figure.classList.toggle("is-selected", figure === selectedFigure));
    const crop = target.closest<HTMLButtonElement>("button[data-crop-image]");
    if (crop && selectedFigure) { const image = selectedFigure.querySelector<HTMLImageElement>("img[data-attachment-id]"); const item = imagesRef.current.find(({ id }) => id === image?.dataset.attachmentId); if (image && item) openCropEditor(item, image); return; }
    const button = target.closest<HTMLButtonElement>("button[data-remove-image]"); if (!button) return;
    const id = button.dataset.removeImage; const item = imagesRef.current.find((image) => image.id === id); if (item) URL.revokeObjectURL(item.preview);
    imagesRef.current = imagesRef.current.filter((image) => image.id !== id); button.closest("figure")?.remove();
  }
  function openCropEditor(item: EditorImage, editorImage: HTMLImageElement) {
    const backdrop = document.createElement("div"); backdrop.className = "community-crop-backdrop";
    const modal = document.createElement("section"); modal.className = "community-crop-modal";
    const header = document.createElement("header"); const title = document.createElement("strong"); title.textContent = "사진 자르기"; const close = document.createElement("button"); close.type = "button"; close.textContent = "×"; close.setAttribute("aria-label", "자르기 취소"); header.append(title, close);
    const stage = document.createElement("div"); stage.className = "community-crop-stage"; const cropImage = document.createElement("img"); cropImage.src = item.preview; cropImage.alt = "자를 사진"; cropImage.draggable = false; const cropBox = document.createElement("div"); cropBox.className = "community-crop-box";
    for (const position of ["top-left", "top-right", "bottom-left", "bottom-right"]) { const handle = document.createElement("span"); handle.className = position; handle.dataset.cropHandle = position; cropBox.append(handle); } stage.append(cropImage, cropBox);
    const currentRatio = Number(editorImage.closest<HTMLElement>("figure")?.dataset.ratio) || editorImage.naturalWidth / editorImage.naturalHeight || .75; let cropRatio = currentRatio;
    const ratioRow = document.createElement("div"); ratioRow.className = "community-crop-ratios";
    for (const [label, ratio] of [["원본", 0], ["1:1", 1], ["4:3", 4 / 3], ["3:4", 3 / 4], ["16:9", 16 / 9]] as const) { const button = document.createElement("button"); button.type = "button"; button.textContent = label; button.dataset.cropRatio = String(ratio); ratioRow.append(button); }
    const actions = document.createElement("div"); const cancel = document.createElement("button"); cancel.type = "button"; cancel.textContent = "취소"; const apply = document.createElement("button"); apply.type = "button"; apply.textContent = "자르기 완료"; actions.append(cancel, apply); modal.append(header, stage, ratioRow, actions); backdrop.append(modal); document.body.append(backdrop);
    let imageLeft = 0; let imageTop = 0; let imageWidth = 0; let imageHeight = 0; let cropX = 0; let cropY = 0; let cropWidth = 0; let cropHeight = 0;
    const renderCrop = () => { cropBox.style.left = `${cropX}px`; cropBox.style.top = `${cropY}px`; cropBox.style.width = `${cropWidth}px`; cropBox.style.height = `${cropHeight}px`; };
    const resetCrop = () => { if (!imageWidth || !imageHeight) return; if (imageWidth / imageHeight >= cropRatio) { cropHeight = imageHeight; cropWidth = cropHeight * cropRatio; } else { cropWidth = imageWidth; cropHeight = cropWidth / cropRatio; } cropX = imageLeft + (imageWidth - cropWidth) / 2; cropY = imageTop + (imageHeight - cropHeight) / 2; renderCrop(); };
    const layoutImage = () => { if (!cropImage.naturalWidth || !cropImage.naturalHeight) return; const scale = Math.min(stage.clientWidth / cropImage.naturalWidth, stage.clientHeight / cropImage.naturalHeight); imageWidth = cropImage.naturalWidth * scale; imageHeight = cropImage.naturalHeight * scale; imageLeft = (stage.clientWidth - imageWidth) / 2; imageTop = (stage.clientHeight - imageHeight) / 2; cropImage.style.width = `${imageWidth}px`; cropImage.style.height = `${imageHeight}px`; cropImage.style.left = `${imageLeft}px`; cropImage.style.top = `${imageTop}px`; const matching = Array.from(ratioRow.querySelectorAll<HTMLButtonElement>("button")).find((button) => { const value = Number(button.dataset.cropRatio); return value ? Math.abs(value - currentRatio) < .015 : ![1, 4 / 3, 3 / 4, 16 / 9].some((ratio) => Math.abs(ratio - currentRatio) < .015); }); if (matching) matching.classList.add("active"); resetCrop(); };
    const dismiss = () => backdrop.remove(); close.onclick = dismiss; cancel.onclick = dismiss; backdrop.addEventListener("click", (event) => { if (event.target === backdrop) dismiss(); });
    cropImage.addEventListener("load", layoutImage); if (cropImage.complete) layoutImage(); ratioRow.addEventListener("click", (event) => { const button = (event.target as Element).closest<HTMLButtonElement>("button[data-crop-ratio]"); if (!button) return; const requested = Number(button.dataset.cropRatio); cropRatio = requested || cropImage.naturalWidth / cropImage.naturalHeight || currentRatio; ratioRow.querySelectorAll("button").forEach((item) => item.classList.toggle("active", item === button)); resetCrop(); });
    cropBox.addEventListener("pointerdown", (event) => { event.preventDefault(); const handle = (event.target as Element).closest<HTMLElement>("[data-crop-handle]"); const startX = event.clientX; const startY = event.clientY; const startCrop = { x: cropX, y: cropY, width: cropWidth, height: cropHeight }; cropBox.setPointerCapture(event.pointerId);
      const move = (pointerEvent: PointerEvent) => { const dx = pointerEvent.clientX - startX; const dy = pointerEvent.clientY - startY; if (!handle) { cropX = Math.min(imageLeft + imageWidth - cropWidth, Math.max(imageLeft, startCrop.x + dx)); cropY = Math.min(imageTop + imageHeight - cropHeight, Math.max(imageTop, startCrop.y + dy)); } else { const left = handle.dataset.cropHandle?.endsWith("left"); const top = handle.dataset.cropHandle?.startsWith("top"); const anchorX = left ? startCrop.x + startCrop.width : startCrop.x; const anchorY = top ? startCrop.y + startCrop.height : startCrop.y; const widthFromX = left ? startCrop.width - dx : startCrop.width + dx; const widthFromY = (top ? startCrop.height - dy : startCrop.height + dy) * cropRatio; let width = Math.abs(dx) >= Math.abs(dy) ? widthFromX : widthFromY; const maxWidthX = left ? anchorX - imageLeft : imageLeft + imageWidth - anchorX; const maxWidthY = (top ? anchorY - imageTop : imageTop + imageHeight - anchorY) * cropRatio; width = Math.min(maxWidthX, maxWidthY, Math.max(48, width)); cropWidth = width; cropHeight = width / cropRatio; cropX = left ? anchorX - width : anchorX; cropY = top ? anchorY - cropHeight : anchorY; } renderCrop(); };
      const finish = () => { cropBox.removeEventListener("pointermove", move); cropBox.removeEventListener("pointerup", finish); cropBox.removeEventListener("pointercancel", finish); }; cropBox.addEventListener("pointermove", move); cropBox.addEventListener("pointerup", finish); cropBox.addEventListener("pointercancel", finish); });
    apply.onclick = async () => {
      const naturalWidth = cropImage.naturalWidth; const naturalHeight = cropImage.naturalHeight; if (!naturalWidth || !naturalHeight) return;
      const sourceX = (cropX - imageLeft) / imageWidth * naturalWidth; const sourceY = (cropY - imageTop) / imageHeight * naturalHeight; const sourceWidth = cropWidth / imageWidth * naturalWidth; const sourceHeight = cropHeight / imageHeight * naturalHeight;
      const canvas = document.createElement("canvas"); if (cropRatio >= 1) { canvas.width = 1200; canvas.height = Math.round(1200 / cropRatio); } else { canvas.height = 1200; canvas.width = Math.round(1200 * cropRatio); } const context = canvas.getContext("2d"); if (!context) return; context.drawImage(cropImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", .9)); if (!blob) return;
      URL.revokeObjectURL(item.preview); item.file = new File([blob], item.file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }); item.preview = URL.createObjectURL(blob); editorImage.src = item.preview; editorImage.dataset.cropX = "50"; editorImage.dataset.cropY = "50"; editorImage.style.objectPosition = "50% 50%"; dismiss();
      const croppedFigure = editorImage.closest<HTMLElement>("figure"); if (croppedFigure) { croppedFigure.dataset.ratio = String(cropRatio); croppedFigure.style.aspectRatio = String(cropRatio); }
    };
  }
  function handleEditorPointerDown(event: PointerEvent) {
    const target = event.target as Element;
    const handle = target.closest<HTMLElement>("[data-image-resize]"); const figure = handle?.closest<HTMLElement>("figure"); const editor = editorRef.current;
    if (!handle || !figure || !editor) return;
    event.preventDefault();
    editor.querySelectorAll("figure.community-editor-image").forEach((item) => item.classList.toggle("is-selected", item === figure));
    const startX = event.clientX; const startWidth = figure.getBoundingClientRect().width; const maxWidth = editor.clientWidth; const pointerId = event.pointerId; const direction = handle.dataset.resizeDirection === "left" ? -1 : 1;
    handle.setPointerCapture(pointerId); figure.classList.add("is-resizing");
    const resize = (pointerEvent: PointerEvent) => { const width = Math.min(maxWidth, Math.max(maxWidth * .2, startWidth + (pointerEvent.clientX - startX) * direction)); const percent = Math.round(width / maxWidth * 1000) / 10; figure.style.width = `${percent}%`; figure.dataset.width = String(percent); };
    const finish = () => { figure.classList.remove("is-resizing"); handle.removeEventListener("pointermove", resize); handle.removeEventListener("pointerup", finish); handle.removeEventListener("pointercancel", finish); };
    handle.addEventListener("pointermove", resize); handle.addEventListener("pointerup", finish); handle.addEventListener("pointercancel", finish);
  }

  function selectImages(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []); event.target.value = "";
    if (!selected.length) return;
    if (imagesRef.current.length + selected.length > 5) return setMessage("이미지는 최대 5장까지 넣을 수 있어요.");
    if (selected.some((file) => !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024)) return setMessage("사진은 장당 8MB 이하의 이미지 파일만 등록할 수 있어요.");
    const editor = editorRef.current; if (!editor) return;
    setMessage(""); editor.focus();
    const selection = window.getSelection();
    const range = selectionRef.current && editor.contains(selectionRef.current.commonAncestorContainer) ? selectionRef.current : document.createRange();
    if (!selectionRef.current || !editor.contains(range.commonAncestorContainer)) { range.selectNodeContents(editor); range.collapse(false); }
    for (const file of selected) {
      const item = { id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }; imagesRef.current.push(item);
      const figure = document.createElement("figure"); figure.className = "community-editor-image"; figure.contentEditable = "false"; figure.dataset.width = "55"; figure.dataset.ratio = ".75"; figure.style.width = "55%"; figure.style.aspectRatio = ".75";
      const image = document.createElement("img"); image.src = item.preview; image.alt = "본문 이미지"; image.dataset.attachmentId = item.id; image.dataset.cropX = "50"; image.dataset.cropY = "50";
      const tools = document.createElement("div"); tools.className = "community-editor-image-tools";
      const crop = document.createElement("button"); crop.type = "button"; crop.dataset.cropImage = item.id; crop.textContent = "자르기"; tools.append(crop);
      const remove = document.createElement("button"); remove.type = "button"; remove.dataset.removeImage = item.id; remove.setAttribute("aria-label", "본문 이미지 삭제"); remove.textContent = "삭제"; tools.append(remove);
      const handles = ["top-left", "top-right", "bottom-left", "bottom-right"].map((position) => { const handle = document.createElement("span"); handle.className = `community-editor-image-resize ${position}`; handle.dataset.imageResize = ""; handle.dataset.resizeDirection = position.endsWith("left") ? "left" : "right"; handle.setAttribute("aria-label", "드래그해서 이미지 크기 조절"); return handle; });
      figure.append(image, tools, ...handles); figure.classList.add("is-selected"); editor.querySelectorAll("figure.community-editor-image").forEach((other) => { if (other !== figure) other.classList.remove("is-selected"); });
      range.insertNode(figure); range.setStartAfter(figure); range.collapse(true);
    }
    const paragraph = document.createElement("p"); paragraph.append(document.createElement("br")); range.insertNode(paragraph); range.setStart(paragraph, 0); range.collapse(true);
    selection?.removeAllRanges(); selection?.addRange(range);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving || !editorRef.current) return;
    const values = new FormData(event.currentTarget); const title = String(values.get("title") ?? "").trim();
    const editorCopy = editorRef.current.cloneNode(true) as HTMLDivElement;
    editorCopy.querySelectorAll("button,.community-editor-image-tools,.community-editor-image-resize").forEach((element) => element.remove());
    if (!editorCopy.textContent?.trim() && !editorCopy.querySelector("img")) return setMessage("내용을 입력해 주세요.");
    setSaving(true); setMessage(""); const uploadedPaths: string[] = [];
    try {
      const supabase = createBrowserSupabaseClient(); const { data: auth } = await supabase.auth.getUser(); if (!auth.user) throw new Error("로그인이 필요해요.");
      const imageUrls: string[] = [];
      for (const image of Array.from(editorCopy.querySelectorAll<HTMLImageElement>("img[data-attachment-id]"))) {
        const item = imagesRef.current.find(({ id }) => id === image.dataset.attachmentId); if (!item) { image.remove(); continue; }
        const extension = item.file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg"; const path = `${auth.user.id}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from("community-images").upload(path, item.file, { contentType: item.file.type, upsert: false }); if (error) throw error;
        uploadedPaths.push(path); const url = supabase.storage.from("community-images").getPublicUrl(path).data.publicUrl; imageUrls.push(url); image.src = url; delete image.dataset.attachmentId;
      }
      const finalImageUrls = Array.from(editorCopy.querySelectorAll<HTMLImageElement>("img")).map((image) => image.src).filter((url) => url.startsWith("https://")).slice(0, 5);
      const post = await invokeFunction<{ slug: string }>("community", { action: editSlug ? "update" : "create", slug: editSlug, title, content: editorCopy.innerHTML, contentFormat: "RICH_HTML", visibility: String(values.get("visibility") ?? "PUBLIC"), imageUrls: finalImageUrls.length ? finalImageUrls : imageUrls });
      location.replace(`/community/${post.slug}`);
    } catch (error) {
      if (uploadedPaths.length) await createBrowserSupabaseClient().storage.from("community-images").remove(uploadedPaths);
      setMessage(error instanceof Error ? error.message : "글을 등록하지 못했어요."); setSaving(false);
    }
  }

  // 에디터 내부에 동적으로 삽입한 이미지 버튼의 클릭 이벤트를 위임한다.
  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
  return <main className="community-write-page"><form className="community-write-form" onSubmit={submit}><header><a href="/ongijonggi"><RiArrowLeftLine />도담도담으로</a><h1>새 글 쓰기</h1><p>반려생활 이야기를 이웃들과 나눠보세요.</p></header><input className="community-title-input" name="title" maxLength={120} placeholder="제목을 입력해 주세요." aria-label="제목" required autoFocus /><section className="community-rich-editor"><div className="community-editor-toolbar" aria-label="글 서식 도구"><button type="button" onMouseDown={keepSelection} onClick={() => command("bold")} aria-label="굵게"><RiBold /></button><button type="button" onMouseDown={keepSelection} onClick={() => command("italic")} aria-label="기울임"><RiItalic /></button><button type="button" onMouseDown={keepSelection} onClick={() => command("underline")} aria-label="밑줄"><RiUnderline /></button><button type="button" onMouseDown={keepSelection} onClick={() => command("insertUnorderedList")} aria-label="목록"><RiListUnordered /></button><button type="button" onMouseDown={keepSelection} onClick={() => command("formatBlock", "blockquote")} aria-label="인용"><RiDoubleQuotesL /></button><button type="button" onMouseDown={keepSelection} onClick={addLink} aria-label="링크"><RiLink /></button><span /><button type="button" onMouseDown={keepSelection} onClick={openImagePicker} aria-label="본문에 이미지 추가"><RiImageAddLine /><b>사진</b></button><input ref={imageInputRef} type="file" multiple hidden accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={selectImages} /></div><div ref={editorRef} className="community-editor-content" contentEditable suppressContentEditableWarning data-placeholder="반려생활 이야기를 들려주세요." aria-label="내용" onClick={handleEditorClick} /></section><fieldset className="community-visibility-field"><legend>공개 범위</legend><div className="community-visibility-options"><label><input type="radio" name="visibility" value="PUBLIC" defaultChecked /><span>전체 공개<small>누구나 볼 수 있어요</small></span></label><label><input type="radio" name="visibility" value="MEMBERS" /><span>회원 공개<small>로그인한 회원만 볼 수 있어요</small></span></label></div></fieldset>{message && <p className="community-write-error" role="alert">{message}</p>}<div className="community-write-actions"><a href="/ongijonggi">취소</a><button type="submit" disabled={saving}>{saving ? "등록 중..." : "등록하기"}</button></div></form></main>;
}
