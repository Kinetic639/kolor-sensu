import { createServerClient } from "@supabase/ssr";
import type { Database } from "@repo/contracts/database";
import type { PublicSupabaseEnv } from "./env.js";

type ServerCookieMethods = NonNullable<
  NonNullable<Parameters<typeof createServerClient>[2]>["cookies"]
>;

export function createSupabaseServerClient(
  environment: PublicSupabaseEnv,
  cookies: ServerCookieMethods,
) {
  return createServerClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { cookies },
  );
}
