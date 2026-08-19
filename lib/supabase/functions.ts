import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type FunctionErrorContext = { json: () => Promise<unknown> };

export async function invokeFunction<T>(name: string, body?: Record<string, unknown>): Promise<T> {
  const { data, error } = await createBrowserSupabaseClient().functions.invoke(name, { body: body ?? {} });
  if (!error) return data as T;

  let message = error.message;
  const context = (error as { context?: FunctionErrorContext }).context;
  if (context) {
    const payload = await context.json().catch(() => null) as { message?: string; error?: string } | null;
    message = payload?.message ?? payload?.error ?? message;
  }
  throw new Error(message);
}
