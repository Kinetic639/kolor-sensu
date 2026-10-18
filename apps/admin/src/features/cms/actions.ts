"use server";

import { requirePortalRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/use-save";
import {
  crisisHelpContentSchema,
  homeLocationContentSchema,
  newsletterBandContentSchema,
  whyUsContentSchema,
  type CrisisHelpContent,
  type HomeLocationContent,
  type NewsletterBandContent,
  type WhyUsContent,
  firstStepsContentSchema,
  HOME_HEADER_SECTIONS,
  homePageContentSchema,
  sectionHeaderSchema,
  homeSectionsContentSchema,
  roomsPageContentSchema,
  supportAreasContentSchema,
  type FirstStepsContent,
  type HomeHeaderSection,
  type HomePageContent,
  type SectionHeaderContent,
  type HomeSectionsContent,
  type RoomsPageContent,
  type SupportAreasContent,
} from "@repo/contracts";
import { revalidateWeb } from "@repo/app-runtime/revalidate-web";
import {
  publishCrisisHelp,
  publishHomeLocation,
  publishNewsletterBand,
  publishWhyUs,
  updateCrisisHelpDraft,
  updateHomeLocationDraft,
  updateNewsletterBandDraft,
  updateWhyUsDraft,
  getHomeHeadersAdmin,
  publishFirstSteps,
  publishHomeContent,
  publishHomeHeaders,
  publishHomeSections,
  publishRoomsPageContent,
  publishSupportAreas,
  updateFirstStepsDraft,
  updateHomeDraft,
  updateHomeHeadersDraft,
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

export async function updateFirstStepsDraftAction(values: FirstStepsContent) {
  return saveDraft(firstStepsContentSchema, values, updateFirstStepsDraft);
}

export async function updateWhyUsDraftAction(values: WhyUsContent) {
  return saveDraft(whyUsContentSchema, values, updateWhyUsDraft);
}

export async function updateNewsletterBandDraftAction(
  values: NewsletterBandContent,
) {
  return saveDraft(
    newsletterBandContentSchema,
    values,
    updateNewsletterBandDraft,
  );
}

export async function updateHomeLocationDraftAction(
  values: HomeLocationContent,
) {
  return saveDraft(homeLocationContentSchema, values, updateHomeLocationDraft);
}

export async function updateCrisisHelpDraftAction(values: CrisisHelpContent) {
  return saveDraft(crisisHelpContentSchema, values, updateCrisisHelpDraft);
}

/**
 * One section's header into the draft of the homepage's headers (the
 * others as they are in it).
 */
export async function updateHomeHeaderDraftAction(
  section: HomeHeaderSection,
  values: SectionHeaderContent,
): Promise<ActionResult> {
  if (!HOME_HEADER_SECTIONS.some((one) => one.key === section))
    return { ok: false, message: "Nieznana sekcja." };
  return saveDraft(sectionHeaderSchema, values, async (client, header) => {
    const { draft } = await getHomeHeadersAdmin(client);
    await updateHomeHeadersDraft(client, { ...draft, [section]: header });
  });
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

/**
 * The homepage: the hero, the areas of help, "Dlaczego my", the first
 * steps, the specialist sections, the newsletter band, the crisis strip,
 * "Gdzie jesteśmy" and the sections' headers.
 */
export async function publishHomePageAction() {
  return publishPage(
    [
      publishHomeContent,
      publishSupportAreas,
      publishWhyUs,
      publishFirstSteps,
      publishHomeSections,
      publishNewsletterBand,
      publishCrisisHelp,
      publishHomeLocation,
      publishHomeHeaders,
    ],
    "/",
  );
}

export async function publishRoomsPageAction() {
  return publishPage([publishRoomsPageContent], "/gabinety");
}
