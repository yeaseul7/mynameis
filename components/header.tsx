import Link from "next/link";
import Image from "next/image";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { UserMenu } from "./user-menu";

export async function Header() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="mynameis 홈"><Image className="wordmark-logo" src="/mynameis-logo.png" alt="mynameis" width={105} height={36} priority /></Link>
      <nav aria-label="사용자 메뉴">
        {user ? <UserMenu email={user.email ?? "사용자"} /> : <Link className="header-login" href="/login">로그인</Link>}
      </nav>
    </header>
  );
}
