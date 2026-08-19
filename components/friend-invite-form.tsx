"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { invokeFunction } from "@/lib/supabase/functions";

export function FriendInviteForm() {
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    let data: { name?: string };
    try {
      data = await invokeFunction("friends", { action: "add", inviteCode });
    } catch (error) {
      setLoading(false);
      setMessage(error instanceof Error ? error.message : "친구를 추가하지 못했어요.");
      return;
    }
    setLoading(false);

    setMessage(`${data.name ?? "친구"}를 추가했어요.`);
    router.push("/");
    router.refresh();
  }

  return (
    <form className="friend-invite-form" onSubmit={submit}>
      <label>
        <span>초대코드</span>
        <input
          value={inviteCode}
          onChange={(event) => setInviteCode(event.target.value.toUpperCase())}
          placeholder="MNS-ABC123"
          maxLength={10}
          autoComplete="off"
          required
        />
      </label>
      <button type="submit" disabled={loading}>{loading ? "추가 중" : "친구 추가"}</button>
      {message ? <p role="status">{message}</p> : null}
    </form>
  );
}
