import { useEffect, useState } from "preact/hooks";
import type { ComponentChildren } from "preact";
import type { User } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { RouteSkeleton } from "@/src/components/route-skeleton";

export function Protected({ children }: { children: (user: User) => ComponentChildren }) {
  const [user, setUser] = useState<User | null | undefined>();
  useEffect(() => { createBrowserSupabaseClient().auth.getUser().then(({ data }) => {
    if (!data.user) location.replace("/login");
    setUser(data.user);
  }); }, []);
  if (!user) return <RouteSkeleton />;
  return <>{children(user)}</>;
}
