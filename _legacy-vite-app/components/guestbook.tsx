"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

export type GuestbookEntry = {
  id: string;
  author_name: string;
  message: string;
  created_at: string;
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

export function Guestbook({ slug, dogName, initialEntries, canWrite }: { slug: string; dogName: string; initialEntries: GuestbookEntry[]; canWrite: boolean }) {
  const [entries, setEntries] = useState(initialEntries);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setStatus("");

    const response = await fetch(`/api/share/${slug}/guestbook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const result = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok || !result.entry) {
      setStatus(result.message ?? "방명록을 남기지 못했어요.");
      return;
    }

    setEntries((current) => [result.entry as GuestbookEntry, ...current].slice(0, 20));
    setMessage("");
  }

  async function deleteEntry(entryId: string) {
    setDeletingId(entryId);
    setStatus("");
    const response = await fetch(`/api/share/${slug}/guestbook/${entryId}`, { method: "DELETE" });
    setDeletingId("");

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      setStatus(result.message ?? "방명록을 삭제하지 못했어요.");
      return;
    }

    setEntries((current) => current.filter((entry) => entry.id !== entryId));
  }

  return (
    <section className="guestbook-section" aria-labelledby="guestbook-title">
      <div className="guestbook-heading">
        <h2 id="guestbook-title">방명록</h2>
      </div>
      {status ? <p className="guestbook-status" role="status">{status}</p> : null}
      <div className="guestbook-list">
        {entries.length ? entries.map((entry) => (
          <article key={entry.id}>
            <div className="guestbook-entry-head">
              <div>
                <strong>{getMaskedAuthorName(entry.author_name)}</strong>
                <time dateTime={entry.created_at}>{getRelativeTimeLabel(entry.created_at)}</time>
              </div>
            </div>
            <p className="guestbook-message">{entry.message}</p>
            <div className="guestbook-entry-actions">
              <button type="button">댓글</button>
              {entry.is_mine ? <button type="button" onClick={() => void deleteEntry(entry.id)} disabled={deletingId === entry.id}>{deletingId === entry.id ? "삭제 중" : "삭제"}</button> : null}
            </div>
          </article>
        )) : <p className="guestbook-empty">아직 남겨진 방명록이 없어요.</p>}
      </div>
      {canWrite ? (
        <form className="guestbook-form" onSubmit={submit}>
          <textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={180} rows={1} placeholder={`${dogName}에게 따뜻한 한마디를 남겨주세요.`} aria-label="방명록 메시지" required />
          <button type="submit" disabled={saving}>{saving ? "..." : "남기기"}</button>
        </form>
      ) : (
        <Link className="guestbook-login" href="/login">로그인하고 방명록 남기기</Link>
      )}
    </section>
  );
}
