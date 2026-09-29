import type { Database } from "@repo/contracts/database";
import { createClient } from "@supabase/supabase-js";
import type { PublicSupabaseEnv, SecretSupabaseEnv } from "./env";

// The service-role client, for a server's trusted operations (holding a
// visit time, a guest's visit by token). Never import it into code that
// reaches a browser: the key bypasses row level security.

export function createSupabaseSecretClient(
  environment: Pick<PublicSupabaseEnv, "NEXT_PUBLIC_SUPABASE_URL"> &
    SecretSupabaseEnv,
) {
  return createClient<Database>(
    environment.NEXT_PUBLIC_SUPABASE_URL,
    environment.SUPABASE_SECRET_KEY,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}
