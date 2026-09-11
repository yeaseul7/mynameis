"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/auth/client";

export function AccountSignOutButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function logout() {
    setLoading(true);
    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button className="account-signout-button" type="button" onClick={logout} disabled={loading}>
      {loading ? "처리 중" : "로그아웃"}
    </button>
  );
}

export function AccountDeleteButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function deleteAccount() {
    const confirmed = window.confirm("계정을 탈퇴하면 등록한 아이 정보와 공유 링크가 삭제돼요. 계속할까요?");
    if (!confirmed) return;

    setLoading(true);
    const response = await fetch("/api/account", { method: "DELETE" });
    if (!response.ok) {
      setLoading(false);
      window.alert("계정탈퇴 처리 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.");
      return;
    }

    await signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <button className="account-delete-button" type="button" onClick={deleteAccount} disabled={loading}>
      {loading ? "탈퇴 처리 중" : "계정탈퇴"}
    </button>
  );
}
