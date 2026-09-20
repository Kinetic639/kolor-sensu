import { getPortalAuthorization } from "@repo/supabase";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

const requiredRole = "specialist" as const;

export async function getCurrentPortalAuthorization() {
  const client = await createClient();
  return getPortalAuthorization(client, requiredRole);
}

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
