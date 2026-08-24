"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { invokeFunction } from "@/lib/supabase/functions";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export type GuestbookEntry = {
  id: string;
  author_name: string;
  message: string;
  created_at: string;
  parent_id?: string | null;
  is_mine?: boolean;
};

function getDateLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(date);
}

function getMaskedAuthorName(value: string) {
  const firstLetter = value.trim().charAt(0);
  return firstLetter ? `${firstLetter}****` : "익****";
}

function getRelativeTimeLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return getDateLabel(value);
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return "방금 전";
  if (diffMinutes < 60) return `${diffMinutes}분 전`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  return getDateLabel(value);
}

export function Guestbook({ slug, dogId, dogName, initialEntries, canWrite }: { slug: string; dogId: string; dogName: string; initialEntries: GuestbookEntry[]; canWrite: boolean }) {
  const [entries, setEntries] = useState(initialEntries);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [replyToId, setReplyToId] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [replying, setReplying] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    let result: { entry: GuestbookEntry };
    try {
      result = await invokeFunction("share", { action: "guestbook-add", slug, message });
    } catch (error) {
      setSaving(false);
      setStatus(error instanceof Error ? error.message : "방명록을 남기지 못했어요.");
      return;
    }
    setSaving(false);

    setEntries((current) => [result.entry as GuestbookEntry, ...current].slice(0, 20));
    setMessage("");
  }

  async function deleteEntry(entryId: string) {
    setDeletingId(entryId);
    setStatus("");
    try {
      await invokeFunction("share", { action: "guestbook-delete", slug, entryId });
    } catch (error) {
      setDeletingId("");
      setStatus(error instanceof Error ? error.message : "방명록을 삭제하지 못했어요.");
      return;
    }
    setDeletingId("");

    setEntries((current) => current.filter((entry) => entry.id !== entryId && entry.parent_id !== entryId));
  }

  async function submitReply(event: FormEvent<HTMLFormElement>, parentId: string) {
    event.preventDefault();
    setReplying(true);
    setStatus("");
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("로그인 후 답글을 남길 수 있어요.");
      const first = auth.user.email?.trim().charAt(0);
      const authorName = first ? `${first}****` : "익****";
      const { data, error } = await supabase.from("dog_guestbook_entries").insert({ dog_id: dogId, public_link_token: slug, author_id: auth.user.id, author_name: authorName, message: replyMessage.trim(), parent_id: parentId }).select("id,author_name,message,created_at,parent_id").single();
      if (error) throw error;
      setEntries((current) => [...current, { ...data, is_mine: true } as GuestbookEntry]);
      setReplyMessage("");
      setReplyToId("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "답글을 남기지 못했어요.");
    } finally {
      setReplying(false);
    }
  }

  const rootEntries = entries.filter((entry) => !entry.parent_id);

  return (
    <section className="guestbook-section" aria-labelledby="guestbook-title">
      <div className="guestbook-heading">
        <div><h2 id="guestbook-title">방명록 <span aria-hidden="true">🐾</span></h2><p>{dogName}에게 따뜻한 한마디를 남겨주세요.</p></div>
      </div>
      {status ? <p className="guestbook-status" role="status">{status}</p> : null}
      <div className="guestbook-list">
        {rootEntries.length ? rootEntries.map((entry) => (
          <div className="guestbook-thread" key={entry.id}>
          <article>
            <div className="guestbook-entry-head">
              <div>
                <strong>{getMaskedAuthorName(entry.author_name)}</strong>
                <time dateTime={entry.created_at}>{getRelativeTimeLabel(entry.created_at)}</time>
              </div>
            </div>
            <p className="guestbook-message">{entry.message}</p>
            <div className="guestbook-entry-actions">
              <button type="button" onClick={() => { if (!canWrite) return location.assign("/login"); setReplyToId((current) => current === entry.id ? "" : entry.id); setReplyMessage(""); }}>댓글</button>
              {entry.is_mine ? <button type="button" onClick={() => void deleteEntry(entry.id)} disabled={deletingId === entry.id}>{deletingId === entry.id ? "삭제 중" : "삭제"}</button> : null}
            </div>
            {replyToId === entry.id ? (
              <form className="guestbook-reply-form" onSubmit={(event) => void submitReply(event, entry.id)}>
                <textarea value={replyMessage} onChange={(event) => setReplyMessage(event.target.value)} maxLength={180} rows={2} placeholder="답글을 입력하세요." aria-label="방명록 답글" required autoFocus />
                <div><button type="button" onClick={() => setReplyToId("")}>취소</button><button type="submit" disabled={replying}>{replying ? "등록 중" : "등록"}</button></div>
              </form>
            ) : null}
          </article>
          {entries.filter((reply) => reply.parent_id === entry.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()).map((reply) => (
            <article className="guestbook-reply" key={reply.id}>
              <div className="guestbook-entry-head"><div><strong>{getMaskedAuthorName(reply.author_name)}</strong><time dateTime={reply.created_at}>{getRelativeTimeLabel(reply.created_at)}</time></div></div>
              <p className="guestbook-message">{reply.message}</p>
              {reply.is_mine ? <div className="guestbook-entry-actions"><button type="button" onClick={() => void deleteEntry(reply.id)} disabled={deletingId === reply.id}>{deletingId === reply.id ? "삭제 중" : "삭제"}</button></div> : null}
            </article>
          ))}
          </div>
        )) : <p className="guestbook-empty">아직 남겨진 방명록이 없어요.</p>}
      </div>
      {canWrite ? (
        <form className="guestbook-form" onSubmit={submit}>
          <div className="guestbook-input-shell">
            <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={180} rows={1} placeholder="따뜻한 한마디를 남겨주세요." aria-label="방명록 메시지" required />
          </div>
          <button type="submit" disabled={saving}>{saving ? "..." : "남기기"}</button>
        </form>
      ) : (
        <Link className="guestbook-login" href="/login">로그인하고 방명록 남기기</Link>
      )}
    </section>
  );
}
