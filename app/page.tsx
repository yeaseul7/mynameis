import { createServerSupabaseClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/login-form";
import { SocialLoginPanel } from "@/components/social-login-panel";
import { getHomeMode } from "@/lib/home-mode";
import { LoggedHome } from "@/components/logged-home";

function NameTagIllustration() {
  return (
    <div className="guest-visual" aria-label="얼리의 이름표 미리보기">
      <div className="name-tag-object" aria-hidden>
        <div className="tag-ring" />
        <div className="tag-tape" />
        <div className="tag-face">🐶</div>
        <div className="tag-title">안녕! 나는 얼리야</div>
        <div className="tag-grid">
          <i className="tag-tile yellow">🐾</i>
          <i className="tag-tile peach">♥</i>
          <i className="tag-tile green">✓</i>
          <i className="tag-tile blue">＋</i>
        </div>
        <div className="tag-tail" />
      </div>
      <div className="guest-bubble bubble-care">돌봄 정보</div>
      <div className="guest-bubble bubble-safe">안전하게 공유해요</div>
    </div>
  );
}

function GuestHome() {
  const homeMode = getHomeMode();
  return (
    <div className="guest-home">
      <NameTagIllustration />
      <section className="guest-copy">
        <h1>돌봄부터 실종까지<br />우리아이의 정보를<br /><em>쉽게 공유하고 관리해요.</em></h1>
        {homeMode === "tempmode" ? <SocialLoginPanel /> : <LoginForm variant="inline" />}
      </section>
    </div>
  );
}

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return <GuestHome />;

  const userName = user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "보호자";
  return <LoggedHome userId={user.id} userName={userName} />;
}
