import { useEffect, useState } from "preact/hooks";
import { SocialLoginPanel } from "@/components/social-login-panel";
import { PetRegistrationForm } from "@/components/pet-registration-form";
import { PetEditForm } from "@/components/pet-edit-form";
import { FriendInviteForm } from "@/components/friend-invite-form";
import { AccountDeleteButton, AccountSignOutButton } from "@/components/account-sign-out-button";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { getDogForOwner } from "@/lib/pets/service";
import { Protected } from "./protected";
import type { DogProfile } from "@/lib/pets/types";
import { RouteSkeleton } from "@/src/components/route-skeleton";

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

export const AccountPage = () => <Protected>{user => {
  const name = user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "보호자";
  const provider = user.app_metadata?.provider ?? "확인 중";
  return <main className="account-page"><section className="account-panel"><div className="account-hero"><div className="account-avatar">{name.slice(0, 1).toUpperCase()}</div><div><p className="account-kicker">계정관리</p><h1>{name}님</h1><p>이름표와 공유 링크를 관리하는 보호자 계정이에요.</p></div></div><div className="account-info-grid"><article><span>이메일</span><strong>{user.email ?? "등록된 이메일 없음"}</strong></article><article><span>로그인 방식</span><strong>{provider}</strong></article><article><span>가입일</span><strong>{new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" }).format(new Date(user.created_at))}</strong></article></div><div className="account-actions"><div className="account-main-actions"><a className="account-primary-link" href="/">내 이름표 보기</a><AccountSignOutButton /></div><AccountDeleteButton /></div></section></main>;
}}</Protected>;

export function AuthCallbackPage() {
  useEffect(() => { createBrowserSupabaseClient().auth.getSession().finally(() => location.replace("/")); }, []);
  return <RouteSkeleton label="로그인을 처리하고 있어요" />;
}
