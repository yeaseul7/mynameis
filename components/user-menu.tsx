"use client";

import Link from "next/link";

function getInitial(value: string) {
  return value.trim().slice(0, 1).toUpperCase() || "U";
}

export function UserMenu({ email }: { email: string }) {
  return (
    <div className="user-menu">
      <Link className="account-initial-link" href="/account" title={email} aria-label="계정관리로 이동">
        {getInitial(email)}
      </Link>
    </div>
  );
}
