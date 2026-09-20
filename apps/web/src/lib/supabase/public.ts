import { createSupabasePublicClient } from "@repo/supabase/public";
import { getPublicSupabaseEnvironment } from "./environment";

export function createPublicClient() {
  return createSupabasePublicClient(getPublicSupabaseEnvironment());
}
