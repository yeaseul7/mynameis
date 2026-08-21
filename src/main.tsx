import { hydrate, render } from "preact";
import { useEffect } from "preact/hooks";
import { AppShell } from "@/components/app-shell";
import { Header } from "@/components/header";
import { HomePage } from "./pages/home";
import { LoginPage, NewPetPage, NewFriendPage, EditPetPage, AccountPage, AuthCallbackPage, ResetPasswordPage, OngijonggiRoute, CommunityWriteRoute } from "./pages/app-pages";
import { SharePage } from "./pages/share";
import TermsPage from "@/app/terms/page";
import PrivacyPage from "@/app/privacy/page";
import { CommunityPostPage } from "@/components/community-post-page";
import "@/app/globals.css";

function SeoGuard() {
  useEffect(() => {
    const robots = document.querySelector('meta[name="robots"]');
    if (robots) robots.setAttribute("content", location.pathname === "/" ? "index,follow" : "noindex,nofollow");
  });
  return null;
}

function App() {
  const path = location.pathname;
  const editMatch = path.match(/^\/pets\/([^/]+)\/edit$/);
  const shareMatch = path.match(/^\/share\/([^/]+)$/);
  const communityMatch = path.match(/^\/community\/([^/]+)$/);
  let page = <div className="route-error">페이지를 찾을 수 없어요.</div>;
  if (path === "/") page = <HomePage />;
  else if (path === "/login") page = <LoginPage />;
  else if (path === "/auth/callback") page = <AuthCallbackPage />;
  else if (path === "/reset-password") page = <ResetPasswordPage />;
  else if (path === "/account") page = <AccountPage />;
  else if (path === "/ongijonggi") page = <OngijonggiRoute />;
  else if (path === "/community/new") page = <CommunityWriteRoute />;
  else if (path === "/pets/new") page = <NewPetPage />;
  else if (editMatch) page = <EditPetPage id={decodeURIComponent(editMatch[1])} />;
  else if (path === "/friends/new") page = <NewFriendPage />;
  else if (shareMatch) page = <SharePage slug={decodeURIComponent(shareMatch[1])} />;
  else if (communityMatch) page = <CommunityPostPage slug={decodeURIComponent(communityMatch[1])} />;
  else if (path === "/terms") page = <TermsPage />;
  else if (path === "/privacy") page = <PrivacyPage />;
  return <AppShell header={<Header />}><SeoGuard />{page}</AppShell>;
}

const root = document.getElementById("app")!;
if (location.pathname === "/" && root.hasChildNodes()) hydrate(<App />, root);
else render(<App />, root);
