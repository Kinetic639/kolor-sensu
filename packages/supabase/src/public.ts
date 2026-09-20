import type { Database } from "@repo/contracts/database";
import { createClient } from "@supabase/supabase-js";
import type { PublicSupabaseEnv } from "./env";

export function createSupabasePublicClient(environment: PublicSupabaseEnv) {
  return createClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}
