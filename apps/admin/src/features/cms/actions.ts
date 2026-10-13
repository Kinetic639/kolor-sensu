"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type {
  HomePageContent,
  HomeSectionsContent,
  RoomsPageContent,
  SupportAreasContent,
} from "@repo/contracts";
import { revalidateWeb } from "@repo/app-runtime/revalidate-web";
import {
  publishHomeContent,
  publishHomeSections,
  publishRoomsPageContent,
  publishSupportAreas,
  updateHomeDraft,
  updateHomeSectionsDraft,
  updateRoomsPageDraft,
  updateSupportAreasDraft,
} from "@repo/supabase";
import { revalidatePath } from "next/cache";
import {
  loadHomeContent,
  loadHomeSections,
  loadRoomsPageContent,
  loadSupportAreas,
} from "./loaders";

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

export async function getRoomsPageContentAction() {
  await requirePortalRole();
  return loadRoomsPageContent();
}

export async function updateRoomsPageDraftAction(input: RoomsPageContent) {
  await requirePortalRole();
  await updateRoomsPageDraft(await createClient(), input);
  revalidatePath("/cms");
  return loadRoomsPageContent();
}

export async function publishRoomsPageContentAction() {
  await requirePortalRole();
  await publishRoomsPageContent(await createClient());
  await revalidateWeb([{ path: "/gabinety" }]);
  revalidatePath("/cms");
  return loadRoomsPageContent();
}

export async function getSupportAreasAction() {
  await requirePortalRole();
  return loadSupportAreas();
}

export async function updateSupportAreasDraftAction(
  input: SupportAreasContent,
) {
  await requirePortalRole();
  await updateSupportAreasDraft(await createClient(), input);
  revalidatePath("/cms");
  return loadSupportAreas();
}

export async function publishSupportAreasAction() {
  await requirePortalRole();
  await publishSupportAreas(await createClient());
  await revalidateWeb([{ path: "/" }]);
  revalidatePath("/cms");
  return loadSupportAreas();
}

export async function getHomeSectionsAction() {
  await requirePortalRole();
  return loadHomeSections();
}

export async function updateHomeSectionsDraftAction(
  input: HomeSectionsContent,
) {
  await requirePortalRole();
  await updateHomeSectionsDraft(await createClient(), input);
  revalidatePath("/cms");
  return loadHomeSections();
}

export async function publishHomeSectionsAction() {
  await requirePortalRole();
  await publishHomeSections(await createClient());
  await revalidateWeb([{ path: "/" }]);
  revalidatePath("/cms");
  return loadHomeSections();
}
