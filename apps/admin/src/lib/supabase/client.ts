"use client";

import { createSupabaseBrowserClient } from "@repo/supabase/browser";
import { getPublicSupabaseEnvironment } from "./environment";

let browserClient: ReturnType<typeof createSupabaseBrowserClient> | undefined;

export function createClient() {
  browserClient ??= createSupabaseBrowserClient(getPublicSupabaseEnvironment());
  return browserClient;
}
