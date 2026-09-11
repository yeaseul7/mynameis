"use client";

import { CSSProperties, FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type ChatMessage = { id: string; sender_name: string; message: string; created_at: string };
type ChannelSender = { send: (payload: { type: "broadcast"; event: string; payload: ChatMessage }) => Promise<unknown> };
const CHAT_MAX_LENGTH = 80;
const BUBBLE_DURATION = 5000;

export function LiveChat({ petId, senderName, petPosition }: { petId: string | null; senderName: string; petPosition: { x: number; y: number } | null }) {
  const [text, setText] = useState("");
  const [bubble, setBubble] = useState<ChatMessage | null>(null);
  const realtimeChannel = useRef<ChannelSender | null>(null);
  const localChannel = useRef<BroadcastChannel | null>(null);
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showBubble = useCallback((message: ChatMessage) => {
    setBubble(message);
    if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
    bubbleTimer.current = setTimeout(() => setBubble(null), BUBBLE_DURATION);
  }, []);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    if (petId && supabase) {
      const channel = supabase.channel(`mini-room-chat:${petId}`, { config: { broadcast: { self: true } } }).on("broadcast", { event: "message" }, ({ payload }) => showBubble(payload as ChatMessage)).subscribe();
      realtimeChannel.current = channel;
      return () => { realtimeChannel.current = null; if (bubbleTimer.current) clearTimeout(bubbleTimer.current); void supabase.removeChannel(channel); };
    }
    const channel = new BroadcastChannel("mynameis-room-chat:demo");
    channel.onmessage = (event) => showBubble(event.data as ChatMessage);
    localChannel.current = channel;
    return () => { localChannel.current = null; if (bubbleTimer.current) clearTimeout(bubbleTimer.current); channel.close(); };
  }, [petId, showBubble]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const message = text.trim().slice(0, CHAT_MAX_LENGTH); if (!message) return;
    const next: ChatMessage = { id: crypto.randomUUID(), sender_name: senderName.slice(0, 30), message, created_at: new Date().toISOString() };
    setText("");
    showBubble(next);
    if (realtimeChannel.current) await realtimeChannel.current.send({ type: "broadcast", event: "message", payload: next });
    else localChannel.current?.postMessage(next);
  }

  return <>{bubble && petPosition && <div className="room-chat-bubble" style={{ left: `${petPosition.x}%`, top: `${petPosition.y}%` } as CSSProperties} role="status"><b>{bubble.sender_name}</b><span>{bubble.message}</span></div>}<form className="room-chat-input" onSubmit={send} onClick={(event) => event.stopPropagation()}><input value={text} onChange={(event) => setText(event.target.value)} maxLength={CHAT_MAX_LENGTH} placeholder="메시지 입력" aria-label={`실시간 채팅 메시지, 최대 ${CHAT_MAX_LENGTH}자`} /><small>{text.length}/{CHAT_MAX_LENGTH}</small><button>전송</button></form></>;
}
