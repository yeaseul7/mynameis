import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getDogPublicLinkByToken } from "@/lib/pets/repository";

const MAX_MESSAGE_LENGTH = 180;

function cleanText(value: unknown, maxLength: number) {
  return String(value ?? "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function getMaskedEmailName(email: string | undefined) {
  const firstLetter = email?.trim().charAt(0);
  return firstLetter ? `${firstLetter}****` : "익****";
}

function mapEntries(entries: Array<{ id: string; author_name: string; message: string; created_at: string; author_id?: string | null }>, userId?: string) {
  return entries.map(({ author_id, ...entry }) => ({
    ...entry,
    is_mine: Boolean(userId && author_id === userId),
  }));
}

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const supabase = await createServerSupabaseClient();
  const publicLink = await getDogPublicLinkByToken(supabase, slug);
  if (!publicLink) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("dog_guestbook_entries")
    .select("id,author_name,message,created_at,author_id")
    .eq("dog_id", publicLink.dogId)
    .is("hidden_at", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ message: "방명록을 불러오지 못했어요." }, { status: 500 });
  return NextResponse.json({ entries: mapEntries(data ?? [], user?.id) });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "로그인 후 방명록을 남길 수 있어요." }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const authorName = getMaskedEmailName(user.email);
  const message = cleanText(body.message, MAX_MESSAGE_LENGTH);

  if (!message) return NextResponse.json({ message: "메시지를 입력해 주세요." }, { status: 400 });

  const supabase = await createServerSupabaseClient();
  const publicLink = await getDogPublicLinkByToken(supabase, slug);
  if (!publicLink) return NextResponse.json({ message: "Not found" }, { status: 404 });

  const { data, error } = await supabase
    .from("dog_guestbook_entries")
    .insert({
      dog_id: publicLink.dogId,
      public_link_token: slug,
      author_id: user.id,
      author_name: authorName,
      message,
    })
    .select("id,author_name,message,created_at")
    .single();

  if (error || !data) return NextResponse.json({ message: "방명록을 남기지 못했어요." }, { status: 500 });
  return NextResponse.json({ entry: { ...data, is_mine: true } }, { status: 201 });
}
