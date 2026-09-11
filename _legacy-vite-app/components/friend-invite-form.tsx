"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function FriendInviteForm() {
  const [inviteCode, setInviteCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    const response = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteCode }),
    });
    const data = await response.json().catch(() => ({})) as { message?: string; name?: string };
    setLoading(false);

    if (!response.ok) {
      setMessage(data.message ?? "친구를 추가하지 못했어요.");
      return;
    }

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
