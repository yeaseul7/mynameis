import { useEffect, useState } from "preact/hooks";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { SocialLoginPanel } from "@/components/social-login-panel";
import { PetRegistrationForm } from "@/components/pet-registration-form";
import { PetEditForm } from "@/components/pet-edit-form";
import { FriendInviteForm } from "@/components/friend-invite-form";
import { AccountDeleteButton, AccountSignOutButton } from "@/components/account-sign-out-button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { updateNickname, updatePassword } from "@/lib/auth/client";
import { getDogForOwner } from "@/lib/pets/service";
import { Protected } from "./protected";
import type { DogProfile } from "@/lib/pets/types";
import { RouteSkeleton } from "@/src/components/route-skeleton";
import { OngijonggiPage } from "@/components/ongijonggi-page";
import { CommunityWritePage, CommunityWriteSkeleton } from "@/components/community-write-page";

export const LoginPage = () => <main className="login-page"><section className="login-card temp-login-card"><a className="login-contact" href="https://mail.google.com/mail/?view=cm&fs=1&to=sientobiz@gmail.com&su=mynameis%20문의" target="_blank" rel="noreferrer">문의하기</a><div className="login-intro"><a className="login-brand" href="/"><img src="/mynameis-logo.png" alt="mynameis" width="170" /></a><p>우리 아이의 다정한 이름표</p><h1>반가워요!</h1></div><SocialLoginPanel /></section></main>;
export const NewPetPage = () => <Protected loading={<RouteSkeleton variant="pet-form" label="새꾸 등록 화면을 불러오고 있어요" />}>{user => <div className="pet-registration-page"><PetRegistrationForm userId={user.id} /></div>}</Protected>;
export const NewFriendPage = () => <Protected>{() => <div className="friend-registration-page"><section className="friend-registration-card"><span>친구 이름표</span><h1>초대코드로 친구를 추가해요</h1><p>친구 이름표에 초대코드를 복사해서 붙여넣어주세요</p><FriendInviteForm /></section></div>}</Protected>;

export function EditPetPage({ id }: { id?: string }) {
  const [dog, setDog] = useState<DogProfile | null | undefined>();
  const editSkeleton = <RouteSkeleton variant="pet-edit" label="수정 화면을 불러오고 있어요" />;
  return <Protected loading={editSkeleton}>{user => {
    useEffect(() => { if (id) getDogForOwner(createBrowserSupabaseClient(), user.id, id).then(setDog); }, [id, user.id]);
    if (dog === undefined) return editSkeleton;
    if (!dog) return <div className="route-error">반려견 정보를 찾을 수 없어요.</div>;
    return <div className="pet-registration-page"><PetEditForm dog={{ ...dog, ownerId: dog.ownerId ?? user.id, photos: dog.photos.map(photo => ({ ...photo, id: photo.id ?? "", storageKey: photo.storageKey ?? "" })) }} /></div>;
  }}</Protected>;
}

function AccountContent({ user }: { user: User }) {
  const initialName = user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "보호자";
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const provider = user.app_metadata?.provider ?? "확인 중";

  async function saveNickname(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nickname = String(new FormData(event.currentTarget).get("nickname") ?? "").trim();
    if (nickname.length < 2 || nickname.length > 20) return setMessage("닉네임은 2~20자로 입력해 주세요.");
    setSaving(true); setMessage("");
    const { error } = await updateNickname(nickname);
    if (error) setMessage("닉네임을 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
    else { setName(nickname); setMessage("닉네임을 변경했어요."); }
    setSaving(false);
  }

  return <main className="account-page"><section className="account-panel"><div className="account-hero"><div className="account-avatar">{name.slice(0, 1).toUpperCase()}</div><div><p className="account-kicker">계정관리</p><h1>{name}님</h1><p>이름표와 공유 링크를 관리하는 보호자 계정이에요.</p></div></div><form className="account-nickname-form" onSubmit={saveNickname}><div><label htmlFor="account-nickname">닉네임</label><p>서비스에서 표시할 보호자 이름이에요.</p></div><div className="account-nickname-control"><input id="account-nickname" name="nickname" defaultValue={name} minLength={2} maxLength={20} autoComplete="nickname" required /><button disabled={saving}>{saving ? "저장 중..." : "변경"}</button></div>{message && <p className="account-nickname-message" role="status">{message}</p>}</form><div className="account-info-grid"><article><span>이메일</span><strong>{user.email ?? "등록된 이메일 없음"}</strong></article><article><span>로그인 방식</span><strong>{provider}</strong></article><article><span>가입일</span><strong>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" }).format(new Date(user.created_at))}</strong></article></div><div className="account-actions"><div className="account-main-actions"><a className="account-primary-link" href="/">내 이름표 보기</a><AccountSignOutButton /></div><AccountDeleteButton /></div></section></main>;
}

export const AccountPage = () => <Protected>{user => <AccountContent user={user} />}</Protected>;
export const OngijonggiRoute = () => <Protected>{() => <OngijonggiPage />}</Protected>;
export const CommunityWriteRoute = () => <Protected loading={<CommunityWriteSkeleton />}>{() => <CommunityWritePage />}</Protected>;

export function AuthCallbackPage() {
  useEffect(() => { createBrowserSupabaseClient().auth.getSession().finally(() => location.replace("/")); }, []);
  return <RouteSkeleton label="로그인을 처리하고 있어요" />;
}

export function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    if (password.length < 6) return setMessage("비밀번호는 6자 이상 입력해 주세요.");
    if (password !== confirmPassword) return setMessage("비밀번호가 서로 일치하지 않아요.");
    setLoading(true); setMessage("");
    const { error } = await updatePassword(password);
    if (error) { setMessage("재설정 링크가 만료되었어요. 비밀번호 찾기를 다시 진행해 주세요."); setLoading(false); return; }
    location.replace("/");
  }

  return <main className="login-page"><section className="login-card temp-login-card reset-password-card"><div className="login-intro"><a className="login-brand" href="/"><img src="/mynameis-logo.png" alt="mynameis" width="170" /></a><h1>새 비밀번호 설정</h1><p>앞으로 사용할 비밀번호를 입력해 주세요.</p></div><form className="email-login-form" onSubmit={submit}><label htmlFor="new-password">새 비밀번호</label><input id="new-password" name="password" type="password" autoComplete="new-password" minLength={6} required /><label htmlFor="confirm-password">비밀번호 확인</label><input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={6} required /><button className="email-login-submit" disabled={loading}>{loading ? "변경 중..." : "비밀번호 변경"}</button></form>{message && <p className="login-message" role="alert">{message}</p>}</section></main>;
}
