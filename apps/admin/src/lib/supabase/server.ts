import { createSupabaseServerClient } from "@repo/supabase/server";
import { cookies } from "next/headers";
import { getPublicSupabaseEnvironment } from "./environment";

export async function createClient() {
  const cookieStore = await cookies();

  return createSupabaseServerClient(getPublicSupabaseEnvironment(), {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, options, value }) =>
          cookieStore.set(name, value, options),
        );
      } catch {
        // Server Components cannot write cookies. The proxy refreshes them.
      }
    },
  });
}
