import "server-only";

import { createClient } from "@/lib/supabase/server";
import { getHomeContentAdmin } from "@repo/supabase";
import { mapHomeContentViewModel } from "./view-model";

export async function loadHomeContent() {
  const client = await createClient();
  return mapHomeContentViewModel(await getHomeContentAdmin(client));
}
