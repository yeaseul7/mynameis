"use client";

import type { Provider } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export type LoginProvider = Extract<Provider, "kakao" | "google">;

function getAuthClient() {
  try {
    return { supabase: createBrowserSupabaseClient(), error: null };
  } catch {
    return {
      supabase: null,
      error: new Error("Supabase 설정이 없어 로그인을 시작할 수 없어요. .env.local을 확인해 주세요."),
    };
  }
}

export async function signInWithProvider(provider: LoginProvider) {
  const { supabase, error } = getAuthClient();
  if (error) return { data: { provider: null, url: null }, error };

  return supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${location.origin}/auth/callback` },
  });
}

export async function signInWithEmail(email: string, password: string) {
  const { supabase, error } = getAuthClient();
  if (error) return { data: { user: null, session: null }, error };

  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUpWithEmail(email: string, password: string) {
  const { supabase, error } = getAuthClient();
  if (error) return { data: { user: null, session: null }, error };

  return supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${location.origin}/auth/callback` },
  });
}

export async function sendPasswordResetEmail(email: string) {
  const { supabase, error } = getAuthClient();
  if (error) return { data: {}, error };

  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${location.origin}/reset-password`,
  });
}

export async function updatePassword(password: string) {
  const { supabase, error } = getAuthClient();
  if (error) return { data: { user: null }, error };

  return supabase.auth.updateUser({ password });
}

export async function updateNickname(name: string) {
  const { supabase, error } = getAuthClient();
  if (error) return { data: { user: null }, error };

  return supabase.auth.updateUser({ data: { name } });
}

export async function signOut() {
  const { supabase, error } = getAuthClient();
  if (error) return { error };

  return supabase.auth.signOut();
}
