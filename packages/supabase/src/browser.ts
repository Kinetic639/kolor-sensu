import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@repo/contracts/database";
import type { PublicSupabaseEnv } from "./env.js";

export function createSupabaseBrowserClient(environment: PublicSupabaseEnv) {
  return createBrowserClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
