import { useEffect, useState } from "preact/hooks";
import type { User } from "@supabase/supabase-js";
import { GuestHome } from "@/app/page";
import { LoggedHome } from "@/components/logged-home";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

export function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);
  if (!user) return <GuestHome />;
  const userName = user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "보호자";
  return <LoggedHome userId={user.id} userName={userName} />;
}
