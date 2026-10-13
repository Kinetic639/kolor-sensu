"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/use-save";
import {
  homePageContentSchema,
  homeSectionsContentSchema,
  roomsPageContentSchema,
  supportAreasContentSchema,
  type HomePageContent,
  type HomeSectionsContent,
  type RoomsPageContent,
  type SupportAreasContent,
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
import type { z } from "zod";

// The CMS's saves, page by page: each section saves its own draft; a
// page is published whole ("Publikuj stronę"), every section of it at
// once, and the site refreshes that page.

type Client = Awaited<ReturnType<typeof createClient>>;

function failure(error: unknown, fallback: string): ActionResult {
  if (typeof error === "object" && error && "code" in error) {
    if (error.code === "42501")
      return { ok: false, message: "Brak uprawnień do tej zmiany." };
  }
  return { ok: false, message: fallback };
}

async function saveDraft<Content>(
  schema: z.ZodType<Content>,
  values: unknown,
  save: (client: Client, content: Content) => Promise<unknown>,
): Promise<ActionResult> {
  await requirePortalRole();
  const parsed = schema.safeParse(values);
  if (!parsed.success)
    return { ok: false, message: "Sprawdź zaznaczone pola." };
  try {
    await save(await createClient(), parsed.data);
    revalidatePath("/cms");
    return { ok: true };
  } catch (error) {
    return failure(error, "Nie udało się zapisać szkicu.");
  }
}

export async function updateHomeDraftAction(values: HomePageContent) {
  return saveDraft(homePageContentSchema, values, updateHomeDraft);
}

export async function updateSupportAreasDraftAction(
  values: SupportAreasContent,
) {
  return saveDraft(supportAreasContentSchema, values, updateSupportAreasDraft);
}

export async function updateHomeSectionsDraftAction(
  values: HomeSectionsContent,
) {
  return saveDraft(homeSectionsContentSchema, values, updateHomeSectionsDraft);
}

export async function updateRoomsPageDraftAction(values: RoomsPageContent) {
  return saveDraft(roomsPageContentSchema, values, updateRoomsPageDraft);
}

async function publishPage(
  publish: readonly ((client: Client) => Promise<void>)[],
  path: string,
): Promise<ActionResult> {
  await requirePortalRole();
  try {
    const client = await createClient();
    for (const section of publish) await section(client);
    await revalidateWeb([{ path }]);
    revalidatePath("/cms");
    return { ok: true };
  } catch (error) {
    return failure(error, "Publikacja się nie powiodła.");
  }
}

/** The homepage: the hero, the areas of help and the specialist sections. */
export async function publishHomePageAction() {
  return publishPage(
    [publishHomeContent, publishSupportAreas, publishHomeSections],
    "/",
  );
}

export async function publishRoomsPageAction() {
  return publishPage([publishRoomsPageContent], "/gabinety");
}
