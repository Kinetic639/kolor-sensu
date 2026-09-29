import { parseSecretSupabaseEnv } from "@repo/supabase";
import { createSupabaseSecretClient } from "@repo/supabase/secret";
import { getPublicSupabaseEnvironment } from "./environment";

// The service-role client: only for Server Actions and server pages that
// hold visit times or read a guest's visit by token. Its key never has the
// NEXT_PUBLIC_ prefix, so it cannot reach the browser bundle.
export function createSecretClient() {
  return createSupabaseSecretClient({
    ...getPublicSupabaseEnvironment(),
    ...parseSecretSupabaseEnv({
      SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
    }),
  });
}
