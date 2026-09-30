import type { Database } from "@repo/contracts/database";
import { createClient } from "@supabase/supabase-js";
import type { PublicSupabaseEnv } from "./env";

/**
 * A client without a session. With an access token it acts as that user
 * (for a request from another portal), still under the database's rules.
 */
export function createSupabasePublicClient(
  environment: PublicSupabaseEnv,
  accessToken?: string,
) {
  return createClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      ...(accessToken
        ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
        : {}),
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}
