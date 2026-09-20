"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { HomePageContent } from "@repo/contracts";
import { publishHomeContent, updateHomeDraft } from "@repo/supabase";
import { revalidatePath } from "next/cache";
import { loadHomeContent } from "./loaders";

async function revalidatePublicHome() {
  const webUrl = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";
  const secret = process.env.CMS_REVALIDATE_SECRET;

  if (!secret) {
    throw new Error("CMS_REVALIDATE_SECRET is not configured");
  }

  const response = await fetch(new URL("/api/revalidate", webUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify({ path: "/" }),
  });

  if (!response.ok) {
    throw new Error("Failed to revalidate the public home page");
  }
}

export async function getHomeContentAction() {
  await requirePortalRole();
  return loadHomeContent();
}

export async function updateHomeDraftAction(input: HomePageContent) {
  await requirePortalRole();
  const client = await createClient();
  await updateHomeDraft(client, input);
  revalidatePath("/cms");
  return loadHomeContent();
}

export async function publishHomeContentAction() {
  await requirePortalRole();
  const client = await createClient();
  await publishHomeContent(client);
  await revalidatePublicHome();
  revalidatePath("/cms");
  return loadHomeContent();
}
