"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Client, type Room } from "colyseus.js";
import type { Profile } from "./types";

const DUPLICATE_MESSAGE = "다른 기기 또는 브라우저에서 접속되어 연결이 종료되었습니다.";

export default function WorldClient() {
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState("서버에 연결 중...");
  const [connected, setConnected] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let disposed = false;
    let duplicate = false;
    let phaserGame: { destroy(): void } | undefined;
    const params = new URLSearchParams(window.location.search);
    const petId = params.get("petId")?.trim() || `guest-${Math.random().toString(36).slice(2, 8)}`;
    const petName = params.get("petName")?.trim() || "게스트";
    const endpoint = process.env.NEXT_PUBLIC_COLYSEUS_URL || "ws://localhost:2567";

    void (async () => {
      try {
        const room = await new Client(endpoint).joinOrCreate("world", { petId, petName });
        if (disposed) { await room.leave(); return; }
        roomRef.current = room;
        setStatus(`${petName} 접속 중`);
        setConnected(true);

        room.onMessage("duplicate-session", ({ message: text }: { message: string }) => {
          duplicate = true;
          setNotice(text || DUPLICATE_MESSAGE);
          setConnected(false);
          setStatus("중복 접속으로 종료됨");
        });
        room.onLeave((code) => {
          setConnected(false);
          roomRef.current = null;
          if (!disposed && !duplicate) {
            setStatus("서버 연결 종료");
            setNotice(code === 4001 ? DUPLICATE_MESSAGE : "서버와의 연결이 종료되었습니다. 페이지를 새로고침해 다시 접속해 주세요.");
          }
        });
        room.onError((_code, error) => {
          if (!disposed) setNotice(`실시간 서버 오류: ${error}`);
        });

        const { PhaserGame } = await import("./PhaserGame");
        if (!disposed) phaserGame = new PhaserGame(room, setProfile);
      } catch (error) {
        if (disposed) return;
        setConnected(false);
        setStatus("연결 실패");
        setNotice(`월드 입장에 실패했습니다. Colyseus 서버 실행 여부를 확인해 주세요. (${error instanceof Error ? error.message : "알 수 없는 오류"})`);
      }
    })();

    return () => {
      disposed = true;
      phaserGame?.destroy();
      const room = roomRef.current;
      roomRef.current = null;
      if (room) void room.leave();
    };
  }, []);

  function sendChat(event: FormEvent) {
    event.preventDefault();
    const text = message.trim();
    if (!text || !roomRef.current || !connected) return;
    roomRef.current.send("chat", { message: text });
    setMessage("");
  }

  return (
    <main className="world-page">
      <section className="world-shell">
        <header className="world-header">
          <h1>mynameis 강아지 월드 MVP</h1>
          <span className={`connection ${connected ? "online" : "offline"}`}>{status}</span>
        </header>
        <div id="phaser-world" />
        <form className="chat-form" onSubmit={sendChat}>
          <input aria-label="채팅 메시지" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={80} placeholder="메시지를 입력하세요" disabled={!connected} />
          <button type="submit" disabled={!connected}>전송</button>
        </form>
        {notice && <div className="notice" role="alert">{notice}</div>}
        {profile && (
          <aside className="profile">
            <button className="profile-close" aria-label="닫기" onClick={() => setProfile(null)}>×</button>
            <h2>{profile.petName}</h2>
            <p>포메라니안</p><p>3살</p>
            <button onClick={() => window.alert("친구 신청 기능은 추후 연결 예정입니다.")}>친구 신청</button>
          </aside>
        )}
      </section>
    </main>
  );
}
