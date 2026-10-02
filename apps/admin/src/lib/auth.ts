import { getPortalAuthorization } from "@repo/supabase";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "./supabase/server";

const requiredRole = "admin" as const;

/** Who is signed in and may they use this portal: asked once a request. */
export const getCurrentPortalAuthorization = cache(async () => {
  const client = await createClient();
  return getPortalAuthorization(client, requiredRole);
});

export async function requirePortalRole() {
  const authorization = await getCurrentPortalAuthorization();

  if (authorization.status === "unauthenticated") {
    redirect("/login");
  }

  if (authorization.status === "forbidden") {
    redirect("/access-denied");
  }

  return authorization;
}
