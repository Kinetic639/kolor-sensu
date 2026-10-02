import "server-only";
import { createSupabasePublicClient } from "@repo/supabase/public";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { getPublicSupabaseEnvironment } from "./supabase/environment";
import { createClient } from "./supabase/server";

// Data the portal reads on nearly every click but that changes rarely (the
// centre's booking window, the specialist's services and rooms), kept
// between requests. Each person has their own copy, read with their own token,
// under the database's rules (no secret key); the copy is keyed by who
// they are as their verified token says. It is dropped when the portal
// changes the data (updateTag in the actions) and after five minutes
// anyway (the centre may change them in its portal).

export const CACHE_TAGS = {
  centre: "centrum",
  services: "uslugi",
  rooms: "gabinety",
} as const;

const KEEP_SECONDS = 5 * 60;

type Db = ReturnType<typeof createSupabasePublicClient>;

/** Who asks (verified) and their token, once a request. */
const caller = cache(async () => {
  const client = await createClient();
  const [{ data: claims }, { data: session }] = await Promise.all([
    client.auth.getClaims(),
    client.auth.getSession(),
  ]);
  const userId = claims?.claims.sub;
  const token = session.session?.access_token;
  return userId && token ? { userId, token } : null;
});

/**
 * `load` as this person, kept for five minutes under `key` and dropped by
 * `tags`. Without a session it just loads (the page then sends them to
 * log in).
 */
export async function cachedForCaller<T>(
  key: string,
  tags: string[],
  load: (client: Db) => Promise<T>,
): Promise<T> {
  const who = await caller();
  if (!who) return load((await createClient()) as unknown as Db);
  const environment = getPublicSupabaseEnvironment();
  return unstable_cache(
    () => load(createSupabasePublicClient(environment, who.token)),
    ["specialist", key, who.userId],
    { tags, revalidate: KEEP_SECONDS },
  )();
}
